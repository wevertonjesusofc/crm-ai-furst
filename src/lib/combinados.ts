import { SupabaseClient } from "@supabase/supabase-js";
import { segredo, lerIntegracao } from "@/lib/integracoes/servidor";
import { tg } from "@/lib/telegram";

// Combinados com o paciente: "me chama dia 17", "volto de viagem semana que vem".
// 1) A IA acha o combinado na conversa e grava com a data.
// 2) No dia seguinte, às 7h, se ninguém do time falou com o paciente, o Gerente
//    avisa o gestor no Telegram com o trecho da conversa e os botões Sim/Não.
// 3) Sim: cria a tarefa para o responsável e avisa a pessoa (se ela tiver Telegram).

const SINAIS = /\b(dia \d{1,2}|semana que vem|pr[oó]xima semana|m[eê]s que vem|depois d[oa]|volto|viagem|me (chama|liga|procura)|entra em contato|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|amanh[aã]|daqui a)\b/i;

export function temSinalDeCombinado(texto: string) {
  return SINAIS.test(texto);
}

const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); // horário de Brasília

/** Lê a conversa e grava o combinado (se houver). */
export async function detectarCombinado(db: SupabaseClient, clinicaId: string, contactId: string) {
  const chave = await segredo(clinicaId, "ia", "anthropic_api_key");
  if (!chave) return null;
  const { data: convs } = await db.from("conversas").select("id").eq("clinica_id", clinicaId).eq("contact_id", contactId);
  const ids = (convs ?? []).map((c) => c.id);
  if (!ids.length) return null;
  const { data: msgs } = await db.from("mensagens").select("direction, body, created_at").in("conversa_id", ids).order("created_at", { ascending: false }).limit(20);
  const conversa = ((msgs ?? []) as { direction: string; body: string; created_at: string }[])
    .reverse()
    .map((m) => `[${m.created_at.slice(0, 10)}] ${m.direction === "recebida" ? "Paciente" : "Clínica"}: ${m.body}`)
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 300,
      system:
        `Hoje é ${hojeISO()}. Você lê conversas de clínica e acha COMBINADOS: quando o paciente pede para a clínica voltar a falar em uma data ("me chama dia 17", "volto de viagem semana que vem"). ` +
        'Responda SÓ JSON: {"tem": boolean, "data": "AAAA-MM-DD" ou null, "o_que": "frase curta", "trecho": "a frase exata do paciente"}. Sem combinado claro, tem=false.',
      messages: [{ role: "user", content: conversa.slice(-5000) }],
    }),
  });
  if (!resp.ok) return null;
  const d = (await resp.json()) as { content: { type: string; text?: string }[] };
  const t = d.content.find((b) => b.type === "text")?.text ?? "";
  let r: { tem: boolean; data: string | null; o_que: string; trecho: string };
  try {
    r = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  if (!r.tem || !r.data) return null;
  const { data: existe } = await db.from("combinados").select("id").eq("clinica_id", clinicaId).eq("contact_id", contactId).eq("combinado_para", r.data).maybeSingle();
  if (existe) return existe;
  const { data } = await db
    .from("combinados")
    .insert({ clinica_id: clinicaId, contact_id: contactId, conversa_id: ids[0], combinado_para: r.data, o_que: r.o_que, trecho: r.trecho })
    .select("id")
    .single();
  return data;
}

type Atrasado = { id: string; combinado_para: string; o_que: string; trecho: string | null; contact_id: string; responsavel_id: string | null; contato: string; responsavel: string };

/** Combinados vencidos sem contato da clínica depois da data. */
export async function combinadosAtrasados(db: SupabaseClient, clinicaId: string): Promise<Atrasado[]> {
  const { data } = await db
    .from("combinados")
    .select("id, combinado_para, o_que, trecho, contact_id, conversa_id, responsavel_id, status, contacts(name), agentes(nome)")
    .eq("clinica_id", clinicaId)
    .in("status", ["pendente", "atrasado"])
    .lt("combinado_para", hojeISO());
  const out: Atrasado[] = [];
  for (const c of (data ?? []) as unknown as (Atrasado & { conversa_id: string | null; status: string; contacts: { name: string } | null; agentes: { nome: string } | null })[]) {
    const { data: convs } = await db.from("conversas").select("id").eq("contact_id", c.contact_id);
    const ids = (convs ?? []).map((x) => x.id);
    const { count } = ids.length
      ? await db.from("mensagens").select("id", { count: "exact", head: true }).in("conversa_id", ids).eq("direction", "enviada").gte("created_at", c.combinado_para)
      : { count: 0 };
    if (count) {
      await db.from("combinados").update({ status: "cumprido" }).eq("id", c.id);
      continue;
    }
    out.push({ ...c, contato: c.contacts?.name ?? "Paciente", responsavel: c.agentes?.nome ?? "o time" });
  }
  return out;
}

