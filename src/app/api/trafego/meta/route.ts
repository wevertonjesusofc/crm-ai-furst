import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";

// Puxa da Meta (Facebook/Instagram Ads) o gasto, os cliques e as conversas
// iniciadas de cada anúncio nos últimos 30 dias e grava por dia.
// Precisa no .env.local / Vercel:
//   META_ACCESS_TOKEN   token com permissão ads_read da conta de anúncios da clínica
//   META_AD_ACCOUNT_ID  ex.: act_1234567890
//   META_GRAPH_VERSION  opcional (padrão v23.0)

export const dynamic = "force-dynamic";

type Linha = {
  ad_id: string;
  ad_name?: string;
  campaign_name?: string;
  adset_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  date_start: string;
  actions?: { action_type: string; value: string }[];
};

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });
  const token = process.env.META_ACCESS_TOKEN;
  const conta = process.env.META_AD_ACCOUNT_ID;
  if (!token || !conta) return NextResponse.json({ error: "Conecte a Meta: falta META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID." }, { status: 400 });

  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { data: membro } = await db.from("clinica_membros").select("clinica_id").eq("user_id", u.user.id).order("created_at").limit(1).maybeSingle();
  if (!membro) return NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 });
  const cid = membro.clinica_id as string;

  const versao = process.env.META_GRAPH_VERSION || "v23.0";
  const params = new URLSearchParams({
    level: "ad",
    fields: "ad_id,ad_name,campaign_name,adset_name,spend,impressions,clicks,actions",
    time_increment: "1",
    date_preset: "last_30d",
    limit: "500",
    access_token: token,
  });
  let url: string | null = `https://graph.facebook.com/${versao}/${conta}/insights?${params}`;
  const linhas: Linha[] = [];
  while (url) {
    const resp: Response = await fetch(url);
    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: data?.error?.message ?? "Erro na Meta." }, { status: 502 });
    linhas.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  let anuncios = 0;
  const ids = new Map<string, string>();
  for (const l of linhas) {
    if (!ids.has(l.ad_id)) {
      const { data: an } = await db
        .from("anuncios")
        .upsert(
          { clinica_id: cid, plataforma: "meta", externo_id: l.ad_id, nome: l.ad_name ?? `Anúncio ${l.ad_id}`, campanha: l.campaign_name ?? null, conjunto: l.adset_name ?? null },
          { onConflict: "clinica_id,plataforma,externo_id" }
        )
        .select("id")
        .single();
      if (an) {
        ids.set(l.ad_id, an.id);
        anuncios++;
      }
    }
    const anuncioId = ids.get(l.ad_id);
    if (!anuncioId) continue;
    const conversas = (l.actions ?? [])
      .filter((a) => a.action_type.includes("messaging_conversation_started"))
      .reduce((s, a) => s + Number(a.value || 0), 0);
    await db.from("anuncios_gasto").upsert({
      anuncio_id: anuncioId,
      clinica_id: cid,
      dia: l.date_start,
      gasto: Number(l.spend ?? 0),
      impressoes: Number(l.impressions ?? 0),
      cliques: Number(l.clicks ?? 0),
      conversas,
    });
  }

  return NextResponse.json({ ok: true, anuncios, dias: linhas.length });
}
