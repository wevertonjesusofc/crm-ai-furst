import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { registrarLead } from "@/lib/leads";

// Porta de entrada de leads com ORIGEM. Qualquer fonte pode mandar:
// formulário do site (com UTM/gclid), Zernio, Make, n8n…
//
// POST /api/rastreio/lead
// Cabeçalho: x-chave-clinica: lead_...   (a chave aparece em Marketing › Tráfego e Vendas)
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

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });

  const chave = req.headers.get("x-chave-clinica")?.trim();
  if (!chave) return NextResponse.json({ error: "Falta o cabeçalho x-chave-clinica." }, { status: 401 });
  const { data: clinica } = await db.from("clinicas").select("id").eq("chave_entrada_leads", chave).maybeSingle();
  if (!clinica) return NextResponse.json({ error: "Chave inválida." }, { status: 401 });

  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "JSON inválido." }, { status: 400 });

  try {
    const r = await registrarLead(db, clinica.id as string, b);
    return NextResponse.json({ ok: true, contato_id: r.contatoId, novo: r.novo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
