"use client";

import { useEffect, useState } from "react";
import { Compass, Search, Lightbulb, ArrowRight, Settings, AlertTriangle } from "lucide-react";

const EXAMPLES = [
  "academias zona sul SP",
  "https://onodera.com.br",
  "clínicas estéticas SP",
  "@clinicaexemplo",
  "dentistas região de Pinheiros",
];

const QUANTIDADES = [10, 20, 30, 50];

export default function DescobrirLeadsPage() {
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [quantidade, setQuantidade] = useState(20);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  function buscar() {
    setError(
      "A IA de prospecção (busca + raspagem de fontes + diagnóstico) ainda não está conectada nesta versão do CRM AURA. Essa é uma integração de IA pendente — ver checklist de integrações."
    );
  }

  return (
    <div className="mx-8 flex flex-col items-center pt-16 pb-8">
      <span className="inline-flex items-center gap-1.5 text-xs bg-panelmuted text-accent rounded-full px-3 py-1 mb-4">
        <Compass size={12} /> Prospecção
      </span>
      <h1 className="text-white text-3xl font-semibold mb-2 text-center">Diga o que você quer prospectar</h1>
      <p className="text-muted text-sm mb-8 text-center">
        A IA descobre os leads, raspa as fontes certas e te entrega o diagnóstico.
      </p>

      <div className="w-full max-w-2xl bg-panel border border-border rounded-lg p-5">
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={EXAMPLES[placeholderIdx]}
            className="w-full bg-bg border border-border focus:border-accent rounded-md pl-9 pr-3 py-3 text-sm text-white"
          />
        </div>
        <p className="text-muted text-xs mb-4 flex items-center gap-1.5">
          <Lightbulb size={12} /> Digite livre, cole um <span className="text-white font-medium">@username</span>{" "}
          ou uma <span className="text-white font-medium">URL</span>. A IA detecta o que fazer.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">Quantos leads?</span>
            <select
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="bg-bg border border-border rounded px-2 py-1.5 text-sm text-white"
            >
              {QUANTIDADES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={buscar}
            className="bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md flex items-center gap-1.5"
          >
            Buscar {quantidade} leads <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-2xl mt-4 bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="w-full max-w-2xl flex items-center justify-between mt-6 pt-4 border-t border-border">
        <span className="text-muted text-xs">CRM AURA · IA de prospecção (em configuração)</span>
        <button className="text-muted text-xs flex items-center gap-1.5 hover:text-white">
          <Settings size={12} /> Configurar prompts das IAs
        </button>
      </div>
    </div>
  );
}
