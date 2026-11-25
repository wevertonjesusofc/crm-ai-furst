import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest } from "@/lib/supabaseServer";
import { responder, Turno } from "@/lib/agenteRuntime";

// Playground: responde como o agente, usando o prompt, o tom de voz da clínica,
// os conhecimentos, os procedimentos e as regras.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sessaoId } = await req.json();
  // Age como a pessoa logada: o banco só devolve dados da clínica dela.
  const supabase = clientFromRequest(req);

  const { data: agente } = await supabase.from("agentes").select("clinica_id").eq("id", id).maybeSingle();
  if (!agente) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });

  const { data: historicoData } = await supabase
    .from("agente_mensagens")
    .select("direction, body")
    .eq("sessao_id", sessaoId)
    .order("created_at");

  let reply = "";
  try {
    reply = await responder(supabase, agente.clinica_id, id, (historicoData ?? []) as Turno[]);
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg.includes("Nenhuma chave") ? "missing_key" : "api_error", detail: msg }, { status: msg.includes("Nenhuma chave") ? 400 : 502 });
  }

  await supabase.from("agente_mensagens").insert({ sessao_id: sessaoId, direction: "recebida", body: reply });
  await supabase.from("agente_sessoes").update({ last_message_at: new Date().toISOString() }).eq("id", sessaoId);

  return NextResponse.json({ reply });
}
