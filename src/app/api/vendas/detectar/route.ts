import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario } from "@/lib/integracoes/servidor";
import { varrerVendas } from "@/lib/vendaAutomatica";

// POST /api/vendas/detectar?dias=7 — varre as conversas com sinal de pagamento
// e marca como Ganho as vendas fechadas. Use também num agendamento (cron).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });
  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { clinicaId } = await clinicaDoUsuario(db, u.user.id);
  if (!clinicaId) return NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 });
  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias")) || 7, 1), 60);
  return NextResponse.json(await varrerVendas(db, clinicaId, dias));
}
