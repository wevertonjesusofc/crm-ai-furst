"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  List,
  Network,
  Package,
  KeyRound,
  Plus,
  X,
  MessageSquare,
  FlaskConical,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tier = "ceo" | "manager" | "specialist";

type Agente = {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  proposito: string | null;
  tier: Tier;
  reportar_a_id: string | null;
  provider: string;
  model: string;
  ativo: boolean;
  versao: number;
};

const TEMPLATES = [
  {
    nome: "Assistente Geral (CEO)",
    emoji: "🤖",
    tier: "ceo" as Tier,
    proposito: "Sócio operacional virtual — analisa o CRM em tempo real e responde em tom de WhatsApp.",
  },
  {
    nome: "Atendente (Bella)",
    emoji: "💁‍♀️",
    tier: "specialist" as Tier,
    proposito: "Atende leads no WhatsApp, explica serviços/preços e agenda avaliação.",
  },
  {
    nome: "Gestor de Time",
    emoji: "🧭",
    tier: "manager" as Tier,
    proposito: "Monitora pendências do time (tarefas atrasadas, no-shows, deals parados) e cobra no grupo.",
  },
  {
    nome: "Heitor — Estrategista de Conteúdo",
    emoji: "✍️",
    tier: "specialist" as Tier,
    proposito: "Gera carrosséis IG/LinkedIn, transcreve referências, agenda publicações.",
  },
  {
    nome: "Vinicius — Gestor de Tráfego",
    emoji: "📊",
    tier: "specialist" as Tier,
    proposito: "Gestor de tráfego Meta Ads. Consulta contas, campanhas e métricas.",
  },
];

const TIER_LABEL: Record<Tier, string> = { ceo: "CEO", manager: "MANAGER", specialist: "SPECIALIST" };
const TIER_COLOR: Record<Tier, string> = {
  ceo: "border-l-accent",
  manager: "border-l-blue-500",
  specialist: "border-l-orange-500",
};

