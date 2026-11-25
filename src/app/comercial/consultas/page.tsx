"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import ConsultasPage from "@/components/ConsultasPage";
import AgendaQuadro from "@/components/AgendaQuadro";

export default function Page() {
  const [modo, setModo] = useState<"quadro" | "lista">("quadro");
  return (
    <div>
      <div className="mx-8 pt-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agenda</h1>
          <p className="text-muted text-sm">Arraste o paciente para confirmar, marcar como realizado, faltou ou cancelado.</p>
        </div>
        <div className="flex bg-panel border border-border rounded-md overflow-hidden">
          <button onClick={() => setModo("quadro")} className={`text-sm px-3 py-2 flex items-center gap-1.5 ${modo === "quadro" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
            <LayoutGrid size={14} /> Quadro
          </button>
          <button onClick={() => setModo("lista")} className={`text-sm px-3 py-2 flex items-center gap-1.5 ${modo === "lista" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
            <List size={14} /> Lista e nova consulta
          </button>
        </div>
      </div>
      {modo === "quadro" ? (
        <div className="mx-8 mt-5 pb-10">
          <AgendaQuadro />
        </div>
      ) : (
        <ConsultasPage />
      )}
    </div>
  );
}
