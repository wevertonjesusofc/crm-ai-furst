import { SupabaseClient } from "@supabase/supabase-js";
import { segredo } from "@/lib/integracoes/servidor";
import { zernio } from "@/lib/zernio";

// "Comenta & Recebe": o post pede "comente PROMPT", a pessoa comenta e
// recebe na hora: resposta no comentário ("te mandei no direct 😉") e a
// mensagem no direct com o botão (agendar a call, receber o material…).
// A automação roda na Zernio (oficial da Meta); aqui a gente cria, liga,
// pausa e acompanha os números.

type Api = ReturnType<typeof zernio>;

// "comente PROMPT", "comenta a palavra LAURA", "digite EU QUERO", "escreva AGENDA"
const CTA = /\b(?:coment[ea]|digit[ea]|escrev[ea]|mand[ea])\s+(?:a\s+palavra\s+|aqui\s+)?["“'«]?([A-Za-zÀ-ÿ0-9]{2,20})["”'»]?/i;
const IGNORAR = new Set(["aqui", "abaixo", "embaixo", "isso", "sim", "que", "o", "a", "um", "uma", "no", "na", "seu", "sua"]);

export function extrairPalavra(legenda: string | null): string | null {
  if (!legenda) return null;
  const m = legenda.match(CTA);
  if (!m) return null;
  const p = m[1].trim();
  if (IGNORAR.has(p.toLowerCase())) return null;
  // A palavra do gatilho vem em MAIÚSCULA na legenda ("Comenta BLINDAR").
  // Isso evita pegar "manda pro teu sócio" ou "comenta aí".
  if (p !== p.toUpperCase()) return null;
  return p.toUpperCase();
}

async function textosComIA(clinicaId: string, legenda: string, palavra: string) {
  const chave = await segredo(clinicaId, "ia", "anthropic_api_key");
  const padrao = {
    resposta_publica: "Te mandei no direct 😉",
    mensagem_direct: `Oi, {{first_name}}! Vi que você comentou ${palavra}. Que bom ter você por aqui! Me conta: o que mais te chamou atenção nesse conteúdo?`,
    objetivo: "conversa",
  };
  if (!chave) return padrao;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 500,
      system:
        "Você escreve a automação de Instagram 'comentou a palavra, recebe no direct'. A partir da legenda do post, escreva: " +
        "1) resposta_publica: curtinha para responder no comentário (ex.: 'Te mandei no direct 😉'); " +
        "2) mensagem_direct: primeira mensagem do direct, leve, até 600 caracteres, use {{first_name}}, entregue o que o post prometeu e termine com uma pergunta ou convite (ex.: horário para uma call de 15 minutos); " +
        "3) objetivo: call | material | formulario | conversa. Sem prometer resultado de tratamento. " +
        'Responda SÓ JSON: {"resposta_publica": "...", "mensagem_direct": "...", "objetivo": "..."}',
      messages: [{ role: "user", content: `Palavra: ${palavra}\nLegenda:\n${legenda.slice(0, 2500)}` }],
    }),
  });
  if (!resp.ok) return padrao;
  const d = (await resp.json()) as { content: { type: string; text?: string }[] };
  const t = d.content.find((b) => b.type === "text")?.text ?? "";
  try {
    return { ...padrao, ...JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) };
  } catch {
    return padrao;
  }
}

/** Procura nos posts recentes o "comente PALAVRA" e cria os rascunhos. */
export async function detectarGatilhos(db: SupabaseClient, clinicaId: string, dias = 60) {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const { data: posts } = await db
    .from("redes_posts")
    .select("id, externo_id, url, legenda, plataforma")
    .eq("clinica_id", clinicaId)
    .eq("plataforma", "instagram")
    .gte("publicado_em", desde)
    .order("publicado_em", { ascending: false })
    .limit(300);
  let novos = 0;
  for (const p of posts ?? []) {
    const palavra = extrairPalavra(p.legenda);
    if (!palavra) continue;
    const { data: ja } = await db.from("gatilhos").select("id").eq("clinica_id", clinicaId).eq("platform_post_id", p.externo_id).eq("palavra", palavra).maybeSingle();
    if (ja) continue;
    const t = await textosComIA(clinicaId, p.legenda ?? "", palavra);
    await db.from("gatilhos").insert({
      clinica_id: clinicaId,
      post_id: p.id,
      platform_post_id: p.externo_id,
      post_url: p.url,
      legenda: p.legenda,
      palavra,
      objetivo: ["call", "material", "formulario", "conversa"].includes(t.objetivo) ? t.objetivo : "conversa",
      resposta_publica: t.resposta_publica,
      mensagem_direct: t.mensagem_direct,
      criado_automatico: true,
    });
    novos++;
  }
  return { postsLidos: posts?.length ?? 0, novos };
}

