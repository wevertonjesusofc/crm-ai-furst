import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Cliente que age como a pessoa logada: usa o token que o navegador mandou no
 * cabeçalho Authorization. A proteção por linha (RLS) do banco garante que ela
 * só enxergue a própria clínica.
 */
export function clientFromRequest(req: NextRequest): SupabaseClient {
  const auth = req.headers.get("authorization") ?? "";
  return createClient(url, anonKey, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente de serviço: ignora a proteção por linha. Só pode ser usado no
 * servidor e sempre filtrando por clinica_id. Precisa da chave
 * SUPABASE_SERVICE_ROLE_KEY no .env.local (nunca com prefixo NEXT_PUBLIC_).
 */
export function serviceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
