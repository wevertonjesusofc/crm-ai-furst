"use client";

// Redes sociais com os números de verdade, vindos da Zernio (tabela redes_posts).
// Visual: o que está crescendo, qual formato entrega mais e os posts em cards.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Radio, Eye, Heart, PlayCircle, MessageCircle, Bookmark, Share2, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  plataforma: string;
  conta_usuario: string | null;
  url: string | null;
  legenda: string | null;
  tipo_midia: string | null;
  thumbnail_url: string | null;
  publicado_em: string | null;
  alcance: number;
  visualizacoes: number;
  curtidas: number;
  comentarios: number;
  compartilhamentos: number;
  salvos: number;
};

const PERIODOS = [
  { rotulo: "7 dias", dias: 7 },
  { rotulo: "30 dias", dias: 30 },
  { rotulo: "90 dias", dias: 90 },
];
const ORDENS = [
  { chave: "visualizacoes", rotulo: "Mais vistos" },
  { chave: "salvos", rotulo: "Mais salvos" },
  { chave: "compartilhamentos", rotulo: "Mais enviados" },
  { chave: "publicado_em", rotulo: "Mais recentes" },
] as const;

const curto = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} mil` : String(n);
const vistas = (p: Post) => p.visualizacoes || p.alcance;
const formato = (t: string | null) => {
  const x = (t ?? "").toLowerCase();
  if (x.includes("carousel") || x.includes("carrossel")) return "Carrossel";
  if (x.includes("video") || x.includes("reel")) return "Reels";
  if (x.includes("image") || x.includes("photo")) return "Foto";
  return "Post";
};

export default function RedesSociaisPage() {
  const [dias, setDias] = useState(30);
  const [ordem, setOrdem] = useState<(typeof ORDENS)[number]["chave"]>("visualizacoes");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function carregar() {
    const desde = new Date(Date.now() - 180 * 86400000).toISOString();
    const { data } = await supabase
      .from("redes_posts")
      .select("id, plataforma, conta_usuario, url, legenda, tipo_midia, thumbnail_url, publicado_em, alcance, visualizacoes, curtidas, comentarios, compartilhamentos, salvos")
      .gte("publicado_em", desde)
      .order("publicado_em", { ascending: false })
      .limit(1000);
    setPosts((data as Post[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function sincronizar() {
    setSincronizando(true);
    setAviso("");
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/zernio/metricas", { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const d = await resp.json().catch(() => ({}));
    setSincronizando(false);
    setAviso(resp.ok ? `Atualizado: ${d.gravados ?? 0} posts.` : d.error ?? "Não foi possível atualizar.");
    if (resp.ok) carregar();
  }

  const agora = Date.now();
  const noPeriodo = (p: Post, ini: number, fim: number) => p.publicado_em && new Date(p.publicado_em).getTime() >= ini && new Date(p.publicado_em).getTime() < fim;
  const atual = useMemo(() => (posts ?? []).filter((p) => noPeriodo(p, agora - dias * 86400000, agora + 1)), [posts, dias]); // eslint-disable-line react-hooks/exhaustive-deps
  const anterior = useMemo(() => (posts ?? []).filter((p) => noPeriodo(p, agora - 2 * dias * 86400000, agora - dias * 86400000)), [posts, dias]); // eslint-disable-line react-hooks/exhaustive-deps

  const soma = (xs: Post[], f: (p: Post) => number) => xs.reduce((s, p) => s + f(p), 0);
  const variacao = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const kpis = [
    { rotulo: "Visualizações", Icone: PlayCircle, f: (p: Post) => vistas(p) },
    { rotulo: "Curtidas", Icone: Heart, f: (p: Post) => p.curtidas },
    { rotulo: "Comentários", Icone: MessageCircle, f: (p: Post) => p.comentarios },
    { rotulo: "Salvos", Icone: Bookmark, f: (p: Post) => p.salvos },
    { rotulo: "Envios", Icone: Share2, f: (p: Post) => p.compartilhamentos },
  ].map((k) => ({ ...k, valor: soma(atual, k.f), delta: variacao(soma(atual, k.f), soma(anterior, k.f)) }));

  // Visualizações por semana (últimas 12)
  const semanas = useMemo(() => {
    const out: { rotulo: string; v: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const fim = agora - i * 7 * 86400000;
      const ini = fim - 7 * 86400000;
      const v = soma((posts ?? []).filter((p) => noPeriodo(p, ini, fim)), vistas);
      out.push({ rotulo: new Date(ini).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), v });
    }
    return out;
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxSemana = Math.max(1, ...semanas.map((s) => s.v));

  // Qual formato entrega mais (média de visualizações por post)
  const formatos = useMemo(() => {
    const m = new Map<string, { n: number; v: number }>();
    for (const p of atual) {
      const k = formato(p.tipo_midia);
      const x = m.get(k) ?? { n: 0, v: 0 };
      m.set(k, { n: x.n + 1, v: x.v + vistas(p) });
    }
    return [...m.entries()].map(([k, x]) => ({ formato: k, posts: x.n, media: Math.round(x.v / x.n) })).sort((a, b) => b.media - a.media);
  }, [atual]);
  const maxFormato = Math.max(1, ...formatos.map((f) => f.media));

  const ordenados = [...atual].sort((a, b) =>
    ordem === "publicado_em" ? (b.publicado_em ?? "").localeCompare(a.publicado_em ?? "") : ordem === "visualizacoes" ? vistas(b) - vistas(a) : Number(b[ordem]) - Number(a[ordem])
  );
  const conta = atual.find((p) => p.conta_usuario)?.conta_usuario;

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Radio size={20} className="text-accent" /> Redes sociais
          </h1>
          <p className="text-muted text-sm mt-0.5">{conta ? `Instagram · @${conta}` : "Pela Zernio"} · {atual.length} posts em {dias} dias</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-full overflow-hidden">
            {PERIODOS.map((p) => (
              <button key={p.dias} onClick={() => setDias(p.dias)} className={`text-xs px-3 py-1.5 ${dias === p.dias ? "bg-accent text-bg font-medium" : "text-muted"}`}>
                {p.rotulo}
              </button>
            ))}
          </div>
          <button onClick={sincronizar} disabled={sincronizando} className="border border-border text-white text-sm px-3 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={13} className={sincronizando ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>
      {aviso && <p className="text-xs text-accent mt-2">{aviso}</p>}

      {posts !== null && posts.length === 0 ? (
        <div className="mt-6 bg-panel border border-border rounded-2xl p-6 text-sm text-muted">
          Nenhum post ainda. Conecte a Zernio em <Link href="/conexoes" className="text-accent">Conexões</Link> e clique em Atualizar.
        </div>
      ) : (
        <>
          {/* Números do período, comparando com o período anterior */}
          <div className="grid grid-cols-5 gap-3 mt-6">
            {kpis.map(({ rotulo, Icone, valor, delta }) => (
              <div key={rotulo} className="bg-panel border border-border rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted"><Icone size={13} /> {rotulo}</div>
                <div className="text-2xl font-semibold text-white tabular-nums mt-1">{posts === null ? "…" : curto(valor)}</div>
                {delta !== null && (
                  <div className={`text-[11px] mt-1 flex items-center gap-1 ${delta >= 0 ? "text-accent" : "text-red-300"}`}>
                    {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {delta >= 0 ? "+" : ""}{delta}% vs. {dias} dias antes
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* O que está crescendo */}
          <div className="grid grid-cols-[2fr_1fr] gap-3 mt-3">
            <div className="bg-panel border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.12em] text-muted mb-4">Visualizações por semana</div>
              <div className="flex items-end gap-2 h-36">
                {semanas.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] text-muted tabular-nums">{s.v ? curto(s.v) : ""}</span>
                    <div className={`w-full rounded-t-md ${i === semanas.length - 1 ? "bg-accent" : "bg-accent/35"}`} style={{ height: `${Math.max((s.v / maxSemana) * 100, s.v ? 4 : 1)}%` }} />
                    <span className="text-[10px] text-muted">{s.rotulo}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-panel border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.12em] text-muted mb-4">Qual formato entrega mais</div>
              <div className="space-y-3">
                {formatos.map((f) => (
                  <div key={f.formato}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white">{f.formato} <span className="text-muted">· {f.posts} posts</span></span>
                      <span className="text-white tabular-nums">{curto(f.media)} por post</span>
                    </div>
                    <div className="h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(f.media / maxFormato) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {!formatos.length && <p className="text-xs text-muted">Sem posts no período.</p>}
              </div>
            </div>
          </div>

          {/* Posts em cards */}
          <div className="flex items-center justify-between mt-8 mb-3">
            <div className="text-xs uppercase tracking-[0.12em] text-muted">Posts</div>
            <div className="flex gap-1.5">
              {ORDENS.map((o) => (
                <button key={o.chave} onClick={() => setOrdem(o.chave)} className={`text-xs px-3 py-1.5 rounded-full border ${ordem === o.chave ? "bg-accent text-bg border-accent font-medium" : "border-border text-muted hover:text-white"}`}>
                  {o.rotulo}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {ordenados.slice(0, 40).map((p) => (
              <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noreferrer" className="group bg-panel border border-border rounded-2xl overflow-hidden hover:border-accent/60 transition">
                <div className="aspect-[4/5] bg-panelmuted relative overflow-hidden">
                  {p.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted"><ImageIcon size={28} /></div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/60 text-white rounded-full px-2 py-0.5">{formato(p.tipo_midia)}</span>
                  <span className="absolute bottom-2 left-2 text-xs font-semibold bg-black/60 text-white rounded-full px-2 py-0.5 flex items-center gap-1"><Eye size={11} /> {curto(vistas(p))}</span>
                </div>
                <div className="p-3">
                  <p className="text-sm text-white line-clamp-2 min-h-[2.5rem]">{p.legenda?.split("\n")[0] || "(sem legenda)"}</p>
                  <div className="grid grid-cols-4 gap-1 mt-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Heart size={11} /> {curto(p.curtidas)}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {curto(p.comentarios)}</span>
                    <span className="flex items-center gap-1"><Bookmark size={11} /> {curto(p.salvos)}</span>
                    <span className="flex items-center gap-1"><Share2 size={11} /> {curto(p.compartilhamentos)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted">
                    <span>{p.publicado_em ? new Date(p.publicado_em).toLocaleDateString("pt-BR") : ""}</span>
                    <ExternalLink size={11} className="opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