async function contaInstagram(api: Api) {
  const conta = (await api.contas()).accounts.find((a) => a.platform === "instagram" && a.isActive);
  if (!conta) throw new Error("Nenhum Instagram ativo na Zernio.");
  const perfil = (conta as unknown as { profileId?: string | { _id?: string } }).profileId;
  const profileId = typeof perfil === "string" ? perfil : perfil?._id;
  if (!profileId) throw new Error("Não achei o perfil da conta na Zernio.");
  return { accountId: conta._id, profileId };
}

/** Liga a automação na Zernio (cria na primeira vez). */
export async function ativarGatilho(db: SupabaseClient, clinicaId: string, api: Api, id: string) {
  const { data: g } = await db.from("gatilhos").select("*").eq("id", id).eq("clinica_id", clinicaId).maybeSingle();
  if (!g) throw new Error("Automação não encontrada.");
  if (g.zernio_automation_id) {
    await api.mudarAutomacao(g.zernio_automation_id, { isActive: true });
  } else {
    const { accountId, profileId } = await contaInstagram(api);
    const corpo: Record<string, unknown> = {
      profileId,
      accountId,
      name: `Comenta ${g.palavra}`,
      trigger: "comment",
      platformPostId: g.platform_post_id,
      keywords: [g.palavra],
      matchMode: "word",
      typoTolerance: g.palavra.length >= 4,
      dmMessage: g.mensagem_direct,
      commentReply: g.resposta_publica || undefined,
      publicReplyPolicy: "after_dm",
      isActive: true,
    };
    if (g.botao_url && g.botao_titulo) corpo.buttons = [{ type: "url", title: g.botao_titulo.slice(0, 20), url: g.botao_url }];
    const r = await api.criarAutomacao(corpo);
    if (!r.automation?.id) throw new Error("A Zernio não devolveu a automação.");
    await db.from("gatilhos").update({ zernio_automation_id: r.automation.id }).eq("id", id);
  }
  await db.from("gatilhos").update({ ativo: true, updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

export async function pausarGatilho(db: SupabaseClient, clinicaId: string, api: Api, id: string) {
  const { data: g } = await db.from("gatilhos").select("zernio_automation_id").eq("id", id).eq("clinica_id", clinicaId).maybeSingle();
  if (g?.zernio_automation_id) await api.mudarAutomacao(g.zernio_automation_id, { isActive: false });
  await db.from("gatilhos").update({ ativo: false, updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

/** Leva para a Zernio o texto editado (resposta no comentário, direct, botão). */
export async function atualizarGatilho(db: SupabaseClient, clinicaId: string, api: Api, id: string) {
  const { data: g } = await db.from("gatilhos").select("*").eq("id", id).eq("clinica_id", clinicaId).maybeSingle();
  if (!g?.zernio_automation_id) return { ok: true, naZernio: false };
  const corpo: Record<string, unknown> = { dmMessage: g.mensagem_direct };
  if (g.resposta_publica?.trim()) corpo.commentReply = g.resposta_publica.trim();
  corpo.buttons = g.botao_url && g.botao_titulo ? [{ type: "url", title: g.botao_titulo.slice(0, 20), url: g.botao_url }] : [];
  await api.mudarAutomacao(g.zernio_automation_id, corpo);
  return { ok: true, naZernio: true };
}

/** Some com o rascunho da tela. Fica marcado para a busca não criar de novo. */
export async function descartarGatilho(db: SupabaseClient, clinicaId: string, id: string) {
  await db.from("gatilhos").update({ stats: { descartado: true }, updated_at: new Date().toISOString() }).eq("id", id).eq("clinica_id", clinicaId).is("zernio_automation_id", null);
  return { ok: true };
}

/** Traz da Zernio as automações (inclusive as criadas lá fora) e os números. */
export async function sincronizarGatilhos(db: SupabaseClient, clinicaId: string, api: Api) {
  const lista = (await api.automacoes()).automations ?? [];
  let importadas = 0;
  for (const a of lista) {
    const palavra = (a.keywords?.[0] ?? "").toUpperCase() || "QUALQUER";
    const { data: existe } = await db.from("gatilhos").select("id").eq("clinica_id", clinicaId).eq("zernio_automation_id", a.id).maybeSingle();
    if (existe) {
      await db.from("gatilhos").update({ ativo: !!a.isActive, stats: a.stats ?? {} }).eq("id", existe.id);
      continue;
    }
    const { data: post } = a.platformPostId
      ? await db.from("redes_posts").select("id, url, legenda").eq("clinica_id", clinicaId).eq("externo_id", a.platformPostId).maybeSingle()
      : { data: null };
    await db.from("gatilhos").upsert(
      {
        clinica_id: clinicaId,
        post_id: post?.id ?? null,
        platform_post_id: a.platformPostId ?? null,
        post_url: post?.url ?? null,
        legenda: post?.legenda ?? a.name ?? null,
        palavra,
        resposta_publica: a.commentReply ?? null,
        mensagem_direct: a.dmMessage ?? "",
        zernio_automation_id: a.id,
        ativo: !!a.isActive,
        stats: a.stats ?? {},
      },
      { onConflict: "clinica_id,platform_post_id,palavra" }
    );
    importadas++;
  }
  return { naZernio: lista.length, importadas };
}
