"use client";

import { useState } from "react";
import { Radio, Eye, Heart, PlayCircle, UserPlus, Target, Instagram, Youtube, Linkedin, Music2, Link2, AlertTriangle } from "lucide-react";

const RANGES = ["Hoje", "Ontem", "7 dias", "30 dias", "90 dias", "6 meses", "1 ano", "Tudo"];

const STATS = [
  { label: "Alcance total", icon: Eye },
  { label: "Engajamento", icon: Heart },
  { label: "Visualizações", icon: PlayCircle },
  { label: "Novos seguidores", icon: UserPlus },
  { label: "Leads gerados", icon: Target },
];

const REDES = [
  { nome: "Instagram", Icon: Instagram, color: "text-pink-400" },
  { nome: "YouTube", Icon: Youtube, color: "text-red-400" },
  { nome: "LinkedIn", Icon: Linkedin, color: "text-blue-400" },
  { nome: "TikTok", Icon: Music2, color: "text-white" },
];

export default function RedesSociaisPage() {
  const [range, setRange] = useState("30 dias");

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Radio size={20} className="text-accent" /> Redes sociais
          </h1>
          <p className="text-muted text-sm mt-0.5">Instagram, YouTube, LinkedIn e TikTok</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-md overflow-hidden flex-wrap">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-2.5 py-1.5 ${range === r ? "bg-panelmuted text-white font-medium" : "text-muted"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Link2 size={14} /> Conectar redes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 my-6">
        {STATS.map((s) => (
          <div key={s.label} className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted mb-2">
              <s.icon size={13} /> {s.label}
            </div>
            <div className="text-xl font-semibold text-white">—</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {REDES.map((r) => (
          <div key={r.nome} className="bg-panel border border-border rounded-lg p-4">
            <div className={`flex items-center gap-1.5 text-sm font-medium mb-3 ${r.color}`}>
              <r.Icon size={15} /> {r.nome}
            </div>
            <p className="text-muted text-sm">Conta ainda não conectada</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          Métricas de redes sociais dependem de conectar cada conta via OAuth (Meta, Google, LinkedIn, TikTok) —
          ainda não implementado nesta versão do CRM AURA. Ver checklist de integrações pendentes.
        </span>
      </div>
    </div>
  );
}
