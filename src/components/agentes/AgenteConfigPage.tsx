"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, FlaskConical, MessageSquare, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ToolsTab from "./tabs/ToolsTab";
import CanaisTab from "./tabs/CanaisTab";
import RegrasTab from "./tabs/RegrasTab";
import NotasTab from "./tabs/NotasTab";

type Tier = "ceo" | "manager" | "specialist";

export type Agente = {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  proposito: string | null;
  tier: Tier;
  reportar_a_id: string | null;
  responsavel: string | null;
  provider: string;
  model: string;
  ativo: boolean;
  versao: number;
  prompt: string;
  temperatura: number;
  max_tokens: number;
  sliding_window: number;
  max_tool_iteracoes: number;
  intervalo_min_rotina: number;
  limite_custo_diario: number;
  mostrar_detalhes_tecnicos: boolean;
  humanizacao_ativado: boolean;
  humanizacao_canais: string[];
  debounce_janela: number;
  delay_min_ms: number;
  delay_max_ms: number;
  digitando_indicator: boolean;
  quebrar_resposta: boolean;
  quebrar_max_chars: number;
  quebrar_delay_min_ms: number;
  quebrar_delay_max_ms: number;
};

const CORES = [
  { key: "orange", cls: "bg-orange-500" },
  { key: "blue", cls: "bg-blue-500" },
  { key: "red", cls: "bg-red-500" },
  { key: "purple", cls: "bg-purple-500" },
  { key: "pink", cls: "bg-pink-500" },
  { key: "teal", cls: "bg-teal-500" },
  { key: "gray", cls: "bg-gray-500" },
];

const COR_BG: Record<string, string> = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  gray: "bg-gray-500",
};

const TABS = ["Geral", "Prompt", "Modelo", "Tools", "Canais", "Regras", "Humanização", "Notas"] as const;
type Tab = (typeof TABS)[number];

const DEFAULTS = {
  prompt: "",
  temperatura: 0.7,
  max_tokens: 4000,
  sliding_window: 30,
  max_tool_iteracoes: 20,
  intervalo_min_rotina: 5,
  limite_custo_diario: 50,
  mostrar_detalhes_tecnicos: false,
  humanizacao_ativado: true,
  humanizacao_canais: ["whatsapp", "telegram", "instagram"],
  debounce_janela: 8,
  delay_min_ms: 2000,
  delay_max_ms: 5000,
  digitando_indicator: true,
  quebrar_resposta: true,
  quebrar_max_chars: 200,
  quebrar_delay_min_ms: 1500,
  quebrar_delay_max_ms: 3000,
};

