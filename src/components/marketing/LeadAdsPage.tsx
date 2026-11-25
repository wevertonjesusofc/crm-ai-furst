"use client";

import { Send, Facebook, FileText, Users, AlertTriangle, Plus, Clock } from "lucide-react";

export default function LeadAdsPage() {
  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Send size={20} className="text-accent" /> Lead Ads
        </h1>
        <button className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Conectar página
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Receba leads diretamente dos formulários do Meta (Instagram e Facebook).</p>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Páginas conectadas", icon: Facebook },
          { label: "Formulários ativos", icon: FileText },
          { label: "Leads recebidos", icon: Users },
          { label: "Erros", icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted mb-2">
              <s.icon size={13} /> {s.label}
            </div>
            <div className="text-xl font-semibold text-white">0</div>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg p-5 mb-4">
        <h3 className="text-white text-sm font-medium mb-4">Páginas Conectadas</h3>
        <div className="py-10 text-center">
          <Facebook size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm mb-3">Nenhuma página conectada</p>
          <button className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">+ Conectar primeira página</button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
            <Clock size={13} /> Últimos Leads via Lead Ads
          </h3>
          <span className="text-[11px] text-muted">0 registros</span>
        </div>
        <p className="text-muted text-sm text-center py-6">Nenhum lead recebido ainda via Lead Ads</p>
      </div>

      <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          Depende da API de Lead Ads do Meta (OAuth + webhooks de formulário) — ainda não implementado. Ver
          checklist de integrações pendentes.
        </span>
      </div>
    </div>
  );
}
