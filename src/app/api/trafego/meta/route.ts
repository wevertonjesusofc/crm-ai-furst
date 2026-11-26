import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario, lerIntegracao } from "@/lib/integracoes/servidor";

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
  reach?: string;
  clicks?: string;
  date_start: string;
  actions?: { action_type: string; value: string }[];
};

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." }, { status: 500 });
  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const { clinicaId } = await clinicaDoUsuario(db, u.user.id);
  if (!clinicaId) return NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 });
  const cid = clinicaId;

  // Chaves da clínica (Configurações › Meta Ads), com o .env como reserva.
  const meta = await lerIntegracao(db, cid, "meta_ads");
  const token = meta.access_token;
  const contaBruta = meta.ad_account_id;
  if (!token || !contaBruta) return NextResponse.json({ error: "Conecte a Meta em Configurações › Meta Ads (ID da conta e token)." }, { status: 400 });
  const conta = contaBruta.startsWith("act_") ? contaBruta : `act_${contaBruta}`;

  const versao = process.env.META_GRAPH_VERSION || "v23.0";
  const params = new URLSearchParams({
    level: "ad",
    fields: "ad_id,ad_name,campaign_name,adset_name,spend,impressions,reach,clicks,actions",
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
    const leads = (l.actions ?? [])
      .filter((a) => a.action_type === "lead" || a.action_type.includes("leadgen") || a.action_type.includes("fb_pixel_lead"))
      .reduce((s, a) => s + Number(a.value || 0), 0);
    const base = { anuncio_id: anuncioId, clinica_id: cid, dia: l.date_start, gasto: Number(l.spend ?? 0), impressoes: Number(l.impressions ?? 0), cliques: Number(l.clicks ?? 0), conversas };
    const { error } = await db.from("anuncios_gasto").upsert({ ...base, alcance: Number(l.reach ?? 0), leads });
    if (error) await db.from("anuncios_gasto").upsert(base); // antes da migração 031
  }

  // Criativos: miniatura, vídeo, formato e se está ligado na Meta.
  let criativos = 0;
  let next: string | null = `https://graph.facebook.com/${versao}/${conta}/ads?${new URLSearchParams({
    fields: "id,effective_status,creative{thumbnail_url,image_url,video_id,object_type,instagram_permalink_url,asset_feed_spec}",
    limit: "200",
    access_token: token,
  })}`;
  while (next) {
    const r: Response = await fetch(next);
    const d = await r.json();
    if (!r.ok) break;
    for (const ad of (d.data ?? []) as { id: string; effective_status?: string; creative?: { thumbnail_url?: string; image_url?: string; video_id?: string; object_type?: string; instagram_permalink_url?: string } }[]) {
      const cr = ad.creative ?? {};
      let video: string | null = null;
      if (cr.video_id) {
        const v = await fetch(`https://graph.facebook.com/${versao}/${cr.video_id}?fields=source,picture&access_token=${token}`).then((x) => x.json()).catch(() => null);
        video = v?.source ?? null;
      }
      const formato = cr.video_id ? "video" : cr.object_type === "SHARE" && !cr.image_url ? "carrossel" : "imagem";
      const campos = { criativo_url: cr.image_url ?? cr.thumbnail_url ?? null, ativo: ad.effective_status === "ACTIVE" };
      const { error } = await db
        .from("anuncios")
        .update({ ...campos, video_url: video, formato, status_plataforma: ad.effective_status ?? null, link: cr.instagram_permalink_url ?? null })
        .eq("clinica_id", cid).eq("plataforma", "meta").eq("externo_id", ad.id);
      if (error) await db.from("anuncios").update(campos).eq("clinica_id", cid).eq("plataforma", "meta").eq("externo_id", ad.id);
      criativos++;
    }
    next = d.paging?.next ?? null;
  }

  return NextResponse.json({ ok: true, anuncios, dias: linhas.length, criativos });
}
