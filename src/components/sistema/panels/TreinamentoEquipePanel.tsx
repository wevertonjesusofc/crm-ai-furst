"use client";

import { useState } from "react";
import { Star, Search, AlertTriangle } from "lucide-react";

export default function TreinamentoEquipePanel() {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todas");

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Treinamento</h2>
      <p className="text-muted text-sm mb-4">
        Ligações marcadas para treinamento. Ouça gravações com a equipe e use a análise da IA para capacitar
        vendedores.
      </p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white text-sm font-medium">Treinamento</h3>
            <p className="text-muted text-xs mt-0.5">Chamadas avaliadas ou com notas de estudo para referência do time</p>
          </div>
          <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2.5 py-1 shrink-0 ml-4">0 chamadas avaliadas</span>
        </div>

        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, lead, vendedor..."
              className="w-full bg-bg border border-border rounded-md pl-7 pr-2 py-2 text-sm text-white"
            />
          </div>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="bg-bg border border-border rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="todas">Todas</option>
            <option value="5">5 estrelas</option>
            <option value="4">4 estrelas</option>
            <option value="3">3 estrelas</option>
            <option value="2">2 estrelas</option>
            <option value="1">1 estrela</option>
          </select>
        </div>

        <div className="py-14 text-center">
          <Star size={26} className="text-muted mx-auto mb-2" />
          <p className="text-white text-sm mb-1">Nenhuma chamada avaliada</p>
          <p className="text-muted text-xs">Avalie chamadas com estrelas no modal pós-chamada ou no histórico para que apareçam aqui.</p>
        </div>
      </div>

      <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2 mt-4">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          As chamadas avaliadas aqui vêm das ligações de Telefonia (VoIP) — que ainda não está conectada. Assim que a
          integração existir, avaliar uma chamada com estrelas (no pós-chamada ou no histórico) vai preencher esta
          lista automaticamente, sem precisar mudar nada aqui.
        </span>
      </div>
    </div>
  );
}
