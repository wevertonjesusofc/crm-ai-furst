import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario, lerIntegracao } from "@/lib/integracoes/servidor";
import { processarTelegram, tg } from "@/lib/telegram";

// POST /api/telegram?acao=ativar  liga o webhook (sistema no ar) ou o modo teste (localhost)
// POST /api/telegram?acao=puxar   modo teste: busca as mensagens novas e responde

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function clinica(req: NextRequest, db: NonNullable<ReturnType<typeof serviceClient>>) {
  const host = req.headers.get("host") ?? "";
  const local = process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (req.headers.get("authorization")) {
    const { data: u } = await clientFromRequest(req).auth.getUser();
    if (!u.user) return null;
    return (await clinicaDoUsuario(db, u.user.id)).clinicaId;
  }
  return local ? process.env.CLINICA_DEMO_ID || "00000000-0000-0000-0000-000000000001" : null;
}

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });
  const cid = await clinica(req, db);
  if (!cid) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });

  const cfg = await lerIntegracao(db, cid, "telegram");
  if (!cfg.bot_token) return NextResponse.json({ error: "Coloque o token do bot em Conexões › Telegram." }, { status: 400 });
  const bot = tg(cfg.bot_token);
  const acao = req.nextUrl.searchParams.get("acao");
  const origem = req.nextUrl.origin;

  if (acao === "ativar") {
    if (origem.startsWith("https://") && !origem.includes("localhost")) {
      const segredo = randomBytes(24).toString("hex");
      await db.from("integracoes_segredos").upsert({ clinica_id: cid, tipo: "telegram", nome: "webhook_secret", valor: segredo, updated_at: new Date().toISOString() });
      await bot.chamar("setWebhook", { url: `${origem}/api/webhooks/telegram?c=${cid}`, secret_token: segredo, allowed_updates: ["message"] });
      return NextResponse.json({ ok: true, modo: "webhook", msg: "Telegram ligado. As mensagens chegam sozinhas." });
    }
    await bot.chamar("deleteWebhook", { drop_pending_updates: false });
    return NextResponse.json({ ok: true, modo: "teste", msg: "Modo teste (computador local): use 'Buscar mensagens' para o Gerente responder." });
  }

  if (acao === "puxar") {
    const offset = Number(cfg.offset || 0);
    const updates = (await bot.chamar("getUpdates", { offset: offset || undefined, timeout: 0, allowed_updates: ["message"] })) as { update_id: number }[];
    let ultimo = offset - 1;
    for (const up of updates) {
      try {
        await processarTelegram(db, cid, up as Parameters<typeof processarTelegram>[2]);
      } catch (e) {
        console.error("telegram:", (e as Error).message);
      }
      ultimo = Math.max(ultimo, up.update_id);
    }
    if (updates.length) {
      await db.from("integracoes_segredos").upsert({ clinica_id: cid, tipo: "telegram", nome: "offset", valor: String(ultimo + 1), updated_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, mensagens: updates.length });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
