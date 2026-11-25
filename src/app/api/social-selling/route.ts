import { NextRequest, NextResponse } from "next/server";
import { contextoZernio } from "@/lib/zernio";
import { atualizarEngajados, analisarEngajados } from "@/lib/socialSelling";

// POST /api/social-selling?acao=atualizar         lê os comentários e monta o ranking
// POST /api/social-selling?acao=analisar  {ids}   a IA analisa quem tem cara de comprar

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const acao = req.nextUrl.searchParams.get("acao");
  try {
    if (acao === "atualizar") return NextResponse.json(await atualizarEngajados(ctx.db, ctx.cid, ctx.api));
    if (acao === "analisar") {
      const { ids } = await req.json().catch(() => ({ ids: [] }));
      if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: "Escolha quem analisar." }, { status: 400 });
      return NextResponse.json(await analisarEngajados(ctx.db, ctx.cid, ids.slice(0, 15)));
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
