import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

// Porta de entrada de leads com ORIGEM. Qualquer fonte pode mandar:
// formulário do site (com UTM/gclid), webhook do WhatsApp (anúncio de clique
// para WhatsApp manda o id do anúncio), Zernio, Make, n8n…
//
// POST /api/rastreio/lead
// Cabeçalho: x-chave-clinica: lead_...   (Sistema › Conectar IA mostra a chave)
// Corpo JSON:
// {
//   "nome": "Maria", "whatsapp": "5562999999999", "email": "...",
//   "origem_canal": "anuncio_meta" | "anuncio_google" | "instagram" | "google" | "indicacao" | "formulario" | "whatsapp" | "outro",
//   "origem_detalhe": "texto livre",
//   "anuncio": { "plataforma": "meta" | "google", "id": "120210...", "nome": "Vídeo botox 1", "campanha": "...", "conjunto": "..." },
//   "utm_source": "...", "utm_medium": "...", "utm_campaign": "...", "utm_content": "...",
//   "click_id": "gclid / fbclid / ctwa_clid",
//   "mensagem": "primeira mensagem do paciente", "canal_mensagem": "whatsapp" | "instagram"
// }

export const dynamic = "force-dynamic";

const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const soDigitos = (v: string | null) => (v ? v.replace(/\D/g, "") : null);

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });

  const chave = req.headers.get("x-chave-clinica")?.trim();
  if (!chave) return NextResponse.json({ error: "Falta o cabeçalho x-chave-clinica." }, { status: 401 });
  const { data: clinica } = await db.from("clinicas").select("id").eq("chave_entrada_leads", chave).maybeSingle();
  if (!clinica) return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
  const cid = clinica.id as string;

  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "JSON inválido." }, { status: 400 });

  const nome = s(b.nome, 120) ?? "Sem nome";
  const whatsapp = soDigitos(s(b.whatsapp ?? b.telefone, 30));
  const email = s(b.email, 160)?.toLowerCase() ?? null;
  if (!whatsapp && !email) return NextResponse.json({ error: "Mande pelo menos whatsapp ou email." }, { status: 400 });

  // 1. Anúncio (cria se ainda não existir)
  let anuncioId: string | null = null;
  const an = b.anuncio && typeof b.anuncio === "object" ? b.anuncio : null;
  if (an && s(an.id) && ["meta", "google", "outro"].includes(String(an.plataforma))) {
    const { data: anuncio } = await db
      .from("anuncios")
      .upsert(
        { clinica_id: cid, plataforma: an.plataforma, externo_id: s(an.id), nome: s(an.nome) ?? `Anúncio ${s(an.id)}`, campanha: s(an.campanha), conjunto: s(an.conjunto) },
        { onConflict: "clinica_id,plataforma,externo_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();
    anuncioId = anuncio?.id ?? null;
  }

  // 2. Paciente: procura por WhatsApp ou e-mail
  let contato: { id: string; origem_canal: string | null } | null = null;
  if (whatsapp) {
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
    const { data, error } = await db
      .from("contacts")
      .insert({ clinica_id: cid, name: nome, whatsapp, email, ...origem })
      .select("id, origem_canal")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    contato = data;
    novo = true;
  } else if (!contato.origem_canal) {
    // Primeiro toque: só preenche a origem se ainda não tinha.
    await db.from("contacts").update(origem).eq("id", contato.id);
  }

  // 3. Oportunidade aberta na primeira etapa do funil
  const { data: aberta } = await db.from("deals").select("id").eq("clinica_id", cid).eq("contact_id", contato!.id).eq("status", "open").limit(1).maybeSingle();
  if (!aberta) {
    const { data: etapa } = await db.from("pipeline_stages").select("id").eq("clinica_id", cid).order("position").limit(1).maybeSingle();
    await db.from("deals").insert({ clinica_id: cid, contact_id: contato!.id, stage_id: etapa?.id ?? null, title: `Novo paciente: ${nome}`, value: 0 });
  }

  // 4. Primeira mensagem (opcional)
  const mensagem = s(b.mensagem, 4000);
  if (mensagem) {
    const canal = b.canal_mensagem === "instagram" ? "instagram" : "whatsapp";
    const { data: conversa } = await db
      .from("conversas")
      .upsert({ clinica_id: cid, contact_id: contato!.id, channel: canal, status: "aberta", last_message_at: new Date().toISOString() }, { onConflict: "contact_id,channel" })
      .select("id")
      .single();
    if (conversa) await db.from("mensagens").insert({ clinica_id: cid, conversa_id: conversa.id, direction: "recebida", body: mensagem });
  }

  await db.from("activities").insert({
    clinica_id: cid,
    contact_id: contato!.id,
    type: "note",
    description: `Lead ${novo ? "novo" : "voltou"} via ${origem.origem_canal ?? "origem não informada"}${an ? ` (anúncio ${s(an.nome) ?? s(an.id)})` : ""}`,
  });

  return NextResponse.json({ ok: true, contato_id: contato!.id, novo });
}
