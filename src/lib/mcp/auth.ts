import { createHash, randomBytes } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

export function gerarToken(): string {
  return "aura_" + randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ContextoMcp = {
  userId: string;
  email: string | null;
  admin: boolean;
  clinicaId: string;
  clinicaNome: string;
};

/** Descobre quem é o dono do token e em qual clínica ele está trabalhando. */
export async function resolverToken(db: SupabaseClient, token: string): Promise<ContextoMcp | null> {
  if (!token.startsWith("aura_")) return null;
  const { data: tk } = await db
    .from("mcp_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!tk) return null;

  await db.from("mcp_tokens").update({ ultimo_uso_at: new Date().toISOString() }).eq("id", tk.id);

  const [{ data: adm }, { data: ctx }, { data: membro }, { data: usuario }] = await Promise.all([
    db.from("plataforma_admins").select("user_id").eq("user_id", tk.user_id).maybeSingle(),
    db.from("admin_contexto").select("clinica_id").eq("user_id", tk.user_id).maybeSingle(),
    db.from("clinica_membros").select("clinica_id").eq("user_id", tk.user_id).order("created_at").limit(1).maybeSingle(),
    db.auth.admin.getUserById(tk.user_id),
  ]);

  const admin = !!adm;
  const clinicaId = (admin && ctx?.clinica_id) || membro?.clinica_id;
  if (!clinicaId) return null;
  const { data: clinica } = await db.from("clinicas").select("nome").eq("id", clinicaId).maybeSingle();

  return {
    userId: tk.user_id,
    email: usuario?.user?.email ?? null,
    admin,
    clinicaId,
    clinicaNome: clinica?.nome ?? "Clínica",
  };
}
