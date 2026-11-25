"use client";

import { useEffect, useState, useCallback } from "react";
import { Percent, DollarSign, Clock, CheckCircle2, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Regra = { id: string; nome: string; percentual: number };
type Deal = { id: string; title: string; value: number | null; contacts: { name: string } | null };

function fmtMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function ComissoesPanel() {
  const [regra, setRegra] = useState<Regra | null>(null);
  const [percentual, setPercentual] = useState("10");
  const [deals, setDeals] = useState<Deal[]>([]);

  const load = useCallback(async () => {
    const [{ data: regras }, { data: dealsData }] = await Promise.all([
      supabase.from("comissao_regras").select("*").order("created_at").limit(1),
      supabase.from("deals").select("id, title, value, contacts(name)").eq("status", "won"),
    ]);
    const r = (regras as Regra[] | null)?.[0] ?? null;
    setRegra(r);
    if (r) setPercentual(String(r.percentual));
    setDeals((dealsData as unknown as Deal[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salvarRegra() {
    const pct = Number(percentual) || 0;
    if (regra) {
      await supabase.from("comissao_regras").update({ percentual: pct }).eq("id", regra.id);
    } else {
      await supabase.from("comissao_regras").insert({ nome: "Regra padrão", percentual: pct });
    }
    load();
  }

  const pct = regra?.percentual ?? 0;
  const totalGanho = deals.reduce((s, d) => s + ((d.value ?? 0) * pct) / 100, 0);

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Comissões</h2>
      <p className="text-muted text-sm mb-4">Defina o percentual de comissão sobre vendas ganhas. O cálculo é automático a partir do Funil de vendas.</p>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5">
            <DollarSign size={12} /> Total Ganho
          </div>
          <div className="text-lg font-semibold text-accent">{fmtMoney(totalGanho)}</div>
          <div className="text-[10px] text-muted">{deals.length} deals ganhos</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5">
            <Clock size={12} /> Pendente
          </div>
          <div className="text-lg font-semibold text-amber-400">{fmtMoney(totalGanho)}</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5">
            <CheckCircle2 size={12} /> Aprovado
          </div>
          <div className="text-lg font-semibold text-blue-400">R$ 0,00</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5">
            <Wallet size={12} /> Pago
          </div>
          <div className="text-lg font-semibold text-white">R$ 0,00</div>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-1.5">
          <Percent size={14} className="text-accent" /> Regra de comissionamento
        </h3>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[11px] text-muted">Percentual sobre venda ganha</label>
            <input type="number" value={percentual} onChange={(e) => setPercentual(e.target.value)} className="w-32 bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
          </div>
          <button onClick={salvarRegra} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
            Salvar
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white text-sm font-medium mb-3">Comissões calculadas</h3>
        {deals.length === 0 ? (
          <div className="py-10 text-center text-muted text-sm">Nenhuma comissão encontrada — feche vendas no Funil pra ver aqui.</div>
        ) : (
          <div className="divide-y divide-border">
            {deals.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-white">{d.contacts?.name ?? d.title}</span>
                  <span className="text-muted text-xs ml-2">{fmtMoney(d.value ?? 0)} bruto</span>
                </div>
                <span className="text-accent font-medium">{fmtMoney(((d.value ?? 0) * pct) / 100)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
