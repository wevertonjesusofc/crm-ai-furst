import { SupabaseClient } from "@supabase/supabase-js";
import { segredo } from "@/lib/integracoes/servidor";

// Venda detectada sozinha na conversa (WhatsApp/Instagram).
// Quando aparece sinal de pagamento ("tô fazendo o Pix", comprovante, "fechado"),
// a IA lê a conversa, confirma se fechou, pega o valor e os procedimentos e
// move a oportunidade para Ganho, sem ninguém preencher o CRM.

const SINAIS = /\b(pix|comprovante|paguei|pago|transferi|transferência|fechad[oa]|fechar|fechamos|cart[aã]o|parcel|boleto|sinal|entrada|reserv)/i;

export function temSinalDeVenda(texto: string) {
  return SINAIS.test(texto);
}

type Analise = { fechou: boolean; valor: number | null; procedimentos: string[]; confianca: "alta" | "media" | "baixa"; resumo: string };

async function analisar(chave: string, conversa: string): Promise<Analise | null> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 400,
      system:
        "Você analisa conversas entre uma clínica e um paciente. Diga se a venda FECHOU (paciente confirmou que vai pagar ou pagou: Pix, comprovante, cartão, sinal). " +
        'Responda SÓ com JSON: {"fechou": boolean, "valor": número em reais ou null, "procedimentos": [nomes], "confianca": "alta"|"media"|"baixa", "resumo": "uma frase"}. ' +
        "Valor = total combinado. Se não tiver certeza, fechou=false.",
      messages: [{ role: "user", content: conversa.slice(-6000) }],
    }),
  });
  if (!resp.ok) return null;
  const d = (await resp.json()) as { content: { type: string; text?: string }[] };
  const txt = d.content.find((b) => b.type === "text")?.text ?? "";
  try {
    return JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)) as Analise;
  } catch {
    return null;
  }
}

/** Analisa a conversa do paciente e, se fechou, marca a venda como ganha. */
export async function detectarVenda(db: SupabaseClient, clinicaId: string, contactId: string) {
  const chave = await segredo(clinicaId, "ia", "anthropic_api_key");
  if (!chave) return { ok: false, motivo: "sem chave de IA" };

  const { data: convs } = await db.from("conversas").select("id").eq("clinica_id", clinicaId).eq("contact_id", contactId);
  const ids = (convs ?? []).map((c) => c.id);
  if (!ids.length) return { ok: false, motivo: "sem conversa" };
  const { data: msgs } = await db.from("mensagens").select("direction, body, created_at").in("conversa_id", ids).order("created_at", { ascending: false }).limit(30);
  const texto = ((msgs ?? []) as { direction: string; body: string }[])
    .reverse()
    .map((m) => `${m.direction === "recebida" ? "Paciente" : "Clínica"}: ${m.body}`)
    .join("\n");

  const a = await analisar(chave, texto);
  if (!a || !a.fechou || a.confianca === "baixa") return { ok: true, fechou: false };

  const [{ data: stages }, { data: aberta }] = await Promise.all([
    db.from("pipeline_stages").select("id, name").eq("clinica_id", clinicaId),
    db.from("deals").select("id, value, status").eq("clinica_id", clinicaId).eq("contact_id", contactId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ganho = (stages ?? []).find((s) => s.name === "Ganho")?.id ?? null;
  if (aberta?.status === "won") return { ok: true, fechou: true, jaEstava: true };

  const titulo = a.procedimentos?.length ? a.procedimentos.join(" + ").slice(0, 120) : "Venda fechada na conversa";
  const valor = Number(a.valor) || Number(aberta?.value) || 0;
  if (aberta) {
    await db.from("deals").update({ status: "won", stage_id: ganho, value: valor, title: titulo }).eq("id", aberta.id);
  } else {
    await db.from("deals").insert({ clinica_id: clinicaId, contact_id: contactId, status: "won", stage_id: ganho, value: valor, title: titulo });
  }
  await db.from("activities").insert({
    clinica_id: clinicaId,
    contact_id: contactId,
    type: "note",
    description: `Venda detectada automaticamente na conversa: ${titulo}${valor ? ` · R$ ${valor.toLocaleString("pt-BR")}` : ""}. ${a.resumo ?? ""}`,
  });
  return { ok: true, fechou: true, valor, titulo };
}

/** Varre as conversas recentes com sinal de pagamento. */
export async function varrerVendas(db: SupabaseClient, clinicaId: string, dias = 7) {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const { data: msgs } = await db
    .from("mensagens")
    .select("body, conversa_id, conversas!inner(contact_id, clinica_id)")
    .eq("clinica_id", clinicaId)
    .gte("created_at", desde)
    .limit(2000);
  const candidatos = new Set<string>();
  for (const m of (msgs ?? []) as unknown as { body: string; conversas: { contact_id: string } }[]) {
    if (temSinalDeVenda(m.body)) candidatos.add(m.conversas.contact_id);
  }
  const fechadas: { contactId: string; valor?: number; titulo?: string }[] = [];
  for (const c of candidatos) {
    const r = await detectarVenda(db, clinicaId, c);
    if ("fechou" in r && r.fechou && !("jaEstava" in r)) fechadas.push({ contactId: c, valor: (r as { valor?: number }).valor, titulo: (r as { titulo?: string }).titulo });
  }
  return { analisadas: candidatos.size, fechadas };
}
