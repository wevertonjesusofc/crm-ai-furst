import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { INTEGRACOES } from "@/lib/integracoes/catalogo";
import { clinicaDoUsuario, lerIntegracao, testarIntegracao } from "@/lib/integracoes/servidor";

// POST /api/integracoes  { tipo, config: {...campos públicos}, segredos: {...só os que mudaram}, testar?: true }
// Salva no banco (segredos numa tabela que o navegador não lê) e, se pedido, testa a conexão.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });

  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { clinicaId, podeEditar } = await clinicaDoUsuario(db, u.user.id);
  if (!clinicaId) return NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 });
  if (!podeEditar) return NextResponse.json({ error: "Só o dono da clínica ou o suporte podem mexer nas integrações." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const def = INTEGRACOES[String(body.tipo)];
  if (!def) return NextResponse.json({ error: "Integração desconhecida." }, { status: 400 });

  const nomesSegredo = new Set(def.campos.filter((c) => c.segredo).map((c) => c.nome));
  const nomesPublicos = new Set(def.campos.filter((c) => !c.segredo).map((c) => c.nome));

  // Campos públicos
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries((body.config ?? {}) as Record<string, unknown>)) {
    if (nomesPublicos.has(k) && typeof v === "string") config[k] = v.trim().slice(0, 500);
  }

  // Segredos: string preenchida = troca; "" com apagar = remove; ausente = mantém
  for (const [k, v] of Object.entries((body.segredos ?? {}) as Record<string, unknown>)) {
    if (!nomesSegredo.has(k) || typeof v !== "string") continue;
    if (v.trim()) {
      await db.from("integracoes_segredos").upsert({ clinica_id: clinicaId, tipo: def.tipo, nome: k, valor: v.trim(), updated_at: new Date().toISOString() });
    }
  }
  for (const k of (Array.isArray(body.apagar) ? body.apagar : []) as string[]) {
    if (nomesSegredo.has(k)) await db.from("integracoes_segredos").delete().eq("clinica_id", clinicaId).eq("tipo", def.tipo).eq("nome", k);
  }

  const { data: seg } = await db.from("integracoes_segredos").select("nome").eq("clinica_id", clinicaId).eq("tipo", def.tipo);
  const preenchidos = (seg ?? []).map((s) => s.nome);

  let status: "desconectado" | "conectado" | "erro" = preenchidos.length || Object.values(config).some(Boolean) ? "conectado" : "desconectado";
  let msg: string | null = null;
  if (body.testar) {
    await db.from("integracoes").upsert({ clinica_id: clinicaId, tipo: def.tipo, config, segredos_preenchidos: preenchidos, updated_at: new Date().toISOString() });
    const r = await testarIntegracao(def.tipo, await lerIntegracao(db, clinicaId, def.tipo));
    status = r.ok ? "conectado" : "erro";
    msg = r.msg;
  }

  const { error } = await db.from("integracoes").upsert({
    clinica_id: clinicaId,
    tipo: def.tipo,
    config,
    segredos_preenchidos: preenchidos,
    status,
    ...(msg ? { ultimo_teste_at: new Date().toISOString(), ultimo_teste_msg: msg } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status, msg, preenchidos });
}
