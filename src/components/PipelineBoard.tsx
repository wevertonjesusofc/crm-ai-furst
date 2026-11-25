"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  MoreHorizontal,
  Upload,
  MessageSquare,
  RefreshCw,
  Target,
  DollarSign,
  TrendingUp,
  Briefcase,
  User,
  Calendar,
  X,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Stage = { id: string; name: string; position: number };
type Deal = {
  id: string;
  title: string;
  value: number | null;
  stage_id: string | null;
  status: string;
  created_at: string;
  contact_id: string | null;
  contacts: { name: string } | null;
};

type SortKey = "urgencia" | "recentes" | "valor" | "faturamento" | "score" | "tempo";

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function fmtMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

const NO_ADD_STAGES = ["Ganho", "Perdido"];
const PERIOD_OPTS = ["Hoje", "Semana", "Este mês", "Mês passado", "3 meses", "Customizado"];

export default function PipelineBoard() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"todos" | "meus">("todos");
  const [sortKey, setSortKey] = useState<SortKey>("urgencia");
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newLeadInput, setNewLeadInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodField, setPeriodField] = useState<"criacao" | "ganho">("criacao");
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: stagesData } = await supabase
      .from("pipeline_stages")
      .select("id, name, position")
      .order("position");
    const { data: dealsData } = await supabase
      .from("deals")
      .select("id, title, value, stage_id, status, created_at, contact_id, contacts(name)")
      .eq("status", "open");
    setStages((stagesData as Stage[]) ?? []);
    setDeals((dealsData as unknown as Deal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveDeal(dealId: string, stageId: string) {
    const nome = stages.find((s) => s.id === stageId)?.name ?? "";
    const status = nome === "Ganho" ? "won" : nome === "Perdido" ? "lost" : "open";
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d)));
    await supabase.from("deals").update({ stage_id: stageId, status }).eq("id", dealId);
  }

  // Arrastar e soltar entre as etapas
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  async function createDeal(stageId?: string) {
    const name = newLeadInput.trim();
    if (!name) return;
    const { data: contact } = await supabase
      .from("contacts")
      .insert({ name })
      .select("id")
      .single();
    if (!contact) return;
    const targetStage = stageId ?? stages[0]?.id;
    await supabase.from("deals").insert({
      title: name,
      contact_id: contact.id,
      stage_id: targetStage,
      value: 0,
    });
    setNewLeadInput("");
    setShowNewDeal(false);
    load();
  }

  const filteredDeals = useMemo(() => {
    let list = deals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.contacts?.name.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)
      );
    }
    if (periodFilter) {
      const now = new Date();
      const cutoff = new Date();
      if (periodFilter === "Hoje") cutoff.setHours(0, 0, 0, 0);
      else if (periodFilter === "Semana") cutoff.setDate(now.getDate() - 7);
      else if (periodFilter === "Este mês") cutoff.setDate(1);
      else if (periodFilter === "Mês passado") cutoff.setMonth(now.getMonth() - 1);
      else if (periodFilter === "3 meses") cutoff.setMonth(now.getMonth() - 3);
      if (periodFilter !== "Customizado") {
        list = list.filter((d) => new Date(d.created_at) >= cutoff);
      }
    }
    const sorted = [...list];
    switch (sortKey) {
      case "valor":
      case "faturamento":
        sorted.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        break;
      case "recentes":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "tempo":
      case "score":
        sorted.sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at));
        break;
      default:
        break; // urgencia = ordem natural
    }
    return sorted;
  }, [deals, search, sortKey, periodFilter]);

  const dealsAtivos = filteredDeals.length;
  const valorTotal = filteredDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
  const ganhos = 0; // sem deals "won" ainda nessa base
  const ganhosPct = dealsAtivos > 0 ? Math.round((ganhos / dealsAtivos) * 100) : 0;

  const sortLabels: Record<SortKey, string> = {
    urgencia: "Urgência",
    recentes: "Mais recentes",
    valor: "Maior valor",
    faturamento: "Maior faturamento",
    score: "Score do lead",
    tempo: "Tempo na etapa",
  };

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Funil de vendas</h1>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowNewDeal(true)}
            className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1"
          >
            + Novo Deal
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-muted px-2 py-2 rounded-md border border-border hover:text-white"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-10 bg-panel border border-border rounded-md py-1 w-48 shadow-lg text-sm">
              <button className="w-full text-left px-3 py-2 text-muted hover:text-white flex items-center gap-2">
                <Upload size={14} /> Importar Leads
              </button>
              <button className="w-full text-left px-3 py-2 text-muted hover:text-white flex items-center gap-2">
                <MessageSquare size={14} /> Disparar WhatsApp
              </button>
              <button
                onClick={() => {
                  load();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-muted hover:text-white flex items-center gap-2"
              >
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, email, tel"
            className="bg-panel border border-border rounded-md pl-8 pr-3 py-2 text-sm text-white w-56"
          />
        </div>
        <div className="flex bg-panel border border-border rounded-md p-0.5">
          <button
            onClick={() => setScope("todos")}
            className={`text-sm px-3 py-1.5 rounded ${
              scope === "todos" ? "bg-white text-bg" : "text-muted"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setScope("meus")}
            className={`text-sm px-3 py-1.5 rounded ${
              scope === "meus" ? "bg-white text-bg" : "text-muted"
            }`}
          >
            Meus
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 bg-panel border border-border rounded-md px-3 py-2 text-sm text-white"
          >
            <ArrowUpDown size={14} /> {sortLabels[sortKey]}
          </button>
          {sortOpen && (
            <div className="absolute z-10 mt-1 bg-panel border border-border rounded-md py-1 w-48 shadow-lg">
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSortKey(k);
                    setSortOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm ${
                    sortKey === k ? "text-accent" : "text-muted hover:text-white"
                  }`}
                >
                  {sortLabels[k]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 bg-panel border border-border rounded-md px-3 py-2 text-sm text-muted hover:text-white"
          >
            <SlidersHorizontal size={14} /> Filtros
          </button>
          {filtersOpen && (
            <div className="absolute z-10 mt-1 bg-panel border border-border rounded-lg p-4 w-96 shadow-lg">
              <h4 className="text-white text-sm font-medium mb-3">Filtros avançados</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wide">Urgência</label>
                  <div className="mt-1 flex items-center gap-1.5 bg-bg border border-border rounded px-2 py-1.5 text-sm text-white">
                    <AlertTriangle size={12} className="text-muted" /> Todas
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wide">Atividades</label>
                  <div className="mt-1 flex items-center gap-1.5 bg-bg border border-border rounded px-2 py-1.5 text-sm text-white">
                    <Phone size={12} className="text-muted" /> Todas
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-[10px] text-muted uppercase tracking-wide">Faturamento</label>
                <div className="mt-1 flex items-center gap-1.5 bg-bg border border-border rounded px-2 py-1.5 text-sm text-white w-1/2">
                  <DollarSign size={12} className="text-muted" /> Todos
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wide">Período</label>
                <div className="flex gap-3 mt-1.5 mb-2 text-xs">
                  <button
                    onClick={() => setPeriodField("criacao")}
                    className={`flex items-center gap-1 ${
                      periodField === "criacao" ? "text-white" : "text-muted"
                    }`}
                  >
                    <Calendar size={12} /> Data de criação
                  </button>
                  <button
                    onClick={() => setPeriodField("ganho")}
                    className={`flex items-center gap-1 ${
                      periodField === "ganho" ? "text-white" : "text-muted"
                    }`}
                  >
                    <TrendingUp size={12} /> Data de ganho
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PERIOD_OPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriodFilter(periodFilter === p ? null : p)}
                      className={`text-xs rounded px-2 py-1.5 ${
                        periodFilter === p ? "bg-accent text-bg" : "bg-bg border border-border text-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* stats */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-panelmuted flex items-center justify-center text-muted">
            <Target size={16} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{dealsAtivos}</div>
            <div className="text-xs text-muted">Vendas em aberto</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-panelmuted flex items-center justify-center text-muted">
            <DollarSign size={16} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white leading-none">
              {fmtMoney(valorTotal)}
            </div>
            <div className="text-xs text-muted">Valor total</div>
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-emerald-900/40 flex items-center justify-center text-emerald-400">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="text-lg font-semibold text-emerald-400 leading-none">
              {fmtMoney(ganhos)}
            </div>
            <div className="text-xs text-muted">{ganhos} ganhos ({ganhosPct}%)</div>
          </div>
        </div>
      </div>

      {showNewDeal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[480px]">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Briefcase size={16} className="text-accent" /> Novo Deal
              </h3>
              <button onClick={() => setShowNewDeal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-muted text-xs mb-4">
              Busque por email/telefone ou cole um print para extrair com IA
            </p>

            <label className="text-[11px] text-muted uppercase tracking-wide">
              Email, Telefone ou Print
            </label>
            <div className="relative mt-1 mb-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={newLeadInput}
                onChange={(e) => setNewLeadInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createDeal()}
                placeholder="Digite email/telefone ou cole um print (Ctrl+V)..."
                autoFocus
                className="w-full bg-bg border border-accent rounded px-3 py-2.5 pl-8 text-sm text-white"
              />
            </div>
            <p className="text-[11px] text-muted mb-4">
              Busca por email/telefone ou <span className="text-accent">cole um print</span> para
              extrair dados com IA
            </p>

            <div className="bg-bg border border-border rounded-lg h-28 flex items-center justify-center mb-4">
              <span className="text-muted text-xs flex items-center gap-1.5">
                <User size={14} /> {newLeadInput.trim() ? newLeadInput : "Digite para buscar..."}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewDeal(false)}
                className="text-muted text-sm px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => createDeal()}
                className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md flex items-center gap-1.5"
              >
                <User size={14} /> Criar Novo
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Carregando...</p>
      ) : stages.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg p-6 text-sm text-muted">
          Nenhum estágio configurado ainda — rode o
          <code className="mx-1 bg-panelmuted px-1.5 py-0.5 rounded text-xs">
            supabase_migration_003_pipeline_stages_e_rls.sql
          </code>
          no SQL Editor do Supabase pra liberar os dados.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
            const stageValor = stageDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
            const canAdd = !NO_ADD_STAGES.includes(stage.name);
            return (
              <div
                key={stage.id}
                className="w-72 shrink-0"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (sobre !== stage.id) setSobre(stage.id);
                }}
                onDragLeave={() => setSobre((v) => (v === stage.id ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || arrastando;
                  setSobre(null);
                  setArrastando(null);
                  if (id) moveDeal(id, stage.id);
                }}
              >
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-sm font-medium text-white">{stage.name}</span>
                    <span className="text-xs text-muted bg-panelmuted rounded-full px-1.5">
                      {stageDeals.length}
                    </span>
                  </div>
                  {canAdd && (
                    <button
                      onClick={() => setShowNewDeal(true)}
                      className="text-muted hover:text-white text-sm"
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted px-1 mb-2">{fmtMoney(stageValor)}</div>
                <div className={`bg-panel border rounded-lg p-2 min-h-[160px] space-y-2 transition-colors ${sobre === stage.id ? "border-accent bg-accent/5" : "border-border"}`}>
                  {stageDeals.length === 0 && (
                    <div className="text-center py-8">
                      <Target size={22} className="text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted">Nenhuma oportunidade nesta etapa</p>
                      {canAdd && (
                        <button
                          onClick={() => setShowNewDeal(true)}
                          className="text-accent text-xs mt-1"
                        >
                          + Adicionar
                        </button>
                      )}
                    </div>
                  )}
                  {stageDeals.map((deal) => {
                    const name = deal.contacts?.name ?? deal.title;
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", deal.id);
                          e.dataTransfer.effectAllowed = "move";
                          setArrastando(deal.id);
                        }}
                        onDragEnd={() => setArrastando(null)}
                        onClick={() => deal.contact_id && router.push(`/comercial/leads/${deal.contact_id}`)}
                        className={`bg-panelmuted border border-border rounded-md p-3 text-sm cursor-grab active:cursor-grabbing hover:border-accent/50 ${arrastando === deal.id ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{name}</div>
                            <div className="text-muted text-xs flex items-center gap-1">
                              <User size={10} /> {deal.title}
                            </div>
                          </div>
                        </div>
                        <div className="text-white font-semibold text-sm mt-2">
                          {fmtMoney(deal.value ?? 0)}
                        </div>
                        <div className="text-muted text-xs mt-1 flex items-center gap-1">
                          <Calendar size={10} /> {daysSince(deal.created_at)}d nesta etapa
                        </div>
                        <select
                          value={deal.stage_id ?? ""}
                          onChange={(e) => moveDeal(deal.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 w-full bg-bg border border-border rounded text-xs text-muted px-2 py-1"
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
