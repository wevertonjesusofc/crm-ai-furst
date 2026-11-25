"use client";

import { useEffect, useState } from "react";
import { Pencil, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calcularMeta, brl } from "@/lib/meta";

// Meta do mês em destaque, no estilo "portal": o time vê de onde está até onde precisa chegar.
// Faturado = oportunidades ganhas no mês (valor da venda).

function Anel({ pct }: { pct: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(pct, 0), 100);
  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36 -rotate-90" aria-hidden="true">
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-panelmuted" />
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} className="text-accent" />
    </svg>
  );
}

export default function MetaDoMes() {
  const [meta, setMeta] = useState<number | null>(null);
  const [premio, setPremio] = useState("");
  const [faturado, setFaturado] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [editando, setEditando] = useState(false);
  const [rMeta, setRMeta] = useState("");
  const [rPremio, setRPremio] = useState("");

  useEffect(() => {
    (async () => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      const [{ data: cfg }, { data: ganhos }] = await Promise.all([
        supabase.from("sistema_config").select("meta_mensal, premio_meta").eq("id", "default").maybeSingle(),
        supabase.from("deals").select("value").eq("status", "won").gte("updated_at", inicio.toISOString()),
      ]);
      setMeta(Number(cfg?.meta_mensal ?? 0));
      setPremio(cfg?.premio_meta ?? "");
      setFaturado((ganhos ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0));
      setVendas((ganhos ?? []).length);
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(rMeta.replace(/\./g, "").replace(",", ".")) || 0;
    await supabase.from("sistema_config").update({ meta_mensal: valor, premio_meta: rPremio.trim() || null }).eq("id", "default");
    setMeta(valor);
    setPremio(rPremio.trim());
    setEditando(false);
  }

  if (meta === null) return <div className="mx-8 mt-6 h-48 bg-panel border border-border rounded-2xl" />;
  const m = calcularMeta(meta, faturado, vendas);
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });

  if (editando || meta === 0) {
    return (
      <form onSubmit={salvar} className="mx-8 mt-6 bg-panel border border-border rounded-2xl p-6 grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="meta-valor" className="text-xs text-muted">Meta de {mes} (R$)</label>
          <input id="meta-valor" autoFocus value={rMeta} onChange={(e) => setRMeta(e.target.value)} placeholder="60000" className="w-full bg-bg border border-border rounded-md px-3 py-2 text-white mt-1" />
        </div>
        <div>
          <label htmlFor="meta-premio" className="text-xs text-muted">Prêmio do time se bater (opcional)</label>
          <input id="meta-premio" value={rPremio} onChange={(e) => setRPremio(e.target.value)} placeholder="Ex.: jantar com o time" className="w-full bg-bg border border-border rounded-md px-3 py-2 text-white mt-1" />
        </div>
        <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">Salvar meta</button>
      </form>
    );
  }

  return (
    <div className="mx-8 mt-6 bg-panel border border-border rounded-2xl p-6 flex items-center gap-8">
      <div className="relative shrink-0">
        <Anel pct={m.percentual} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-white tabular-nums">{Math.round(m.percentual)}%</span>
          <span className="text-[11px] text-muted">da meta</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-[0.12em] text-muted">Meta de {mes}</span>
          <button onClick={() => { setRMeta(String(meta)); setRPremio(premio); setEditando(true); }} className="text-xs text-muted hover:text-white flex items-center gap-1">
            <Pencil size={11} /> Alterar
          </button>
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-4xl font-semibold text-white tabular-nums">{brl(m.faturado)}</span>
          <span className="text-muted">de {brl(m.meta)}</span>
        </div>
        <div className={`mt-1 text-sm ${m.falta === 0 ? "text-accent" : "text-white"}`}>
          {m.falta === 0 ? "Meta batida." : <>Faltam <b className="tabular-nums">{brl(m.falta)}</b> em {m.restantes} dias úteis · {brl(m.porDiaUtil)} por dia</>}
        </div>

        <div className="grid grid-cols-3 gap-6 mt-5 pt-5 border-t border-border">
          <div>
            <div className="text-[11px] text-muted">Vendas no mês</div>
            <div className="text-lg text-white font-medium tabular-nums">{vendas}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">Ticket médio</div>
            <div className="text-lg text-white font-medium tabular-nums">{m.ticket ? brl(m.ticket) : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">Projeção no ritmo atual</div>
            <div className={`text-lg font-medium tabular-nums ${m.vaiBater ? "text-accent" : "text-amber-300"}`}>{brl(m.projecao)}</div>
          </div>
        </div>
      </div>

      {premio && (
        <div className="shrink-0 w-56 self-stretch rounded-xl bg-accent/10 border border-accent/30 p-4 flex flex-col justify-between">
          <Trophy size={20} className="text-accent" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-accent">Rumo ao prêmio</div>
            <div className="text-white font-medium mt-1 leading-snug">{premio}</div>
            <div className="text-[11px] text-muted mt-1">Se o time bater a meta.</div>
          </div>
        </div>
      )}
    </div>
  );
}
