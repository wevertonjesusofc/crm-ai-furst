import { NextRequest, NextResponse } from "next/server";
import { contextoZernio, ErroZernio } from "@/lib/zernio";

// POST /api/zernio/instagram/enviar   { "conversa_id": "<id da conversa no CRM>", "texto": "..." }
// Responde o direct do Instagram pela Zernio e grava a mensagem enviada no CRM.
// Só funciona em conversas que vieram da Zernio (conversas.externo_id preenchido).

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { db, cid, api } = ctx;

  const b = await req.json().catch(() => null);
  const conversaId = typeof b?.conversa_id === "string" ? b.conversa_id : "";
  const texto = typeof b?.texto === "string" ? b.texto.trim().slice(0, 1000) : "";
  if (!conversaId || !texto) return NextResponse.json({ error: "Mande conversa_id e texto." }, { status: 400 });

  const { data: conv } = await db.from("conversas").select("id, channel, externo_id").eq("clinica_id", cid).eq("id", conversaId).maybeSingle();
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (conv.channel !== "instagram" || !conv.externo_id) return NextResponse.json({ error: "Essa conversa não veio do Instagram pela Zernio." }, { status: 400 });

  try {
    const contas = await api.contas();
    const ig = contas.accounts.find((a) => a.platform === "instagram" && a.isActive && !a.needsReconnection);
    if (!ig) return NextResponse.json({ error: "Nenhum Instagram conectado na Zernio." }, { status: 404 });
    const r = await api.enviarMensagem(conv.externo_id, ig._id, texto);
    const agora = new Date().toISOString();
    const { data: msg } = await db
      .from("mensagens")
      .insert({ clinica_id: cid, conversa_id: conv.id, direction: "enviada", body: texto, externo_id: r.data?.messageId ?? null, created_at: agora })
      .select("id, direction, body, created_at")
      .single();
    await db.from("conversas").update({ last_message_at: agora }).eq("id", conv.id);
    return NextResponse.json({ ok: true, mensagem: msg });
  } catch (e) {
    const st = e instanceof ErroZernio ? e.status : 502;
    return NextResponse.json({ error: (e as Error).message }, { status: st >= 400 && st < 600 ? st : 502 });
  }
}
