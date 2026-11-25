import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { lerIntegracao } from "@/lib/integracoes/servidor";
import { processarTelegram } from "@/lib/telegram";

// Webhook do Telegram (quando o sistema está no ar com domínio).
// O endereço é /api/webhooks/telegram?c=<id da clínica> e o Telegram manda o
// segredo no cabeçalho X-Telegram-Bot-Api-Secret-Token.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const db = serviceClient();
  const cid = req.nextUrl.searchParams.get("c");
  if (!db || !cid) return NextResponse.json({ ok: false }, { status: 400 });
  const cfg = await lerIntegracao(db, cid, "telegram");
  if (!cfg.webhook_secret || req.headers.get("x-telegram-bot-api-secret-token") !== cfg.webhook_secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json().catch(() => null);
  if (update) {
    try {
      await processarTelegram(db, cid, update);
    } catch {
      // o Telegram precisa receber 200, senão reenvia a mesma mensagem
    }
  }
  return NextResponse.json({ ok: true });
}
