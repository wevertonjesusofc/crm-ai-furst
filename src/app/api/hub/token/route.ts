import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";

// Guarda (ou troca) o token do MCP de um cliente no painel central.
// O token nunca volta para o navegador depois de salvo.

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });

  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { data: adm } = await db.from("plataforma_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
  if (!adm) return NextResponse.json({ error: "Só administradores." }, { status: 403 });

  const { clienteId, token } = await req.json().catch(() => ({}));
  if (typeof clienteId !== "string" || typeof token !== "string" || !token.trim().startsWith("aura_")) {
    return NextResponse.json({ error: "Cole o token que começa com aura_." }, { status: 400 });
  }
  const { error } = await db
    .from("clientes_hub_tokens")
    .upsert({ cliente_id: clienteId, token: token.trim(), updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