/** Rotina das 7h: avisa os gestores no Telegram com o print e os botões. */
export async function avisarAtrasados(db: SupabaseClient, clinicaId: string) {
  const atrasados = (await combinadosAtrasados(db, clinicaId)).filter((a) => a);
  const cfg = await lerIntegracao(db, clinicaId, "telegram");
  if (!cfg.bot_token || !atrasados.length) return { avisos: 0, atrasados: atrasados.length };
  const bot = tg(cfg.bot_token);
  const { data: gestores } = await db.from("canais_autorizados").select("externo_id, nome").eq("clinica_id", clinicaId).eq("canal", "telegram").eq("ativo", true).in("papel", ["dono", "gestor"]);
  let avisos = 0;
  for (const a of atrasados) {
    const { data: ja } = await db.from("combinados").select("avisado_em").eq("id", a.id).maybeSingle();
    if (ja?.avisado_em) continue;
    const dia = new Date(a.combinado_para + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    for (const g of gestores ?? []) {
      const texto =
        `Bom dia${g.nome ? `, ${g.nome.split(" ")[0]}` : ""}! ${a.responsavel} não entrou em contato com ${a.contato}.\n\n` +
        `Combinado para ${dia}: ${a.o_que}\n` +
        (a.trecho ? `\n💬 ${a.contato} disse: "${a.trecho}"\n` : "") +
        `\nQuer que eu crie uma tarefa e mande para ${a.responsavel} entrar em contato agora?`;
      await bot.chamar("sendMessage", {
        chat_id: g.externo_id,
        text: texto,
        reply_markup: { inline_keyboard: [[{ text: "Sim, cobrar agora", callback_data: `cobrar:${a.id}` }, { text: "Não", callback_data: `ignorar:${a.id}` }]] },
      });
      avisos++;
    }
    await db.from("combinados").update({ status: "atrasado", avisado_em: new Date().toISOString() }).eq("id", a.id);
  }
  return { avisos, atrasados: atrasados.length };
}

/** Resposta do gestor ao botão: cria a tarefa e avisa o responsável. */
export async function responderCobranca(db: SupabaseClient, clinicaId: string, acao: "cobrar" | "ignorar", combinadoId: string) {
  const { data: c } = await db
    .from("combinados")
    .select("id, o_que, trecho, combinado_para, contact_id, responsavel_id, contacts(name), agentes(nome)")
    .eq("id", combinadoId)
    .eq("clinica_id", clinicaId)
    .maybeSingle();
  if (!c) return "Não achei esse combinado.";
  const contato = (c.contacts as unknown as { name: string } | null)?.name ?? "o paciente";
  const resp = (c.agentes as unknown as { nome: string } | null)?.nome ?? "o time";
  if (acao === "ignorar") {
    await db.from("combinados").update({ status: "ignorado" }).eq("id", c.id);
    return "Beleza, não vou cobrar.";
  }
  await db.from("tasks").insert({
    clinica_id: clinicaId,
    contact_id: c.contact_id,
    title: `Retomar contato com ${contato}: ${c.o_que}`,
    due_date: hojeISO(),
    done: false,
    responsavel_id: c.responsavel_id,
    combinado_id: c.id,
  });
  await db.from("combinados").update({ status: "cobrado" }).eq("id", c.id);

  // Avisa a pessoa responsável, se ela tiver o Telegram ligado.
  const cfg = await lerIntegracao(db, clinicaId, "telegram");
  const { data: pessoa } = c.responsavel_id
    ? await db.from("canais_autorizados").select("externo_id").eq("clinica_id", clinicaId).eq("canal", "telegram").eq("agente_id", c.responsavel_id).maybeSingle()
    : { data: null };
  if (cfg.bot_token && pessoa) {
    const dia = new Date(c.combinado_para + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    await tg(cfg.bot_token).enviar(
      pessoa.externo_id,
      `Oi, ${resp.split(" ")[0]}! ${contato} pediu contato em ${dia} e ninguém chamou ainda.\n` + (c.trecho ? `\n💬 "${c.trecho}"\n` : "") + `\nPode falar com ${contato} agora? Já deixei a tarefa no sistema.`
    );
    return `Feito ✅ Criei a tarefa e mandei para ${resp} no Telegram.`;
  }
  return `Feito ✅ Criei a tarefa para ${resp}. ${resp} ainda não tem o Telegram ligado, então avise por lá ou peça para mandar /start CÓDIGO pro bot.`;
}
