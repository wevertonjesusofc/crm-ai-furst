import { NextRequest, NextResponse } from "next/server";
import { contextoZernio } from "@/lib/zernio";
import { ativarGatilho, atualizarGatilho, descartarGatilho, detectarGatilhos, pausarGatilho, sincronizarGatilhos } from "@/lib/comentaRecebe";

// POST /api/comenta-recebe?acao=sincronizar | detectar | ativar&id= | pausar&id= | descartar&id=

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const acao = req.nextUrl.searchParams.get("acao");
  const id = req.nextUrl.searchParams.get("id") ?? "";
  try {
    if (acao === "sincronizar") return NextResponse.json(await sincronizarGatilhos(ctx.db, ctx.cid, ctx.api));
    if (acao === "detectar") return NextResponse.json(await detectarGatilhos(ctx.db, ctx.cid));
    if (acao === "ativar" && id) return NextResponse.json(await ativarGatilho(ctx.db, ctx.cid, ctx.api, id));
    if (acao === "atualizar" && id) return NextResponse.json(await atualizarGatilho(ctx.db, ctx.cid, ctx.api, id));
    if (acao === "descartar" && id) return NextResponse.json(await descartarGatilho(ctx.db, ctx.cid, id));
    if (acao === "pausar" && id) return NextResponse.json(await pausarGatilho(ctx.db, ctx.cid, ctx.api, id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
