"use client";

// Tráfego e vendas, no estilo painel de rastreio (tipo UTMify): números do
// período no topo, de onde veio a venda, e a tabela Campanhas › Conjuntos ›
// Anúncios com chave liga/desliga, vendas, CPA, gasto, lucro e o criativo.
// Venda = oportunidade marcada como ganha no funil, do paciente que veio do anúncio.

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Eye, Copy, Play, ImageIcon, Layers, X, ChevronDown, ChevronUp, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/meta";

type Anuncio = {
  id: string;
  plataforma: string;
  externo_id: string;
  nome: string;
  campanha: string | null;
  conjunto: string | null;
  criativo_url: string | null;
  video_url?: string | null;
  formato?: string | null;
  link?: string | null;
  ativo: boolean;
};
type Gasto = { anuncio_id: string; dia: string; gasto: number; impressoes: number; cliques: number; conversas: number; alcance?: number };
type Venda = { value: number | null; updated_at: string; contacts: { anuncio_id: string | null; origem_canal: string | null } | null };
type Metricas = { gasto: number; impressoes: number; cliques: number; conversas: number; leads: number; vendas: number; receita: number };

const PERIODOS = [
  { chave: 1, rotulo: "Hoje" },
  { chave: 7, rotulo: "7 dias" },
  { chave: 30, rotulo: "30 dias" },
  { chave: 90, rotulo: "90 dias" },
  { chave: 3650, rotulo: "Máximo" },
] as const;

const ORIGENS: Record<string, { rotulo: string; cor: string }> = {
  anuncio_meta: { rotulo: "Anúncio Meta", cor: "#C9A96E" },
  anuncio_google: { rotulo: "Anúncio Google", cor: "#E8D5A8" },
  instagram: { rotulo: "Instagram", cor: "#0F7A5A" },
  indicacao: { rotulo: "Indicação", cor: "#3FB68B" },
  google: { rotulo: "Google", cor: "#7FCFB0" },
  whatsapp: { rotulo: "WhatsApp", cor: "#5E8C7A" },
  outro: { rotulo: "Outros", cor: "#4A5A54" },
};

// Regra simples e explicável para o dono.
export function recomendacao(l: { gasto: number; vendas: number; retorno_por_real?: number | null; roas?: number | null }) {
  const roas = l.roas ?? l.retorno_por_real ?? 0;
  if (l.vendas > 0 && roas >= 3) return { rotulo: "Escalar", cor: "text-accent bg-accent/15", icone: TrendingUp };
  if (l.gasto >= 300 && l.vendas === 0) return { rotulo: "Cortar", cor: "text-red-300 bg-red-500/15", icone: TrendingDown };
  return { rotulo: "Observar", cor: "text-amber-300 bg-amber-500/15", icone: Eye };
}

