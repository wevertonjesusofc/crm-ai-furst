import { SupabaseClient } from "@supabase/supabase-js";
import { detectarVenda, temSinalDeVenda } from "@/lib/vendaAutomatica";
import { detectarCombinado, temSinalDeCombinado } from "@/lib/combinados";

// Registra um lead com a ORIGEM: cria/acha o paciente, marca anúncio e UTM no
// primeiro toque, abre oportunidade no funil e guarda a primeira mensagem.
// Usado pela entrada de leads (/api/rastreio/lead) e pelo webhook do WhatsApp.

export type LeadEntrada = {
  nome?: unknown;
  whatsapp?: unknown;
  telefone?: unknown;
  email?: unknown;
  origem_canal?: unknown;
  origem_detalhe?: unknown;
  anuncio?: { plataforma?: unknown; id?: unknown; nome?: unknown; campanha?: unknown; conjunto?: unknown } | null;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  click_id?: unknown;
  mensagem?: unknown;
  canal_mensagem?: unknown;
  /** Direct do Instagram (Zernio): id da pessoa na rede e o @. Precisa da migração 022. */
  instagram_id?: unknown;
  instagram_usuario?: unknown;
};

const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const soDigitos = (v: string | null) => (v ? v.replace(/\D/g, "") : null);

export async function registrarLead(db: SupabaseClient, cid: string, b: LeadEntrada) {
  const nome = s(b.nome, 120) ?? "Sem nome";
  const whatsapp = soDigitos(s(b.whatsapp ?? b.telefone, 30));
  const email = s(b.email, 160)?.toLowerCase() ?? null;
  const instagramId = s(b.instagram_id, 120);
  const instagramUsuario = s(b.instagram_usuario, 120)?.replace(/^@/, "") ?? null;
  if (!whatsapp && !email && !instagramId) throw new Error("Mande pelo menos whatsapp ou email.");

  let anuncioId: string | null = null;
  const an = b.anuncio && typeof b.anuncio === "object" ? b.anuncio : null;
  if (an && s(an.id) && ["meta", "google", "outro"].includes(String(an.plataforma))) {
    const { data: anuncio } = await db
      .from("anuncios")
      .upsert(
        { clinica_id: cid, plataforma: an.plataforma, externo_id: s(an.id), nome: s(an.nome) ?? `Anúncio ${s(an.id)}`, campanha: s(an.campanha), conjunto: s(an.conjunto) },
        { onConflict: "clinica_id,plataforma,externo_id" }
      )
      .select("id")
      .single();
    anuncioId = anuncio?.id ?? null;
  }

  let contato: { id: string; origem_canal: string | null } | null = null;
  if (instagramId) {
    const { data } = await db.from("contacts").select("id, origem_canal").eq("clinica_id", cid).eq("instagram_id", instagramId).limit(1).maybeSingle();
    contato = data;
  }
  if (!contato && whatsapp) {
    const { data } = await db.from("contacts").select("id, origem_canal").eq("clinica_id", cid).eq("whatsapp", whatsapp).limit(1).maybeSingle();
    contato = data;
  }
  if (!contato && email) {
    const { data } = await db.from("contacts").select("id, origem_canal").eq("clinica_id", cid).eq("email", email).limit(1).maybeSingle();
    contato = data;
  }

  const origem = {
    origem_canal: s(b.origem_canal, 40) ?? (an ? (an.plataforma === "google" ? "anuncio_google" : "anuncio_meta") : null),
    origem_detalhe: s(b.origem_detalhe),
    anuncio_id: anuncioId,
    utm_source: s(b.utm_source, 120),
    utm_medium: s(b.utm_medium, 120),
    utm_campaign: s(b.utm_campaign, 200),
    utm_content: s(b.utm_content, 200),
    click_id: s(b.click_id, 300),
  };

  let novo = false;
  if (!contato) {
    const { data, error } = await db.from("contacts").insert({ clinica_id: cid, name: nome, whatsapp, email, ...(instagramId ? { instagram_id: instagramId, instagram_usuario: instagramUsuario } : {}), ...origem }).select("id, origem_canal").single();
    if (error) throw new Error(error.message);
    contato = data;
    novo = true;
  } else if (!contato.origem_canal && origem.origem_canal) {
    await db.from("contacts").update(origem).eq("id", contato.id);
  }
  const contatoId = contato!.id;

  const { data: aberta } = await db.from("deals").select("id").eq("clinica_id", cid).eq("contact_id", contatoId).eq("status", "open").limit(1).maybeSingle();
  if (!aberta) {
    const { data: etapa } = await db.from("pipeline_stages").select("id").eq("clinica_id", cid).order("position").limit(1).maybeSingle();
    await db.from("deals").insert({ clinica_id: cid, contact_id: contatoId, stage_id: etapa?.id ?? null, title: `Novo paciente: ${nome}`, value: 0 });
  }

  const mensagem = s(b.mensagem, 4000);
  if (mensagem) {
    const canal = b.canal_mensagem === "instagram" ? "instagram" : "whatsapp";
    const { data: conversa } = await db
      .from("conversas")
      .upsert({ clinica_id: cid, contact_id: contatoId, channel: canal, status: "aberta", last_message_at: new Date().toISOString() }, { onConflict: "contact_id,channel" })
      .select("id")
      .single();
    if (conversa) await db.from("mensagens").insert({ clinica_id: cid, conversa_id: conversa.id, direction: "recebida", body: mensagem });
    // Sinal de pagamento na mensagem: a IA confere a conversa e marca a venda como ganha.
    if (temSinalDeVenda(mensagem)) await detectarVenda(db, cid, contatoId).catch(() => null);
    // "Me chama dia 17": vira combinado com data, para o time não esquecer.
    if (temSinalDeCombinado(mensagem)) await detectarCombinado(db, cid, contatoId).catch(() => null);
  }

  if (novo || origem.origem_canal) {
    await db.from("activities").insert({
      clinica_id: cid,
      contact_id: contatoId,
      type: "note",
      description: `Lead ${novo ? "novo" : "voltou"} via ${origem.origem_canal ?? "origem não informada"}${an ? ` (anúncio ${s(an.nome) ?? s(an.id)})` : ""}`,
    });
  }

  return { contatoId, novo };
}
