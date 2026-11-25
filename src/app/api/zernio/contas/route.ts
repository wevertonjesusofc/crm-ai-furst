import { NextRequest, NextResponse } from "next/server";
import { contextoZernio, ErroZernio } from "@/lib/zernio";

// GET /api/zernio/contas
// Lista as redes sociais conectadas na Zernio da clínica (Instagram, TikTok,
// YouTube, WhatsApp…), com seguidores e se o direct/métricas estão liberados.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  try {
    const r = await ctx.api.contas();
    const contas = (r.accounts ?? []).map((a) => {
      const perm = a.permissions ?? [];
      return {
        id: a._id,
        plataforma: a.platform,
        usuario: a.username ?? null,
        nome: a.displayName ?? null,
        foto: a.profilePicture ?? null,
        link: a.profileUrl ?? null,
        seguidores: a.followersCount ?? null,
        ativa: !!a.isActive && a.enabled !== false && !a.needsReconnection,
        precisa_reconectar: !!a.needsReconnection,
        status: a.platformStatus ?? null,
        direct: perm.some((p) => /messag/i.test(p)),
        metricas: perm.some((p) => /insights|analytics|stats/i.test(p)),
        ultima_mensagem_em: a.inboundActivity?.lastMessageAt ?? null,
      };
    });
    return NextResponse.json({ ok: true, total: contas.length, metricas_liberadas: !!r.hasAnalyticsAccess, contas });
  } catch (e) {
    const st = e instanceof ErroZernio ? e.status : 502;
    return NextResponse.json({ error: (e as Error).message }, { status: st >= 400 && st < 600 ? st : 502 });
  }
}
