import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { serviceClient } from "@/lib/supabaseServer";
import { registrarLead } from "@/lib/leads";
import { lerIntegracao } from "@/lib/integracoes/servidor";

// Webhook do WhatsApp Oficial (Cloud API da Meta).
// GET  = verificação (a Meta manda hub.verify_token e hub.challenge).
// POST = mensagens recebidas. Cada mensagem vira paciente + conversa no CRM.
//        Se veio de anúncio de clique para WhatsApp, a Meta manda o "referral"
//        com o id do anúncio: o paciente fica marcado com esse anúncio.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = serviceClient();
  const p = req.nextUrl.searchParams;
  const token = p.get("hub.verify_token") ?? "";
  if (!db || p.get("hub.mode") !== "subscribe" || !token) return new NextResponse("forbidden", { status: 403 });
  const { data } = await db.from("integracoes").select("clinica_id").eq("tipo", "whatsapp_oficial").eq("config->>verify_token", token).limit(1).maybeSingle();
  if (!data) return new NextResponse("forbidden", { status: 403 });
  return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
}

type Msg = {
  from: string;
  type: string;
  text?: { body?: string };
  referral?: { source_id?: string; source_type?: string; headline?: string; ctwa_clid?: string; source_url?: string };
};

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ ok: false }, { status: 500 });
  const bruto = await req.text();
  let body: { entry?: { changes?: { value?: Record<string, unknown> }[] }[] };
  try {
    body = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const phoneId = (v.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
      if (!phoneId) continue;
      const { data: integ } = await db.from("integracoes").select("clinica_id").eq("tipo", "whatsapp_oficial").eq("config->>phone_number_id", phoneId).limit(1).maybeSingle();
      if (!integ) continue;
      const cid = integ.clinica_id as string;

      // Assinatura da Meta, se o App Secret estiver cadastrado.
      const cfg = await lerIntegracao(db, cid, "whatsapp_oficial");
      if (cfg.app_secret) {
        const assinatura = req.headers.get("x-hub-signature-256") ?? "";
        const esperado = "sha256=" + createHmac("sha256", cfg.app_secret).update(bruto).digest("hex");
        const a = Buffer.from(assinatura);
        const b = Buffer.from(esperado);
        if (a.length !== b.length || !timingSafeEqual(a, b)) continue;
      }

      const nomes = new Map<string, string>();
      for (const c of (v.contacts as { wa_id?: string; profile?: { name?: string } }[] | undefined) ?? []) {
        if (c.wa_id) nomes.set(c.wa_id, c.profile?.name ?? "");
      }

      for (const m of (v.messages as Msg[] | undefined) ?? []) {
        const texto = m.type === "text" ? m.text?.body : `[${m.type}]`;
        const ref = m.referral;
        try {
          await registrarLead(db, cid, {
            nome: nomes.get(m.from) || undefined,
            whatsapp: m.from,
            mensagem: texto,
            canal_mensagem: "whatsapp",
            origem_canal: ref?.source_type === "ad" ? "anuncio_meta" : "whatsapp",
            origem_detalhe: ref?.headline,
            click_id: ref?.ctwa_clid,
            anuncio: ref?.source_type === "ad" && ref.source_id ? { plataforma: "meta", id: ref.source_id, nome: ref.headline } : null,
          });
        } catch {
          // segue para a próxima mensagem; a Meta precisa receber 200
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}
