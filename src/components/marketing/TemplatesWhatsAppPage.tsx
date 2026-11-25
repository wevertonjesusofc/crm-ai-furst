"use client";

import { RefreshCw, ExternalLink, Plus, Search, AlertTriangle } from "lucide-react";

const STATUS_META = [
  { label: "Aprovado", count: 0 },
  { label: "Em análise", count: 0 },
  { label: "Rejeitado", count: 0 },
  { label: "Pausado", count: 0 },
  { label: "Desativado", count: 0 },
];
const CATEGORIA_META = [
  { label: "Marketing", count: 0 },
  { label: "Utility", count: 0 },
  { label: "Autenticação", count: 0 },
];

export default function TemplatesWhatsAppPage() {
  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · WhatsApp</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Templates</h1>
        <div className="flex items-center gap-2">
          <button className="text-sm px-3 py-2 rounded-md border border-border text-muted hover:text-white flex items-center gap-1.5">
            <RefreshCw size={13} /> Sincronizar
          </button>
          <button className="text-sm text-muted hover:text-white flex items-center gap-1.5">
            Business Manager <ExternalLink size={12} />
          </button>
          <button className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Novo template
          </button>
        </div>
      </div>
      <p className="text-muted text-sm mb-6">Modelos aprovados pela Meta. Use templates pra iniciar conversas fora da janela de 24h.</p>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        <div>
          <div className="relative mb-4">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input placeholder="Buscar template..." className="w-full bg-panel border border-border rounded-md pl-7 pr-2 py-2 text-xs text-white" />
          </div>
          <div className="mb-4">
            <h4 className="text-[10px] text-muted uppercase tracking-wide mb-2">Status Meta</h4>
            {STATUS_META.map((s) => (
              <label key={s.label} className="flex items-center justify-between text-xs text-muted py-1">
                <span className="flex items-center gap-1.5">
                  <input type="checkbox" disabled /> {s.label}
                </span>
                <span>{s.count}</span>
              </label>
            ))}
          </div>
          <div className="mb-4">
            <h4 className="text-[10px] text-muted uppercase tracking-wide mb-2">Categoria Meta</h4>
            {CATEGORIA_META.map((c) => (
              <label key={c.label} className="flex items-center justify-between text-xs text-muted py-1">
                <span className="flex items-center gap-1.5">
                  <input type="checkbox" disabled /> {c.label}
                </span>
                <span>{c.count}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-muted uppercase tracking-wide">Etiquetas internas</h4>
            <button className="text-accent text-[11px]">Gerenciar</button>
          </div>
          <p className="text-muted text-xs mt-1">Nenhuma etiqueta criada</p>
        </div>

        <div>
          <div className="bg-panel border border-border rounded-lg py-16 text-center mb-4">
            <Search size={26} className="text-muted mx-auto mb-2" />
            <p className="text-white font-medium">Você ainda não tem templates</p>
            <p className="text-muted text-sm mt-1 mb-4">Crie templates no Meta WhatsApp Manager e clique em sincronizar.</p>
            <button
              onClick={() => alert("Sincronização com a Meta ainda não conectada — depende da API Oficial do WhatsApp Business.")}
              className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={14} /> Sincronizar com Meta
            </button>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Templates de WhatsApp são geridos e aprovados pela própria Meta — não é possível criá-los aqui
              localmente. Isso depende de conectar o WhatsApp Business Manager real. Ver checklist de integrações
              pendentes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
