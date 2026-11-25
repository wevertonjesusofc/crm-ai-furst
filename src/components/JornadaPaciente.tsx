"use client";

import { useEffect, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calcularJornada, Etapa } from "@/lib/jornada";

const PERIODOS = [
  { rotulo: "Este mês", dias: 0 },
  { rotulo: "Últimos 30 dias", dias: 30 },
  { rotulo: "Últimos 90 dias", dias: 90 },
];

export default function JornadaPaciente() {
  const [periodo, setPeriodo] = useState(0);
  const [dados, setDados] = useState<Awaited<ReturnType<typeof calcularJornada>> | null>(null);

  useEffect(() => {
    const p = PERIODOS[periodo];
    let desde: Date;
    if (p.dias === 0) {
      desde = new Date();
      desde.setDate(1);
      desde.setHours(0, 0, 0, 0);
    } else desde = new Date(Date.now() - p.dias * 86400000);
    setDados(null);
    calcularJornada(supabase, desde.toISOString()).then(setDados);
  }, [periodo]);

  const base = dados?.etapas[0]?.total ?? 0;

  return (
    <div className="mx-8 mt-6 bg-panel border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h2 className="text-xs uppercase tracking-[0.12em] text-muted">Jornada do paciente</h2>
        <div className="flex gap-1 bg-bg border border-border rounded-md p-0.5">
          {PERIODOS.map((p, i) => (
            <button key={p.rotulo} onClick={() => setPeriodo(i)} className={`px-2.5 py-1 rounded text-xs ${periodo === i ? "bg-accent text-bg font-medium" : "text-muted"}`}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>
      <p className="text-muted text-xs mb-4">Do primeiro contato ao retorno: quantos passaram em cada etapa e onde o paciente se perde.</p>

      {dados === null && <p className="text-muted text-sm">Calculando…</p>}
      {dados && base === 0 && <p className="text-muted text-sm">Nenhum paciente novo neste período. Quando chegarem pelo WhatsApp, Instagram ou site, a jornada aparece aqui.</p>}

      {dados && base > 0 && (
        <>
          {dados.maiorVazamento && (
            <div className="mb-4 flex items-start gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-md px-3 py-2">
              <TriangleAlert size={15} className="shrink-0 mt-0.5" />
              <span>
                Maior vazamento: <b>{dados.maiorVazamento.perdidos}</b> paciente(s) ficaram entre <b>{dados.maiorVazamento.de}</b> e <b>{dados.maiorVazamento.para}</b>.
              </span>
            </div>
          )}
          <div className="grid grid-cols-6 gap-2">
            {dados.etapas.map((e: Etapa, i) => {
              const pct = base ? Math.round((e.total / base) * 100) : 0;
              const anterior = i > 0 ? dados.etapas[i - 1].total : null;
              const passou = anterior ? Math.round((e.total / Math.max(anterior, 1)) * 100) : null;
              return (
                <div key={e.chave} className="flex flex-col">
                  <div className="text-[11px] text-muted h-8 leading-tight">{e.titulo}</div>
                  <div className="h-24 bg-bg rounded-md flex items-end overflow-hidden">
                    <div className="w-full bg-accent/80 rounded-md" style={{ height: `${Math.max(pct, e.total ? 6 : 0)}%` }} />
                  </div>
                  <div className="text-xl text-white font-semibold tabular-nums mt-1.5">{e.total}</div>
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    {passou !== null ? <><ArrowRight size={10} /> {passou}% da etapa anterior</> : "base"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {dados.etapas
              .filter((e) => e.detalhe && e.detalhe.length)
              .map((e) => (
                <div key={e.chave} className="bg-panelmuted rounded-md p-3">
                  <div className="text-xs text-white font-medium mb-1.5">{e.pergunta}</div>
                  {e.detalhe!.slice(0, 5).map((d) => (
                    <div key={d.rotulo} className="flex justify-between text-xs text-muted">
                      <span className="truncate pr-2">{d.rotulo}</span>
                      <span className="tabular-nums text-white">{d.n}</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