export default function AgenteConfigPage({ agenteId }: { agenteId: string }) {
  const [agente, setAgente] = useState<Agente | null>(null);
  const [outros, setOutros] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("Geral");
  const [conversarMsg, setConversarMsg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: todos }] = await Promise.all([
      supabase.from("agentes").select("*").eq("id", agenteId).maybeSingle(),
      supabase.from("agentes").select("id, nome").neq("id", agenteId),
    ]);
    setAgente(data ? ({ ...DEFAULTS, ...data } as Agente) : null);
    setOutros(todos ?? []);
    setLoading(false);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof Agente>(key: K, value: Agente[K]) {
    setAgente((a) => (a ? { ...a, [key]: value } : a));
  }

  async function salvar() {
    if (!agente) return;
    setSaving(true);
    const { id, ...rest } = agente;
    await supabase.from("agentes").update(rest).eq("id", id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <p className="text-muted text-sm">Carregando agente...</p>
      </div>
    );
  }

  if (!agente) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <p className="text-muted text-sm">Agente não encontrado.</p>
        <Link href="/agentes" className="text-accent text-sm">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-start gap-3 mb-4">
        <Link href="/agentes" className="text-muted hover:text-white mt-2">
          <ChevronLeft size={20} />
        </Link>
        <span className={`w-14 h-14 rounded-xl ${COR_BG[agente.cor] ?? "bg-panelmuted"} flex items-center justify-center text-2xl shrink-0`}>
          {agente.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-white">{agente.nome}</h1>
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${agente.ativo ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>
              {agente.ativo ? "Ativo" : "Inativo"}
            </span>
            <span className="text-[10px] text-muted">v{agente.versao}</span>
          </div>
          <p className="text-muted text-sm mt-0.5">{agente.proposito}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Link
          href={`/agentes/${agente.id}/playground`}
          className="text-sm px-3 py-2 rounded-md border border-border text-muted hover:text-white flex items-center gap-1.5"
        >
          <FlaskConical size={14} /> Playground
        </Link>
        <button
          onClick={() => setConversarMsg(true)}
          className="text-sm px-3 py-2 rounded-md border border-border text-muted hover:text-white flex items-center gap-1.5"
        >
          <MessageSquare size={14} /> Conversar
        </button>
        <button
          onClick={salvar}
          disabled={saving}
          className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5 ml-auto"
        >
          <Save size={14} /> {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      {conversarMsg && (
        <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 mb-4">
          Conversar de verdade com o agente (respondendo mensagens reais no WhatsApp) depende do Agent Runtime —
          ainda não conectado nesta versão do CRM AURA. Use o Playground para testar a configuração.
        </div>
      )}

      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-2 whitespace-nowrap border-b-2 -mb-px ${
              tab === t ? "border-accent text-white" : "border-transparent text-muted hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Geral" && (
        <div className="grid grid-cols-[1fr_260px] gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted">Nome</label>
              <input
                value={agente.nome}
                onChange={(e) => set("nome", e.target.value)}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Emoji</label>
              <input
                value={agente.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                className="w-20 bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 text-center"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Propósito / papel</label>
              <textarea
                value={agente.proposito ?? ""}
                onChange={(e) => set("proposito", e.target.value)}
                rows={3}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted">Responsável (humano)</label>
                <input
                  value={agente.responsavel ?? ""}
                  onChange={(e) => set("responsavel", e.target.value)}
                  placeholder="— Sem responsável —"
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Tier (hierarquia organograma)</label>
                <select
                  value={agente.tier}
                  onChange={(e) => set("tier", e.target.value as Tier)}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
                >
                  <option value="ceo">CEO (topo)</option>
                  <option value="manager">Manager</option>
                  <option value="specialist">Specialist (folha)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted">Reportar a (parent no organograma)</label>
              <select
                value={agente.reportar_a_id ?? ""}
                onChange={(e) => set("reportar_a_id", e.target.value || null)}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              >
                <option value="">— Sem parent (vai conectar ao CEO) —</option>
                {outros.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={agente.ativo} onChange={(e) => set("ativo", e.target.checked)} />
              Agente ativo
            </label>
          </div>

          <div className="bg-panel border border-border rounded-lg p-4">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-2">Avatar</p>
            <div className="flex justify-center mb-3">
              <span className={`w-20 h-20 rounded-xl ${COR_BG[agente.cor] ?? "bg-panelmuted"} flex items-center justify-center text-3xl`}>
                {agente.emoji}
              </span>
            </div>
            <p className="text-[11px] text-muted text-center mb-2">Cor</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {CORES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => set("cor", c.key)}
                  className={`w-6 h-6 rounded-full ${c.cls} ${agente.cor === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-panel" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Prompt" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-white text-sm font-medium">Prompt completo</p>
            <span className="text-[11px] text-muted">~{Math.round(agente.prompt.length / 4)} tokens</span>
          </div>
          <p className="text-muted text-xs mb-2">
            Instruções do agente. Use <code className="bg-panelmuted px-1 rounded">{"{{variavel}}"}</code> para criar
            campos preenchíveis.
          </p>
          <textarea
            value={agente.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            rows={18}
            placeholder="Você é o(a)... Sua função é..."
            className="w-full bg-panel border border-border rounded-lg px-3 py-3 text-sm text-white font-mono resize-none"
          />
        </div>
      )}

      {tab === "Modelo" && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <label className="text-[11px] text-muted">Credencial</label>
            <div className="flex gap-2 mt-1">
              <select disabled className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm text-white opacity-70">
                <option>Usar preferência da empresa / IA global</option>
              </select>
              <Link href="/agentes/credenciais" className="border border-border text-muted hover:text-white text-sm px-3 py-2 rounded-md">
                Gerenciar
              </Link>
            </div>
          </div>

          <div className="bg-panel border border-border rounded-lg p-3">
            <p className="text-white text-sm">
              {agente.provider} <span className="text-muted">·</span> {agente.model}
            </p>
            <p className="text-muted text-xs mt-1">Definido nas Conexões/Credenciais da empresa.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-muted">Temperatura ({agente.temperatura})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={agente.temperatura}
                onChange={(e) => set("temperatura", Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Max tokens (resposta)</label>
              <input
                type="number"
                value={agente.max_tokens}
                onChange={(e) => set("max_tokens", Number(e.target.value))}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Sliding window (msgs no contexto)</label>
              <input
                type="number"
                value={agente.sliding_window}
                onChange={(e) => set("sliding_window", Number(e.target.value))}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Máx. iterações de ferramentas</label>
              <input
                type="number"
                value={agente.max_tool_iteracoes}
                onChange={(e) => set("max_tool_iteracoes", Number(e.target.value))}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
              <p className="text-muted text-[11px] mt-1">Quantas chamadas de ferramenta o agente pode encadear numa resposta.</p>
            </div>
            <div>
              <label className="text-[11px] text-muted">Intervalo mínimo de rotina recorrente (min)</label>
              <input
                type="number"
                value={agente.intervalo_min_rotina}
                onChange={(e) => set("intervalo_min_rotina", Number(e.target.value))}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Limite custo diário (R$)</label>
              <input
                type="number"
                value={agente.limite_custo_diario}
                onChange={(e) => set("limite_custo_diario", Number(e.target.value))}
                className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={agente.mostrar_detalhes_tecnicos}
              onChange={(e) => set("mostrar_detalhes_tecnicos", e.target.checked)}
              className="mt-1"
            />
            <span>
              Mostrar detalhes técnicos das ferramentas
              <p className="text-muted text-xs mt-0.5">Por padrão o chat mostra só um resumo. Ligue para ver input/output completo de cada ferramenta (modo debug).</p>
            </span>
          </label>
        </div>
      )}

      {tab === "Tools" && <ToolsTab agenteId={agente.id} />}
      {tab === "Canais" && <CanaisTab agenteId={agente.id} agenteNome={agente.nome} />}
      {tab === "Regras" && <RegrasTab agenteId={agente.id} />}

      {tab === "Humanização" && (
        <div className="space-y-5 max-w-2xl">
          <label className="flex items-center justify-between bg-panel border border-border rounded-lg p-4">
            <span>
              <span className="text-white text-sm font-medium">Humanização</span>
              <p className="text-muted text-xs mt-0.5">
                Faz o agente parecer humano nas conversas: agrupa mensagens recebidas, espera antes de responder,
                quebra resposta longa em várias.
              </p>
            </span>
            <input
              type="checkbox"
              checked={agente.humanizacao_ativado}
              onChange={(e) => set("humanizacao_ativado", e.target.checked)}
              className="shrink-0 ml-4"
            />
          </label>

          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide mb-2">Aplicar nos canais</p>
            <div className="flex gap-2 flex-wrap">
              {["whatsapp", "telegram", "instagram"].map((c) => {
                const on = agente.humanizacao_canais.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() =>
                      set(
                        "humanizacao_canais",
                        on ? agente.humanizacao_canais.filter((x) => x !== c) : [...agente.humanizacao_canais, c]
                      )
                    }
                    className={`text-sm px-3 py-2 rounded-md border capitalize ${
                      on ? "border-accent text-accent bg-accent/10" : "border-border text-muted"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="text-muted text-[11px] mt-2">Canais que nunca humanizam (por natureza): Chat web, Botão flutuante, Email.</p>
          </div>

          <div className="bg-panel border border-border rounded-lg p-4">
            <p className="text-white text-sm font-medium mb-1">Agrupamento (debounce)</p>
            <p className="text-muted text-xs mb-2">Espera o lead terminar de digitar antes de responder.</p>
            <label className="text-[11px] text-muted">Janela (segundos)</label>
            <input
              type="number"
              value={agente.debounce_janela}
              onChange={(e) => set("debounce_janela", Number(e.target.value))}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
            />
          </div>

          <div className="bg-panel border border-border rounded-lg p-4">
            <p className="text-white text-sm font-medium mb-1">Delay antes de responder</p>
            <p className="text-muted text-xs mb-2">Simula tempo de leitura. Aleatório dentro do range.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted">Min (ms)</label>
                <input
                  type="number"
                  value={agente.delay_min_ms}
                  onChange={(e) => set("delay_min_ms", Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Max (ms)</label>
                <input
                  type="number"
                  value={agente.delay_max_ms}
                  onChange={(e) => set("delay_max_ms", Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between bg-panel border border-border rounded-lg p-4">
            <span>
              <span className="text-white text-sm">Indicador &quot;digitando...&quot;</span>
              <p className="text-muted text-xs mt-0.5">Envia status de &quot;digitando&quot; pro lead enquanto processa.</p>
            </span>
            <input type="checkbox" checked={agente.digitando_indicator} onChange={(e) => set("digitando_indicator", e.target.checked)} />
          </label>

          <div className="bg-panel border border-border rounded-lg p-4">
            <label className="flex items-center justify-between mb-3">
              <span>
                <span className="text-white text-sm">Quebrar resposta longa em várias mensagens</span>
                <p className="text-muted text-xs mt-0.5">Se passar de N caracteres, quebra em mensagens separadas com delays entre cada.</p>
              </span>
              <input type="checkbox" checked={agente.quebrar_resposta} onChange={(e) => set("quebrar_resposta", e.target.checked)} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted">Max chars/parte</label>
                <input
                  type="number"
                  value={agente.quebrar_max_chars}
                  onChange={(e) => set("quebrar_max_chars", Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Delay min (ms)</label>
                <input
                  type="number"
                  value={agente.quebrar_delay_min_ms}
                  onChange={(e) => set("quebrar_delay_min_ms", Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Delay max (ms)</label>
                <input
                  type="number"
                  value={agente.quebrar_delay_max_ms}
                  onChange={(e) => set("quebrar_delay_max_ms", Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Notas" && <NotasTab agenteId={agente.id} />}
    </div>
  );
}
