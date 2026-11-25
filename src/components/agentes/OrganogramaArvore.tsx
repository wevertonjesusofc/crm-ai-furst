"use client";

import { useEffect, useRef } from "react";

// Organograma em árvore: pessoas do time e agentes de IA juntos, cada um ligado ao chefe.

type No = {
  id: string;
  nome: string;
  emoji: string;
  proposito: string | null;
  reportar_a_id: string | null;
  tipo?: "agente" | "pessoa" | null;
  cargo?: string | null;
  ativo: boolean;
};

function Cartao({ n }: { n: No }) {
  const pessoa = n.tipo === "pessoa";
  return (
    <div className={`w-52 bg-panel border rounded-xl p-3 text-left ${pessoa ? "border-border" : "border-accent/40"}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
            pessoa ? "bg-panelmuted text-white" : "bg-accent/15 text-lg"
          }`}
        >
          {pessoa ? n.nome.slice(0, 1).toUpperCase() : n.emoji}
        </span>
        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">{n.nome}</div>
          <div className="text-[11px] text-muted truncate">{n.cargo || (pessoa ? "Colaborador" : "Agente de IA")}</div>
        </div>
      </div>
      {n.proposito && <p className="text-[11px] text-muted mt-2 line-clamp-2">{n.proposito}</p>}
      <span
        className={`inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${
          pessoa ? "bg-panelmuted text-muted" : "bg-accent/15 text-accent"
        }`}
      >
        {pessoa ? "Pessoa" : n.ativo ? "IA · ativo" : "IA · desligado"}
      </span>
    </div>
  );
}

export default function OrganogramaArvore({ nos }: { nos: No[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const arvore = useRef<HTMLDivElement>(null);
  // Encaixa a árvore inteira na largura da tela (sem rolar para os lados).
  useEffect(() => {
    const ajustar = () => {
      if (!caixa.current || !arvore.current) return;
      arvore.current.style.zoom = "1";
      const z = Math.max(0.5, Math.min(1, (caixa.current.clientWidth - 8) / arvore.current.scrollWidth));
      arvore.current.style.zoom = String(z);
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [nos]);
  const ids = new Set(nos.map((n) => n.id));
  const raizes = nos.filter((n) => !n.reportar_a_id || !ids.has(n.reportar_a_id));
  const filhos = (id: string) => nos.filter((n) => n.reportar_a_id === id);

  const ordenar = (xs: No[]) => xs.sort((a, b) => (a.tipo === "pessoa" ? 0 : 1) - (b.tipo === "pessoa" ? 0 : 1));

  // Do 2º nível para baixo o time fica em coluna embaixo do chefe (cabe na tela e lê melhor).
  const coluna = (n: No): React.ReactNode => {
    const f = ordenar(filhos(n.id));
    return (
      <div key={n.id} className="flex flex-col items-start">
        <Cartao n={n} />
        {f.length > 0 && <div className="flex flex-col gap-2 mt-2 ml-5 pl-3 border-l border-[#2f3a4f]">{f.map(coluna)}</div>}
      </div>
    );
  };

  const ramo = (n: No, nivel = 0): React.ReactNode => {
    const f = ordenar(filhos(n.id));
    return (
      <li key={n.id}>
        {nivel === 0 ? <Cartao n={n} /> : coluna(n)}
        {nivel === 0 && f.length > 0 && <ul>{f.map((x) => ramo(x, nivel + 1))}</ul>}
      </li>
    );
  };

  return (
    <div ref={caixa} className="overflow-x-auto pb-4">
      <style>{`
        .org ul { display:flex; justify-content:center; padding-top:20px; position:relative; margin:0; }
        .org li { list-style:none; position:relative; padding:20px 14px 0; display:flex; flex-direction:column; align-items:center; }
        .org li::before, .org li::after { content:""; position:absolute; top:0; right:50%; width:50%; height:20px; border-top:1px solid #2f3a4f; }
        .org li::after { right:auto; left:50%; border-left:1px solid #2f3a4f; }
        .org li:only-child::before, .org li:only-child::after { display:none; }
        .org li:only-child { padding-top:0; }
        .org li:first-child::before, .org li:last-child::after { border:0; }
        .org li:last-child::before { border-right:1px solid #2f3a4f; border-radius:0 6px 0 0; }
        .org li:first-child::after { border-radius:6px 0 0 0; }
        .org ul ul::before { content:""; position:absolute; top:0; left:50%; height:20px; border-left:1px solid #2f3a4f; }
        .org > ul { padding-top:0; }
      `}</style>
      <div ref={arvore} className="org w-max mx-auto">
        <ul>{raizes.map((r) => ramo(r))}</ul>
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] text-muted mt-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-panelmuted border border-border" /> Pessoa do time</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent/40" /> Agente de IA</span>
      </div>
    </div>
  );
}
