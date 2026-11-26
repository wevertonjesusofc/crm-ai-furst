import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario, lerIntegracao } from "@/lib/integracoes/servidor";

// Liga/desliga o anúncio. Se for da Meta, muda lá também (o token precisa
// da permissão ads_management). POST /api/trafego/status {id, ativo}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { clinicaId, podeEditar } = await clinicaDoUsuario(db, u.user.id);
  if (!clinicaId) return NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 });
  if (!podeEditar) return NextResponse.json({ error: "Só o dono liga ou desliga anúncio." }, { status: 403 });

  const { id, ativo } = await req.json().catch(() => ({}));
  const { data: an } = await db.from("anuncios").select("id, plataforma, externo_id").eq("id", id).eq("clinica_id", clinicaId).maybeSingle();
  if (!an) return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });

  let naPlataforma = false;
  if (an.plataforma === "meta" && !String(an.externo_id).startsWith("demo")) {
    const meta = await lerIntegracao(db, clinicaId, "meta_ads");
    if (!meta.access_token) return NextResponse.json({ error: "Conecte a Meta em Conexões para ligar e desligar por aqui." }, { status: 400 });
    const versao = process.env.META_GRAPH_VERSION || "v23.0";
    const r = await fetch(`https://graph.facebook.com/${versao}/${an.externo_id}`, {
      method: "POST",
      body: new URLSearchParams({ status: ativo ? "ACTIVE" : "PAUSED", access_token: meta.access_token }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = d?.error?.message ?? "A Meta não aceitou.";
      return NextResponse.json({ error: /permission|ads_management/i.test(msg) ? "O token da Meta não tem permissão para pausar (ads_management). Gere um token com essa permissão em Conexões." : msg }, { status: 502 });
    }
    naPlataforma = true;
  }
  await db.from("anuncios").update({ ativo: !!ativo }).eq("id", an.id);
  return NextResponse.json({ ok: true, naPlataforma });
}
