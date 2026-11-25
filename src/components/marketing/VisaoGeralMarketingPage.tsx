"use client";

import { useState } from "react";
import { Send, Mail, Eye, MousePointerClick, AlertTriangle, XCircle, Search, Sparkles } from "lucide-react";

const RANGES = ["24h", "7 dias", "30 dias", "Tudo"];

const STATS = [
  { label: "Enviados", icon: Send },
  { label: "Entregues", icon: Mail },
  { label: "Aberturas", icon: Eye, taxa: true },
  { label: "Cliques", icon: MousePointerClick, taxa: true },
  { label: "Bounces", icon: AlertTriangle, pct: true },
  { label: "Falhas", icon: XCircle },
];

export default function VisaoGeralMarketingPage() {
  const [range, setRange] = useState("30 dias");

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Email</span>
        <div className="flex bg-panel border border-border rounded-md overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-3 py-1.5 ${range === r ? "bg-panelmuted text-white font-medium" : "text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-white mb-1">Visão geral</h1>
      <p className="text-muted text-sm mb-6">Performance e histórico de todos os envios</p>

      <div className="grid grid-cols-6 gap-3 mb-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className="text-muted" />
            </div>
            <div className="text-xl font-semibold text-white">0</div>
            {s.taxa && <div className="text-[10px] text-muted mt-0.5">Taxa: 0%</div>}
            {s.pct && <div className="text-[10px] text-muted mt-0.5">0% do total</div>}
          </div>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-1.5 text-white text-sm font-medium">
          <Sparkles size={13} className="text-accent" /> Envios por dia · últimos 30
        </div>
        <p className="text-muted text-xs mt-0.5">Barra clara = enviados · cheia = abertos</p>
        <div className="h-16" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium">Últimos envios</h3>
          <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Buscar por email..."
              className="bg-panel border border-border rounded-md pl-7 pr-2 py-1.5 text-xs text-white w-48"
            />
          </div>
          <select className="bg-panel border border-border rounded-md px-2 py-1.5 text-xs text-white">
            <option>Tudo</option>
          </select>
          <select className="bg-panel border border-border rounded-md px-2 py-1.5 text-xs text-white">
            <option>Todos status</option>
          </select>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[10px] text-muted uppercase tracking-wide border-b border-border">
          <span>Lead</span>
          <span>Email</span>
          <span>Origem</span>
          <span>Assunto</span>
          <span>Status</span>
          <span>Quando</span>
        </div>
        <div className="py-16 text-center">
          <Mail size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhum envio no período selecionado</p>
        </div>
      </div>

      <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2 mt-4">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          Envio de email marketing depende de uma integração real (ex: Resend, SendGrid) — ainda não conectada
          nesta versão do CRM AURA. Ver checklist de integrações pendentes.
        </span>
      </div>
    </div>
  );
}