export default function AgentesPage({ initialView = "lista" }: { initialView?: "lista" | "organograma" }) {
  const [view, setView] = useState<"lista" | "organograma">(initialView);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agentes").select("*").order("created_at");
    setAgentes((data as Agente[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createFromTemplate(t: (typeof TEMPLATES)[number]) {
    await supabase.from("agentes").insert({
      nome: `${t.nome} - AURA IA`,
      emoji: t.emoji,
      tier: t.tier,
      proposito: t.proposito,
    });
    setShowNew(false);
    load();
  }

  const ceo = agentes.find((a) => a.tier === "ceo");
  const managers = agentes.filter((a) => a.tier === "manager");
  const specialists = agentes.filter((a) => a.tier === "specialist");

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-panelmuted text-accent flex items-center justify-center">
            <Briefcase size={18} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Agentes IA</h1>
            <p className="text-muted text-sm">{agentes.length} agentes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("lista")}
              className={`text-sm px-3 py-2 flex items-center gap-1.5 ${
                view === "lista" ? "bg-accent text-bg font-medium" : "text-muted"
              }`}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => setView("organograma")}
              className={`text-sm px-3 py-2 flex items-center gap-1.5 ${
                view === "organograma" ? "bg-accent text-bg font-medium" : "text-muted"
              }`}
            >
              <Network size={14} /> Organograma
            </button>
          </div>
          <Link
            href="/agentes/habilidades"
            className="text-sm px-3 py-2 rounded-md border border-border text-muted hover:text-white flex items-center gap-1.5"
          >
            <Package size={14} /> Habilidades
          </Link>
          <Link
            href="/agentes/credenciais"
            className="text-sm px-3 py-2 rounded-md border border-border text-muted hover:text-white flex items-center gap-1.5"
          >
            <KeyRound size={14} /> Conexões
          </Link>
          <button
            onClick={() => setShowNew(true)}
            className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <Plus size={14} /> Novo agente
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Carregando...</p>
      ) : agentes.length === 0 ? (
        <div className="py-20 text-center">
          <Briefcase size={32} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhum agente ainda</p>
          <p className="text-muted text-sm mt-1">Crie o primeiro a partir de um template.</p>
        </div>
      ) : view === "lista" ? (
        <div className="grid grid-cols-3 gap-4">
          {agentes.map((a) => (
            <div key={a.id} className={`bg-panel border border-border border-l-2 ${TIER_COLOR[a.tier]} rounded-lg p-4`}>
              <div className="flex items-start gap-3 mb-2">
                <span className="w-10 h-10 rounded-md bg-panelmuted flex items-center justify-center text-lg shrink-0">
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white text-sm font-medium">{a.nome}</span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${a.ativo ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>
                      {a.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-[10px] text-muted">v{a.versao}</span>
                  </div>
                  <p className="text-muted text-xs mt-0.5 line-clamp-2">{a.proposito}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mb-3">
                <span className="text-[10px] bg-panelmuted text-muted rounded px-1.5 py-0.5">{a.provider}</span>
                <span className="text-[10px] bg-panelmuted text-muted rounded px-1.5 py-0.5">{a.model}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/agentes/${a.id}/playground`}
                  className="flex-1 bg-accent text-bg text-xs font-medium py-2 rounded-md flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={12} /> Conversar
                </Link>
                <Link
                  href={`/agentes/${a.id}/playground`}
                  className="border border-border text-muted hover:text-white rounded-md p-2"
                >
                  <FlaskConical size={12} />
                </Link>
                <Link href={`/agentes/${a.id}/config`} className="border border-border text-muted hover:text-white rounded-md p-2">
                  <Settings size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 py-4">
          {ceo && (
            <div className={`bg-panel border border-border border-l-2 ${TIER_COLOR.ceo} rounded-lg p-4 w-72 text-center`}>
              <span className="text-2xl">{ceo.emoji}</span>
              <div className="text-white text-sm font-medium mt-1">{ceo.nome}</div>
              <p className="text-muted text-xs mt-1 line-clamp-2">{ceo.proposito}</p>
              <span className="inline-block mt-2 text-[10px] bg-panelmuted text-accent rounded px-2 py-0.5">
                {TIER_LABEL.ceo}
              </span>
            </div>
          )}
          {managers.length > 0 && (
            <>
              <div className="w-px h-6 bg-border" />
              {managers.map((m) => (
                <div key={m.id} className={`bg-panel border border-border border-l-2 ${TIER_COLOR.manager} rounded-lg p-4 w-72 text-center`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="text-white text-sm font-medium mt-1">{m.nome}</div>
                  <p className="text-muted text-xs mt-1 line-clamp-2">{m.proposito}</p>
                  <span className="inline-block mt-2 text-[10px] bg-panelmuted text-blue-400 rounded px-2 py-0.5">
                    {TIER_LABEL.manager}
                  </span>
                </div>
              ))}
            </>
          )}
          {specialists.length > 0 && (
            <>
              <div className="w-px h-6 bg-border" />
              <div className="flex gap-4 flex-wrap justify-center">
                {specialists.map((s) => (
                  <div key={s.id} className={`bg-panel border border-border border-l-2 ${TIER_COLOR.specialist} rounded-lg p-4 w-64 text-center`}>
                    <span className="text-2xl">{s.emoji}</span>
                    <div className="text-white text-sm font-medium mt-1">{s.nome}</div>
                    <p className="text-muted text-xs mt-1 line-clamp-2">{s.proposito}</p>
                    <span className="inline-block mt-2 text-[10px] bg-panelmuted text-orange-400 rounded px-2 py-0.5">
                      {TIER_LABEL.specialist}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[520px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-medium">Novo agente</h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-muted text-xs mb-4">Escolhe um template pronto — a execução real ainda depende do Agent Runtime.</p>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.nome}
                  onClick={() => createFromTemplate(t)}
                  className="text-left bg-panelmuted border border-border rounded-lg p-3 hover:border-accent"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{t.emoji}</span>
                    <span className="text-white text-sm font-medium">{t.nome}</span>
                  </div>
                  <p className="text-muted text-xs line-clamp-2">{t.proposito}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowNew(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
