import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { gerarToken, hashToken } from "@/lib/mcp/auth";

// Gera um token pessoal para conectar o Claude ao MCP desta instalação.
// O token aparece uma única vez; no banco fica só o hash.

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });

  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  // Token do Claude mexe em tudo (agentes, funil): só o dono ou o suporte da plataforma criam.
  const [{ data: dono }, { data: admin }] = await Promise.all([
    db.from("clinica_membros").select("papel").eq("user_id", u.user.id).eq("papel", "dono").limit(1).maybeSingle(),
    db.from("plataforma_admins").select("user_id").eq("user_id", u.user.id).maybeSingle(),
  ]);
  if (!dono && !admin) return NextResponse.json({ error: "Só o dono da clínica pode ligar o Claude." }, { status: 403 });

  const { nome } = await req.json().catch(() => ({ nome: "" }));
  const token = gerarToken();
  const { error } = await db.from("mcp_tokens").insert({
    user_id: u.user.id,
    nome: typeof nome === "string" && nome.trim() ? nome.trim().slice(0, 60) : "Claude",
    token_hash: hashToken(token),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token });
}