const zero = (): Metricas => ({ gasto: 0, impressoes: 0, cliques: 0, conversas: 0, leads: 0, vendas: 0, receita: 0 });
const div = (a: number, b: number) => (b > 0 ? a / b : null);
const fmtBrl = (v: number | null) => (v === null ? "—" : brl(v));
const fmtX = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}x`);
const fmtPct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

function derivadas(m: Metricas) {
  const lucro = m.receita - m.gasto;
  return {
    lucro,
    roas: div(m.receita, m.gasto),
    roi: div(lucro, m.gasto),
    cpa: div(m.gasto, m.vendas),
    cpl: div(m.gasto, m.leads),
    cpc: div(m.gasto, m.cliques),
    ctr: div(m.cliques, m.impressoes),
    cpm: m.impressoes > 0 ? (m.gasto / m.impressoes) * 1000 : null,
  };
}

type Aba = "campanhas" | "conjuntos" | "anuncios";
type Linha = { chave: string; nome: string; sub: string; ids: string[]; ativo: boolean; m: Metricas; anuncio?: Anuncio };

export default function TrafegoVendasPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [leads, setLeads] = useState<{ anuncio_id: string; created_at: string }[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [dias, setDias] = useState<number>(30);
  const [aba, setAba] = useState<Aba>("campanhas");
  const [selCamp, setSelCamp] = useState<string[]>([]);
  const [selConj, setSelConj] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "pausados">("todos");
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({ col: "gasto", desc: true });
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [atualizado, setAtualizado] = useState<Date | null>(null);
  const [criativo, setCriativo] = useState<Anuncio | null>(null);
  const [chave, setChave] = useState("");
  const [origem, setOrigem] = useState("");
  const [, setTick] = useState(0);

  async function carregar() {
    const [a, g, c, v] = await Promise.all([
      supabase.from("anuncios").select("*").order("created_at"),
      supabase.from("anuncios_gasto").select("*").order("dia"),
      supabase.from("contacts").select("anuncio_id, created_at").not("anuncio_id", "is", null),
      supabase.from("deals").select("value, updated_at, contacts(anuncio_id, origem_canal)").eq("status", "won"),
    ]);
    setAnuncios((a.data as Anuncio[]) ?? []);
    setGastos(((g.data as Gasto[]) ?? []).map((x) => ({ ...x, gasto: Number(x.gasto) })));
    setLeads((c.data as { anuncio_id: string; created_at: string }[]) ?? []);
    setVendas((v.data as unknown as Venda[]) ?? []);
    setAtualizado(new Date());
  }

  useEffect(() => {
    setOrigem(window.location.origin);
    carregar();
    supabase.rpc("current_clinica_id").then(async ({ data: id }) => {
      const { data } = await supabase.from("clinicas").select("chave_entrada_leads").eq("id", id).maybeSingle();
      setChave(data?.chave_entrada_leads ?? "");
    });
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  async function sincronizarMeta() {
    setSincronizando(true);
    setAviso(null);
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/trafego/meta", { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const d = await resp.json().catch(() => ({}));
    setSincronizando(false);
    setAviso(resp.ok ? { ok: true, msg: `Meta atualizada: ${d.anuncios} anúncio(s), ${d.criativos ?? 0} criativo(s).` } : { ok: false, msg: d.error ?? "Não foi possível atualizar." });
    if (resp.ok) carregar();
  }

  async function ligar(ids: string[], ativo: boolean) {
    setAnuncios((xs) => (xs ?? []).map((a) => (ids.includes(a.id) ? { ...a, ativo } : a)));
    const { data: s } = await supabase.auth.getSession();
    const erros: string[] = [];
    for (const id of ids) {
      const r = await fetch("/api/trafego/status", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ id, ativo }) });
      if (!r.ok) erros.push((await r.json().catch(() => ({}))).error ?? "erro");
    }
    if (erros.length) {
      setAviso({ ok: false, msg: erros[0] });
      carregar();
    } else setAviso({ ok: true, msg: ativo ? "Ligado." : "Desligado." });
  }

  // Métricas do período, por anúncio.
  const porAnuncio = useMemo(() => {
    const desde = new Date(Date.now() - (dias === 1 ? 0 : dias) * 86400000);
    desde.setHours(0, 0, 0, 0);
    const desdeDia = desde.toISOString().slice(0, 10);
    const mapa = new Map<string, Metricas>();
    const pega = (id: string) => mapa.get(id) ?? (mapa.set(id, zero()), mapa.get(id)!);
    for (const g of gastos) {
      if (g.dia < desdeDia) continue;
      const m = pega(g.anuncio_id);
      m.gasto += g.gasto;
      m.impressoes += g.impressoes;
      m.cliques += g.cliques;
      m.conversas += g.conversas;
    }
    for (const l of leads) if (new Date(l.created_at) >= desde) pega(l.anuncio_id).leads++;
    for (const v of vendas) {
      const id = v.contacts?.anuncio_id;
      if (!id || new Date(v.updated_at) < desde) continue;
      const m = pega(id);
      m.vendas++;
      m.receita += Number(v.value ?? 0);
    }
    return { mapa, desde };
  }, [gastos, leads, vendas, dias]);

  const total = useMemo(() => {
    const t = zero();
    for (const m of porAnuncio.mapa.values()) (Object.keys(t) as (keyof Metricas)[]).forEach((k) => (t[k] += m[k]));
    return t;
  }, [porAnuncio]);
  const d = derivadas(total);

  // Vendas por origem (todas as vendas do período, não só anúncio).
  const origens = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vendas) {
      if (new Date(v.updated_at) < porAnuncio.desde) continue;
      const o = v.contacts?.anuncio_id ? "anuncio_meta" : v.contacts?.origem_canal ?? "outro";
      const k = ORIGENS[o] ? o : "outro";
      m.set(k, (m.get(k) ?? 0) + Number(v.value ?? 0));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [vendas, porAnuncio]);

  // Linhas da aba atual.
  const linhas: Linha[] = useMemo(() => {
    const lista = anuncios ?? [];
    const soma = (ids: string[]) => {
      const t = zero();
      ids.forEach((id) => {
        const m = porAnuncio.mapa.get(id);
        if (m) (Object.keys(t) as (keyof Metricas)[]).forEach((k) => (t[k] += m[k]));
      });
      return t;
    };
    let base: Linha[];
    if (aba === "campanhas") {
      const grupos = new Map<string, Anuncio[]>();
      lista.forEach((a) => grupos.set(a.campanha ?? "Sem campanha", [...(grupos.get(a.campanha ?? "Sem campanha") ?? []), a]));
      base = [...grupos.entries()].map(([nome, as]) => ({ chave: nome, nome, sub: `${as.length} anúncio(s) · ${as[0].plataforma === "google" ? "Google" : "Meta"}`, ids: as.map((a) => a.id), ativo: as.some((a) => a.ativo), m: soma(as.map((a) => a.id)) }));
    } else if (aba === "conjuntos") {
      const grupos = new Map<string, Anuncio[]>();
      lista.filter((a) => !selCamp.length || selCamp.includes(a.campanha ?? "Sem campanha")).forEach((a) => {
        const k = `${a.campanha ?? "Sem campanha"}§${a.conjunto ?? "Sem conjunto"}`;
        grupos.set(k, [...(grupos.get(k) ?? []), a]);
      });
      base = [...grupos.entries()].map(([k, as]) => ({ chave: k, nome: as[0].conjunto ?? "Sem conjunto", sub: as[0].campanha ?? "Sem campanha", ids: as.map((a) => a.id), ativo: as.some((a) => a.ativo), m: soma(as.map((a) => a.id)) }));
    } else {
      base = lista
        .filter((a) => !selCamp.length || selCamp.includes(a.campanha ?? "Sem campanha"))
        .filter((a) => !selConj.length || selConj.includes(`${a.campanha ?? "Sem campanha"}§${a.conjunto ?? "Sem conjunto"}`))
        .map((a) => ({ chave: a.id, nome: a.nome, sub: [a.campanha, a.conjunto].filter(Boolean).join(" · "), ids: [a.id], ativo: a.ativo, m: soma([a.id]), anuncio: a }));
    }
    const t = busca.trim().toLowerCase();
    base = base.filter((l) => (!t || `${l.nome} ${l.sub}`.toLowerCase().includes(t)) && (filtroStatus === "todos" || (filtroStatus === "ativos" ? l.ativo : !l.ativo)));
    const valor = (l: Linha): number => {
      const x = derivadas(l.m) as Record<string, number | null>;
      const v = ordem.col in l.m ? l.m[ordem.col as keyof Metricas] : x[ordem.col];
      return v ?? -Infinity;
    };
    return base.sort((a, b) => (ordem.desc ? valor(b) - valor(a) : valor(a) - valor(b)));
  }, [anuncios, porAnuncio, aba, selCamp, selConj, busca, filtroStatus, ordem]);

  const totalLinhas = useMemo(() => {
    const t = zero();
    linhas.forEach((l) => (Object.keys(t) as (keyof Metricas)[]).forEach((k) => (t[k] += l.m[k])));
    return t;
  }, [linhas]);

  const selecionados = aba === "campanhas" ? selCamp : aba === "conjuntos" ? selConj : [];
  function marcar(chave: string) {
    if (aba === "campanhas") setSelCamp((xs) => (xs.includes(chave) ? xs.filter((x) => x !== chave) : [...xs, chave]));
    if (aba === "conjuntos") setSelConj((xs) => (xs.includes(chave) ? xs.filter((x) => x !== chave) : [...xs, chave]));
  }

  const minutos = atualizado ? Math.floor((Date.now() - atualizado.getTime()) / 60000) : null;
  const exemplo = `curl -X POST ${origem}/api/rastreio/lead \\
  -H "content-type: application/json" -H "x-chave-clinica: ${chave || "lead_..."}" \\
  -d '{"nome":"Maria","whatsapp":"5562999999999","anuncio":{"plataforma":"meta","id":"ID_DO_ANUNCIO","nome":"Vídeo botox 1"},"mensagem":"Oi, quanto custa o botox?"}'`;

  const COLS: { col: string; rotulo: string; v: (l: Linha) => React.ReactNode; dica?: string }[] = [
    { col: "vendas", rotulo: "Vendas", v: (l) => l.m.vendas },
    { col: "cpa", rotulo: "CPA", dica: "Custo por venda", v: (l) => fmtBrl(derivadas(l.m).cpa) },
    { col: "gasto", rotulo: "Gastos", v: (l) => brl(l.m.gasto) },
    { col: "receita", rotulo: "Faturamento", v: (l) => brl(l.m.receita) },
    {
      col: "lucro",
      rotulo: "Lucro",
      v: (l) => {
        const lu = derivadas(l.m).lucro;
        return <span className={lu > 0 ? "text-emerald-300 font-medium" : lu < 0 ? "text-red-300 font-medium" : ""}>{brl(lu)}</span>;
      },
    },
    { col: "roas", rotulo: "ROAS", dica: "Faturamento ÷ gasto", v: (l) => fmtX(derivadas(l.m).roas) },
    { col: "leads", rotulo: "Pacientes", dica: "Leads que chegaram no sistema", v: (l) => l.m.leads },
    { col: "cpl", rotulo: "CPL", dica: "Custo por paciente que chegou", v: (l) => fmtBrl(derivadas(l.m).cpl) },
    { col: "conversas", rotulo: "Conversas", dica: "Conversas iniciadas na Meta", v: (l) => l.m.conversas },
    { col: "cpc", rotulo: "CPC", dica: "Custo por clique", v: (l) => fmtBrl(derivadas(l.m).cpc) },
    { col: "ctr", rotulo: "CTR", dica: "Cliques ÷ impressões", v: (l) => fmtPct(derivadas(l.m).ctr) },
    { col: "cpm", rotulo: "CPM", dica: "Custo por mil impressões", v: (l) => fmtBrl(derivadas(l.m).cpm) },
  ];

  const cards: { r: string; v: string; dica: string; cor?: string }[] = [
    { r: "Faturamento", v: brl(total.receita), dica: "Vendas de pacientes vindos de anúncio" },
    { r: "Gastos com anúncios", v: brl(total.gasto), dica: "Investido no período" },
    { r: "ROAS", v: fmtX(d.roas), dica: "Cada R$ 1 voltou quanto" },
    { r: "Lucro", v: brl(d.lucro), dica: "Faturamento − gasto", cor: d.lucro >= 0 ? "text-emerald-300" : "text-red-300" },
  ];
  const cards2: { r: string; v: string; dica: string }[] = [
    { r: "CPA", v: fmtBrl(d.cpa), dica: "custo por venda" },
    { r: "CAC", v: fmtBrl(d.cpa), dica: "custo por paciente que comprou" },
    { r: "CPL", v: fmtBrl(d.cpl), dica: "custo por paciente que chegou" },
    { r: "CPC", v: fmtBrl(d.cpc), dica: "custo por clique" },
    { r: "CTR", v: fmtPct(d.ctr), dica: "cliques ÷ impressões" },
    { r: "ROI", v: d.roi === null ? "—" : `${(d.roi * 100).toFixed(0)}%`, dica: "lucro ÷ gasto" },
  ];

  const totalOrigens = origens.reduce((s, [, v]) => s + v, 0);
  let acumulado = 0;

  return (
    <div className="mx-8 pt-8 pb-10">
      <span className="text-xs text-accent uppercase tracking-wide font-medium">Marketing</span>
      <div className="flex items-end justify-between gap-4 mt-1 mb-1 flex-wrap">
        <h1 className="text-3xl font-semibold text-white">Tráfego e vendas</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-full p-1">
            {PERIODOS.map((p) => (
              <button key={p.chave} onClick={() => setDias(p.chave)} className={`text-xs px-3 py-1.5 rounded-full ${dias === p.chave ? "bg-accent text-bg font-medium" : "text-muted hover:text-white"}`}>
                {p.rotulo}
              </button>
            ))}
          </div>
          <button onClick={sincronizarMeta} disabled={sincronizando} className="flex items-center gap-1.5 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-full disabled:opacity-60">
            <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>
      <p className="text-muted text-sm mb-5">
        Quanto cada anúncio gastou, quantos pacientes trouxe e quanto virou venda.
        {minutos !== null && <span className="text-[11px]"> · Atualizado {minutos === 0 ? "agora" : `há ${minutos} min`}</span>}
      </p>
      {aviso && <div className={`mb-4 text-xs rounded-lg px-3 py-2 border ${aviso.ok ? "text-accent bg-accent/10 border-accent/30" : "text-red-300 bg-red-500/10 border-red-500/30"}`}>{aviso.msg}</div>}

      {/* Números do período */}
      <div className="grid grid-cols-[1fr_320px] gap-3">
        <div className="grid grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.r} title={c.dica} className="bg-panel border border-border rounded-2xl p-4">
              <div className="text-[11px] text-muted">{c.r}</div>
              <div className={`text-2xl font-semibold tabular-nums mt-1 ${c.cor ?? "text-white"}`}>{anuncios ? c.v : "…"}</div>
            </div>
          ))}
          <div className="col-span-4 grid grid-cols-6 gap-3">
            {cards2.map((c) => (
              <div key={c.r} title={c.dica} className="bg-panel/60 border border-border rounded-2xl px-4 py-3">
                <div className="text-[11px] text-muted">{c.r}</div>
                <div className="text-lg text-white font-semibold tabular-nums">{anuncios ? c.v : "…"}</div>
                <div className="text-[10px] text-muted/80 truncate">{c.dica}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-4">
          <div className="text-[11px] text-muted mb-2">De onde veio o faturamento</div>
          {totalOrigens === 0 ? (
            <p className="text-xs text-muted mt-8 text-center">Nenhuma venda no período.</p>
          ) : (
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 42 42" className="w-32 h-32 -rotate-90 shrink-0">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6" />
                {origens.map(([k, v]) => {
                  const p = (v / totalOrigens) * 100;
                  const el = <circle key={k} cx="21" cy="21" r="15.9" fill="none" stroke={ORIGENS[k].cor} strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acumulado} />;
                  acumulado += p;
                  return el;
                })}
              </svg>
              <div className="space-y-1.5 min-w-0 flex-1">
                {origens.map(([k, v]) => (
                  <div key={k} className="text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ORIGENS[k].cor }} />
                    <span className="text-white truncate">{ORIGENS[k].rotulo}</span>
                    <span className="text-muted tabular-nums ml-auto pl-2">{Math.round((v / totalOrigens) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campanhas › Conjuntos › Anúncios */}
      <div className="mt-6 bg-panel border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center border-b border-border">
          {(
            [
              ["campanhas", "Campanhas", ""],
              ["conjuntos", "Conjuntos", selCamp.length ? `para ${selCamp.length} campanha(s)` : ""],
              ["anuncios", "Anúncios", selConj.length ? `para ${selConj.length} conjunto(s)` : selCamp.length ? `para ${selCamp.length} campanha(s)` : ""],
            ] as [Aba, string, string][]
          ).map(([k, r, sub]) => (
            <button key={k} onClick={() => setAba(k)} className={`flex-1 px-4 py-3 text-sm flex items-center justify-center gap-2 border-b-2 ${aba === k ? "border-accent text-white font-medium bg-accent/5" : "border-transparent text-muted hover:text-white"}`}>
              {r} {sub && <span className="text-[10px] bg-accent/20 text-accent rounded-full px-2 py-0.5">{sub}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 px-4 py-3 border-b border-border flex-wrap">
          <label className="text-[11px] text-muted">
            Nome
            <div className="relative mt-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por nome" className="bg-bg/60 border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-white w-52 focus:outline-none focus:border-accent" />
            </div>
          </label>
          <label className="text-[11px] text-muted">
            Status
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)} className="block mt-1 bg-bg/60 border border-border rounded-lg px-2 py-1.5 text-xs text-white">
              <option value="todos">Qualquer</option>
              <option value="ativos">Ligados</option>
              <option value="pausados">Desligados</option>
            </select>
          </label>
          {(selCamp.length > 0 || selConj.length > 0) && (
            <button onClick={() => { setSelCamp([]); setSelConj([]); }} className="text-[11px] text-muted hover:text-white flex items-center gap-1 pb-1.5"><X size={11} /> Limpar seleção</button>
          )}
          <span className="text-[11px] text-muted ml-auto pb-1.5">{aba !== "anuncios" ? "Marque para ver os conjuntos e anúncios só dela" : "Clique no criativo para ver o vídeo"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-muted uppercase tracking-wide border-b border-border bg-bg/30">
                {aba !== "anuncios" && <th className="pl-4 py-3 w-8" />}
                <th className="px-3 py-3 w-14">Status</th>
                <th className="px-3 py-3 min-w-[260px]">{aba === "campanhas" ? "Campanha" : aba === "conjuntos" ? "Conjunto" : "Anúncio"}</th>
                {COLS.map((c) => (
                  <th key={c.col} title={c.dica} className="px-3 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setOrdem((o) => ({ col: c.col, desc: o.col === c.col ? !o.desc : true }))} className="inline-flex items-center gap-0.5 hover:text-white uppercase">
                      {c.rotulo} {ordem.col === c.col && (ordem.desc ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3">O que fazer</th>
              </tr>
            </thead>
            <tbody>
              {anuncios === null && <tr><td colSpan={20} className="px-4 py-6 text-muted">Carregando…</td></tr>}
              {anuncios?.length === 0 && <tr><td colSpan={20} className="px-4 py-6 text-muted">Nenhum anúncio ainda. Conecte a Meta em Conexões e clique em Atualizar.</td></tr>}
              {linhas.map((l) => {
                const r = recomendacao({ gasto: l.m.gasto, vendas: l.m.vendas, roas: derivadas(l.m).roas });
                const Icone = r.icone;
                const a = l.anuncio;
                return (
                  <tr key={l.chave} className={`border-b border-border last:border-0 hover:bg-white/[.02] ${selecionados.includes(l.chave) ? "bg-accent/5" : ""}`}>
                    {aba !== "anuncios" && (
                      <td className="pl-4">
                        <input type="checkbox" aria-label={`Selecionar ${l.nome}`} checked={selecionados.includes(l.chave)} onChange={() => marcar(l.chave)} className="accent-[#C9A96E]" />
                      </td>
                    )}
                    <td className="px-3">
                      <button
                        role="switch"
                        aria-checked={l.ativo}
                        aria-label={`${l.ativo ? "Desligar" : "Ligar"} ${l.nome}`}
                        onClick={() => ligar(l.ids, !l.ativo)}
                        className={`relative w-10 h-5 rounded-full transition ${l.ativo ? "bg-accent" : "bg-white/15"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${l.ativo ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {a && (
                          <button onClick={() => setCriativo(a)} aria-label={`Ver criativo ${a.nome}`} className="relative w-11 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-accent/25 to-esmeralda/30 shrink-0 group">
                            {a.criativo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.criativo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-white/70">{a.formato === "carrossel" ? <Layers size={16} /> : a.formato === "imagem" ? <ImageIcon size={16} /> : <Play size={16} />}</span>
                            )}
                            {(a.formato === "video" || a.video_url) && <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40"><Play size={14} className="text-white" fill="white" /></span>}
                          </button>
                        )}
                        <div className="min-w-0">
                          <div className="text-white flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${l.ativo ? "bg-emerald-400" : "bg-white/30"}`} />
                            <span className="truncate max-w-[280px]">{l.nome}</span>
                          </div>
                          <div className="text-[11px] text-muted truncate max-w-[300px]">{l.sub}</div>
                        </div>
                      </div>
                    </td>
                    {COLS.map((c) => (
                      <td key={c.col} className="px-3 text-right tabular-nums whitespace-nowrap text-white/90">{c.v(l)}</td>
                    ))}
                    <td className="px-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${r.cor}`}><Icone size={12} /> {r.rotulo}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr className="bg-bg/40 text-[12px] font-semibold text-white border-t border-border">
                  {aba !== "anuncios" && <td />}
                  <td className="px-3 py-3 text-muted text-[10px] uppercase">Total</td>
                  <td className="px-3 py-3 text-muted text-[11px]">{linhas.length} {aba}</td>
                  {COLS.map((c) => (
                    <td key={c.col} className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{c.v({ chave: "t", nome: "", sub: "", ids: [], ativo: true, m: totalLinhas })}</td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-2">
        Venda conta quando a oportunidade do paciente que veio do anúncio é marcada como <b className="text-white">Ganho</b> no funil. Escalar: trouxe venda e ROAS de 3x ou mais. Cortar: gastou R$ 300 ou mais sem venda.
      </p>

      {criativo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setCriativo(null)}>
          <div className="bg-panel border border-border rounded-2xl overflow-hidden flex max-h-[90vh] max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-[360px] shrink-0 bg-black flex items-center justify-center">
              {criativo.video_url ? (
                <video src={criativo.video_url} poster={criativo.criativo_url ?? undefined} controls autoPlay playsInline className="max-h-[86vh] w-full" />
              ) : criativo.criativo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={criativo.criativo_url} alt="" className="max-h-[86vh] w-full object-contain" />
              ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-muted text-sm gap-2 px-6 text-center">
                  <Play size={28} /> O vídeo aparece aqui depois de conectar a Meta e clicar em Atualizar.
                </div>
              )}
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="text-white font-semibold">{criativo.nome}</div>
                  <div className="text-[11px] text-muted">{[criativo.campanha, criativo.conjunto].filter(Boolean).join(" · ")}</div>
                </div>
                <button onClick={() => setCriativo(null)} aria-label="Fechar" className="text-muted hover:text-white"><X size={18} /></button>
              </div>
              {(() => {
                const m = porAnuncio.mapa.get(criativo.id) ?? zero();
                const x = derivadas(m);
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Gasto", brl(m.gasto)],
                      ["Faturamento", brl(m.receita)],
                      ["Lucro", brl(x.lucro)],
                      ["ROAS", fmtX(x.roas)],
                      ["Vendas", String(m.vendas)],
                      ["CPA", fmtBrl(x.cpa)],
                      ["Pacientes", String(m.leads)],
                      ["CPL", fmtBrl(x.cpl)],
                      ["CPC", fmtBrl(x.cpc)],
                      ["CTR", fmtPct(x.ctr)],
                    ].map(([r, v]) => (
                      <div key={r} className="rounded-lg bg-panelmuted px-3 py-2">
                        <div className="text-[10px] text-muted">{r}</div>
                        <div className="text-sm text-white font-semibold tabular-nums">{v}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {criativo.link && (
                <a href={criativo.link} target="_blank" rel="noreferrer" className="text-[11px] text-muted hover:text-white inline-flex items-center gap-1"><ExternalLink size={11} /> Ver no Instagram</a>
              )}
            </div>
          </div>
        </div>
      )}

      <details className="mt-8 bg-panel border border-border rounded-2xl p-4">
        <summary className="text-white font-medium cursor-pointer">Entrada de leads com origem (site, WhatsApp, Make, n8n)</summary>
        <p className="text-muted text-xs my-3">O paciente entra já marcado com a origem e o anúncio. É isso que liga o gasto à venda.</p>
        <pre className="text-[11px] text-accent whitespace-pre-wrap break-all bg-bg rounded p-3">{exemplo}</pre>
        <button onClick={() => navigator.clipboard?.writeText(exemplo).catch(() => {})} className="mt-2 flex items-center gap-1.5 text-xs text-muted hover:text-white">
          <Copy size={12} /> Copiar exemplo
        </button>
        <p className="text-[11px] text-muted mt-2">A chave é desta clínica. Não publique em lugar aberto.</p>
      </details>
    </div>
  );
}
