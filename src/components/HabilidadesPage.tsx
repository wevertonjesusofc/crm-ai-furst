"use client";

import Link from "next/link";
import { ArrowLeft, Package, Search, AlertTriangle } from "lucide-react";

export default function HabilidadesPage() {
  return (
    <div className="mx-8 pt-8 pb-8">
      <Link href="/agentes" className="text-muted hover:text-white text-sm flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-lg bg-panelmuted text-accent flex items-center justify-center">
          <Package size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-white">Biblioteca de Habilidades</h1>
          <p className="text-muted text-sm">0 habilidades · usadas pelos agentes</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          disabled
          placeholder="Buscar habilidade ou pack..."
          className="w-full bg-panel border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-muted"
        />
      </div>

      <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          As habilidades (ferramentas que um agente pode chamar — consultar o CRM, mandar WhatsApp, mexer no
          calendário, etc.) só existem quando há um <strong>Agent Runtime</strong> executando os agentes de
          verdade. O CRM AURA ainda não tem essa peça conectada, então essa biblioteca está vazia por enquanto —
          ver checklist de integrações pendentes.
        </span>
      </div>
    </div>
  );
}
