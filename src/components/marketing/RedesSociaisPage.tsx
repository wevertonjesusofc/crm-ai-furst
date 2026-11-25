"use client";

// Redes sociais com os números de verdade, vindos da Zernio (tabela redes_posts).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Radio, Eye, Heart, PlayCircle, MessageCircle, Bookmark, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  plataforma: string;
  conta_usuario: string | null;
  url: string | null;
  legenda: string | null;
  tipo_midia: string | null;
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
const num = (n: number) => n.toLocaleString("pt-BR");

export default function RedesSociaisPage() {
  const [dias, setDias] = useState(30);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function carregar() {
    const desde = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await supabase
      .from("redes_posts")
      .select("id, plataforma, conta_usuario, url, legenda, tipo_midia, publicado_em, alcance, visualizacoes, curtidas, comentarios, compartilhamentos, salvos")
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

  const doPeriodo = useMemo(() => {
    const corte = Date.now() - dias * 86400000;
    return (posts ?? []).filter((p) => p.publicado_em && new Date(p.publicado_em).getTime() >= corte);
  }, [posts, dias]);

  const soma = (k: keyof Post) => doPeriodo.reduce((s, p) => s + Number(p[k] ?? 0), 0);
  const engaj = soma("curtidas") + soma("comentarios") + soma("compartilhamentos") + soma("salvos");
  const top = [...doPeriodo].sort((a, b) => b.visualizacoes + b.alcance - (a.visualizacoes + a.alcance)).slice(0, 8);
  const contas = [...new Set(doPeriodo.map((p) => `${p.plataforma}${p.conta_usuario ? ` · @${p.conta_usuario}` : ""}`))];

  const cards = [
    { rotulo: "Alcance", valor: soma("alcance"), Icone: Eye },
    { rotulo: "Visualizações", valor: soma("visualizacoes"), Icone: PlayCircle },
    { rotulo: "Engajamento", valor: engaj, Icone: Heart },
    { rotulo: "Comentários", valor: soma("comentarios"), Icone: MessageCircle },
    { rotulo: "Salvos", valor: soma("salvos"), Icone: Bookmark },
  ];

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 mb-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Radio size={20} className="text-accent" /> Redes sociais
          </h1>
          <p className="text-muted text-sm mt-0.5">{contas.length ? contas.join(" · ") : "Pela Zernio"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-md overflow-hidden">
            {PERIODOS.map((p) => (
              <button key={p.dias} onClick={() => setDias(p.dias)} className={`text-xs px-3 py-1.5 ${dias === p.dias ? "bg-panelmuted text-white font-medium" : "text-muted"}`}>
                {p.rotulo}
              </button>
            ))}
          </div>
          <button onClick={sincronizar} disabled={sincronizando} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>
      {aviso && <p className="text-xs text-accent mt-2">{aviso}</p>}

      {posts !== null && posts.length === 0 ? (
        <div className="mt-6 bg-panel border border-border rounded-lg p-6 text-sm text-muted">
          Nenhum post ainda. Conecte a Zernio em <Link href="/conexoes" className="text-accent">Conexões</Link> e clique em Atualizar.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 my-6">
            {cards.map(({ rotulo, valor, Icone }) => (
              <div key={rotulo} className="bg-panel border border-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted mb-1"><Icone size={13} /> {rotulo}</div>
                <div className="text-xl font-semibold text-white tabular-nums">{posts === null ? "…" : num(valor)}</div>
              </div>
            ))}
          </div>
          <div className="text-xs uppercase tracking-[0.12em] text-muted mb-2">Posts que mais entregaram · {doPeriodo.length} posts no período</div>
          <div className="bg-panel border border-border rounded-xl divide-y divide-border">
            {top.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{p.legenda?.split("\n")[0] || "(sem legenda)"}</div>
                  <div className="text-[11px] text-muted">
                    {p.tipo_midia ?? "post"} · {p.publicado_em ? new Date(p.publicado_em).toLocaleDateString("pt-BR") : ""}
                  </div>
                </div>
                <span className="text-xs text-muted tabular-nums w-28 text-right">{num(p.visualizacoes || p.alcance)} views</span>
                <span className="text-xs text-muted tabular-nums w-20 text-right">{num(p.curtidas)} curt.</span>
                <span className="text-xs text-muted tabular-nums w-20 text-right">{num(p.comentarios)} coment.</span>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-muted hover:text-white" aria-label="Abrir post">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
