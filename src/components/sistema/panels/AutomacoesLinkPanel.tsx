"use client";

import Link from "next/link";
import { GitBranch, ArrowRight } from "lucide-react";

export default function AutomacoesLinkPanel() {
  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Automações</h2>
      <p className="text-muted text-sm mb-4">As automações do CRM AURA ficam num lugar só, pra não duplicar configuração.</p>
      <Link
        href="/marketing/automacoes"
        className="bg-panel border border-border hover:border-accent rounded-lg p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            <GitBranch size={16} />
          </span>
          <div>
            <div className="text-white text-sm font-medium">Ir para Marketing &gt; Automações</div>
            <p className="text-muted text-xs">Fluxos visuais disparados por gatilhos (novo paciente interessado, venda ganha etc.).</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-muted" />
      </Link>
    </div>
  );
}
