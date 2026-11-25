import { NextRequest, NextResponse } from "next/server";
import { contextoZernio, ErroZernio, migracao022Pronta, ZernioPost } from "@/lib/zernio";

// POST /api/zernio/metricas
// Puxa da Zernio as métricas dos posts e grava em redes_posts (uma linha por post
// por rede, atualizando se já existir).
// Parâmetros (na URL):
//   plataforma=instagram   (padrão) ou tiktok, youtube, linkedin, facebook, todas
//   conta=<id da conta na Zernio>   opcional
//   dias=90                quantos dias para trás (máx. 366)
//   simular=1              só lê e resume, não grava nada

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.round(v) : 0);

export async function POST(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { db, cid, api } = ctx;

  const sp = req.nextUrl.searchParams;
  const plataforma = sp.get("plataforma") || "instagram";
  const conta = sp.get("conta") || undefined;
  const dias = Math.min(Math.max(Number(sp.get("dias")) || 90, 1), 366);
  const simular = sp.get("simular") === "1";
  const de = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);

  if (!simular && !(await migracao022Pronta(db))) {
    return NextResponse.json({ error: "Falta rodar a supabase_migration_022_zernio.sql no Supabase." }, { status: 409 });
  }

  try {
    const posts: ZernioPost[] = [];
    let pagina = 1;
    let paginas = 1;
    let total = 0;
    do {
      const r = await api.posts({ accountId: conta, platform: plataforma === "todas" ? undefined : plataforma, page: pagina, limit: 100, fromDate: de });
      posts.push(...(r.posts ?? []));
      paginas = r.pagination?.pages ?? 1;
      total = r.pagination?.total ?? posts.length;
      pagina++;
    } while (pagina <= paginas && pagina <= 20);

    const linhas = posts.flatMap((p) => {
      const alvos = p.platforms?.length ? p.platforms : [{ platform: p.platform ?? plataforma, platformPostId: undefined, accountId: undefined, accountUsername: undefined, platformPostUrl: p.platformPostUrl, analytics: p.analytics }];
      return alvos
        .filter((x) => plataforma === "todas" || x.platform === plataforma)
        .map((x) => {
          const m = x.analytics ?? p.analytics ?? {};
          return {
            clinica_id: cid,
            plataforma: x.platform,
            conta_externa_id: x.accountId ?? conta ?? null,
            conta_usuario: x.accountUsername ?? null,
            externo_id: x.platformPostId || p._id,
            url: x.platformPostUrl ?? p.platformPostUrl ?? null,
            legenda: p.content?.slice(0, 4000) ?? null,
            tipo_midia: p.mediaProductType || p.mediaType || null,
            thumbnail_url: p.thumbnailUrl ?? null,
            publicado_em: p.publishedAt ?? null,
            impressoes: n(m.impressions),
            alcance: n(m.reach),
            visualizacoes: n(m.views),
            curtidas: n(m.likes),
            comentarios: n(m.comments),
            compartilhamentos: n(m.shares),
            salvos: n(m.saves),
            cliques: n(m.clicks),
            taxa_engajamento: typeof m.engagementRate === "number" ? m.engagementRate : null,
            metricas_brutas: m,
            atualizado_em: new Date().toISOString(),
          };
        });
    });

    const soma = (k: "curtidas" | "comentarios" | "alcance" | "visualizacoes" | "salvos" | "compartilhamentos") => linhas.reduce((t, l) => t + l[k], 0);
    const resumo = {
      periodo_desde: de,
      posts_na_zernio: total,
      posts_lidos: linhas.length,
      curtidas: soma("curtidas"),
      comentarios: soma("comentarios"),
      alcance: soma("alcance"),
      visualizacoes: soma("visualizacoes"),
      salvos: soma("salvos"),
      compartilhamentos: soma("compartilhamentos"),
      top3_por_alcance: [...linhas]
        .sort((a, b) => b.alcance - a.alcance)
        .slice(0, 3)
        .map((l) => ({ url: l.url, tipo: l.tipo_midia, publicado_em: l.publicado_em, alcance: l.alcance, curtidas: l.curtidas, comentarios: l.comentarios })),
    };

    if (simular) return NextResponse.json({ ok: true, simulado: true, ...resumo });

    let gravados = 0;
    for (let i = 0; i < linhas.length; i += 200) {
      const lote = linhas.slice(i, i + 200);
      const { error } = await db.from("redes_posts").upsert(lote, { onConflict: "clinica_id,plataforma,externo_id" });
      if (error) return NextResponse.json({ error: `Erro ao gravar: ${error.message}`, gravados }, { status: 500 });
      gravados += lote.length;
    }
    return NextResponse.json({ ok: true, gravados, ...resumo });
  } catch (e) {
    const st = e instanceof ErroZernio ? e.status : 502;
    return NextResponse.json({ error: (e as Error).message }, { status: st >= 400 && st < 600 ? st : 502 });
  }
}
