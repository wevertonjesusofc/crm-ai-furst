import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { avisarAtrasados } from "@/lib/combinados";

// Rotina das 7h (horário de Brasília): o Gerente avisa no Telegram os combinados
// com paciente que ninguém cumpriu. No Vercel roda pelo cron (vercel.json) com o
// cabeçalho Authorization: Bearer CRON_SECRET. No computador local roda sem senha.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const local = process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const segredo = process.env.CRON_SECRET;
  if (!local && (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "sem SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  const { data: clinicas } = await db.from("clinicas").select("id, nome");
  const resultado = [];
  for (const c of clinicas ?? []) resultado.push({ clinica: c.nome, ...(await avisarAtrasados(db, c.id)) });
  return NextResponse.json({ ok: true, resultado });
}
