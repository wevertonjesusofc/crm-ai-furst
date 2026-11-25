"use client";

import { useEffect, useState } from "react";
import { Target, TrendingUp, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calcularMeta, brl } from "@/lib/meta";

// Faixa da meta do mês no topo do Dashboard: o time vê quanto falta.
// Faturado = oportunidades ganhas no mês (valor da venda).

export default function MetaDoMes() {
  const [meta, setMeta] = useState<number | null>(null);
  const [faturado, setFaturado] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");

  useEffect(() => {
    (async () => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      const [{ data: cfg }, { data: ganhos }] = await Promise.all([
        supabase.from("sistema_config").select("meta_mensal").eq("id", "default").maybeSingle(),
        supabase.from("deals").select("value").eq("status", "won").gte("updated_at", inicio.toISOString()),
      ]);
      setMeta(Number(cfg?.meta_mensal ?? 0));
      setFaturado((ganhos ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0));
      setVendas((ganhos ?? []).length);
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(rascunho.replace(/\./g, "").replace(",", ".")) || 0;
    await supabase.from("sistema_config").update({ meta_mensal: valor }).eq("id", "default");
    setMeta(valor);
    setEditando(false);
  }

  if (meta === null) return null;
  const m = calcularMeta(meta, faturado, vendas);
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="mx-8 mt-6 bg-panel border border-border rounded-lg p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-white font-medium flex items-center gap-2">
          <Target size={16} className="text-accent" /> Meta de {mes}
        </h2>
        {editando ? (
          <form onSubmit={salvar} className="flex items-center gap-2">
            <label htmlFor="meta-valor" className="text-xs text-muted">R$</label>
            <input id="meta-valor" autoFocus value={rascunho} onChange={(e) => setRascunho(e.target.value)} className="bg-bg border border-border rounded px-2 py-1 text-sm text-white w-32" />
            <button type="submit" className="bg-accent text-bg text-xs font-medium px-3 py-1.5 rounded">Salvar</button>
          </form>
        ) : (
          <button onClick={() => { setRascunho(meta ? String(meta) : ""); setEditando(true); }} className="text-xs text-muted hover:text-white flex items-center gap-1">
            <Pencil size={12} /> {meta ? "Alterar meta" : "Definir meta do mês"}
          </button>
        )}
      </div>

      {meta === 0 ? (
        <p className="text-muted text-sm">Defina a meta do mês para o time acompanhar quanto falta.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4 mb-2">
            <div>
              <div className="text-3xl font-semibold text-white tabular-nums">{brl(m.faturado)}</div>
              <div className="text-xs text-muted">de {brl(m.meta)} · {m.percentual.toFixed(0)}%</div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-semibold tabular-nums ${m.falta === 0 ? "text-accent" : "text-amber-300"}`}>
                {m.falta === 0 ? "Meta batida" : `Faltam ${brl(m.falta)}`}
              </div>
              <div className="text-xs text-muted">{m.restantes} dia(s) útil(eis) restante(s)</div>
            </div>
          </div>
          <div className="h-3 bg-bg rounded-full overflow-hidden mb-4" role="progressbar" aria-valuenow={Math.round(m.percentual)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(m.percentual, 100)}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-panelmuted rounded-md p-3">
              <div className="text-[11px] text-muted">Precisa vender por dia útil</div>
              <div className="text-white font-medium tabular-nums">{brl(m.porDiaUtil)}</div>
            </div>
            <div className="bg-panelmuted rounded-md p-3">
              <div className="text-[11px] text-muted">Vendas que faltam (no ticket atual)</div>
              <div className="text-white font-medium tabular-nums">{m.vendasQueFaltam ?? "—"}</div>
            </div>
            <div className="bg-panelmuted rounded-md p-3">
              <div className="text-[11px] text-muted">Ticket médio do mês</div>
              <div className="text-white font-medium tabular-nums">{m.ticket ? brl(m.ticket) : "—"}</div>
            </div>
            <div className="bg-panelmuted rounded-md p-3">
              <div className="text-[11px] text-muted flex items-center gap-1"><TrendingUp size={11} /> Projeção no ritmo atual</div>
              <div className={`font-medium tabular-nums ${m.vaiBater ? "text-accent" : "text-amber-300"}`}>{brl(m.projecao)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
