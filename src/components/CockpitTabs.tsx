"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  SlidersHorizontal,
  Video,
  Clock,
  AlertTriangle,
  Phone,
  CircleCheck,
  BarChart3,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PipelineBoard from "./PipelineBoard";

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
};

function startOfMonthGrid(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const startWeekday = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);
  return gridStart;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

const EVENT_LEGEND = [
  { label: "Call", color: "bg-blue-400" },
  { label: "WhatsApp", color: "bg-emerald-400" },
  { label: "Email", color: "bg-purple-400" },
  { label: "Meeting", color: "bg-indigo-400" },
  { label: "Onboarding", color: "bg-accent" },
  { label: "Interna", color: "bg-gray-400" },
];

const AGENDA_OWNERS = ["Minha agenda"];

function AgendaTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refDate, setRefDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(fmt(new Date()));
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "cal1" | "cal2">("grid");
  const [dayOrPeriod, setDayOrPeriod] = useState<"dia" | "periodo">("dia");
  const [owner, setOwner] = useState(AGENDA_OWNERS[0]);
  const [ownerOpen, setOwnerOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("id, title, due_date, done");
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTask() {
    if (!newTitle.trim()) return;
    await supabase.from("tasks").insert({ title: newTitle.trim(), due_date: selectedDay });
    setNewTitle("");
    load();
  }

  function goToday() {
    const t = new Date();
    setRefDate(t);
    setSelectedDay(fmt(t));
  }
  function prevMonth() {
    setRefDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setRefDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function prevDay() {
    setSelectedDay((d) => {
      const nd = new Date(d + "T00:00:00");
      nd.setDate(nd.getDate() - 1);
      return fmt(nd);
    });
  }
  function nextDay() {
    setSelectedDay((d) => {
      const nd = new Date(d + "T00:00:00");
      nd.setDate(nd.getDate() + 1);
      return fmt(nd);
    });
  }

  const today = fmt(new Date());
  const atrasadas = tasks.filter((t) => !t.done && t.due_date && t.due_date < today).length;
  const hoje = tasks.filter((t) => t.due_date === today).length;
  const concluidasHoje = tasks.filter((t) => t.done && t.due_date === today).length;
  const semana = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const pendentesTotal = tasks.filter((t) => !t.done).length;

  const gridStart = startOfMonthGrid(refDate);
  const days: Date[] = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const monthLabel = refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const tasksByDay = (d: Date) => tasks.filter((t) => t.due_date === fmt(d));
  const selectedDayTasks = tasks.filter((t) => t.due_date === selectedDay);
  const selectedDayLabel = new Date(selectedDay + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
  });

  return (
    <div>
      {/* topo: título + navegação de mês + seletor de agenda + visualização + nova tarefa */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-lg">Minha Agenda</h2>
          <button
            onClick={goToday}
            className="text-xs bg-panelmuted border border-border rounded px-2 py-1 text-muted hover:text-white"
          >
            Hoje
          </button>
          <button onClick={prevMonth} className="text-muted hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="text-muted hover:text-white">
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-white capitalize">{monthLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setOwnerOpen((o) => !o)}
              className="flex items-center gap-2 text-sm bg-panelmuted border border-border rounded-md px-3 py-1.5 text-white"
            >
              {owner}
              <ChevronDown size={14} className="text-muted" />
            </button>
            {ownerOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-panel border border-border rounded-md shadow-lg z-10 text-sm overflow-hidden">
                {AGENDA_OWNERS.map((o) => (
                  <button
                    key={o}
                    onClick={() => {
                      setOwner(o);
                      setOwnerOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-panelmuted text-white flex items-center gap-2"
                  >
                    <Check size={12} className={owner === o ? "text-accent" : "text-transparent"} />
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex bg-panelmuted border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-accent text-bg" : "text-muted hover:text-white"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("cal1")}
              className={`p-1.5 ${viewMode === "cal1" ? "bg-accent text-bg" : "text-muted hover:text-white"}`}
            >
              <CalendarDays size={16} />
            </button>
            <button
              onClick={() => setViewMode("cal2")}
              className={`p-1.5 ${viewMode === "cal2" ? "bg-accent text-bg" : "text-muted hover:text-white"}`}
            >
              <Calendar size={16} />
            </button>
          </div>

          <button
            onClick={() => document.getElementById("nova-tarefa-input")?.focus()}
            className="bg-accent text-bg text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1"
          >
            <Plus size={14} /> Nova tarefa
          </button>
          <button className="text-muted hover:text-white">
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* badges */}
      <div className="flex gap-2 mb-4">
        <span className="text-xs bg-purple-950/40 text-purple-300 border border-purple-800/40 rounded-full px-3 py-1 flex items-center gap-1">
          <Video size={12} /> 0 reuniões
        </span>
        <span className="text-xs bg-yellow-950/40 text-yellow-300 border border-yellow-800/40 rounded-full px-3 py-1 flex items-center gap-1">
          <Clock size={12} /> {pendentesTotal} follow-ups
        </span>
        <span className="text-xs bg-panelmuted text-muted border border-border rounded-full px-3 py-1 flex items-center gap-1">
          <AlertTriangle size={12} /> {atrasadas} atrasadas
        </span>
        <span className="text-xs bg-blue-950/40 text-blue-300 border border-blue-800/40 rounded-full px-3 py-1 flex items-center gap-1">
          <Phone size={12} /> 0 calls
        </span>
      </div>

      <div className="text-xs text-muted mb-4 flex gap-4 items-center">
        <span>Atrasadas: {loading ? "-" : atrasadas}</span>
        <span>Hoje: {loading ? "-" : hoje}</span>
        <span>Semana: {loading ? "-" : semana}</span>
        <span className="flex items-center gap-1">
          <CircleCheck size={12} /> Concluídas hoje: {loading ? "-" : concluidasHoje}
        </span>
      </div>

      <div className="flex gap-4 items-start">
        {/* coluna esquerda: calendário */}
        <div className="flex-1 bg-panel border border-border rounded-lg p-4">
          <p className="text-xs text-muted mb-3">Clique em um dia para ver as tarefas</p>
          <div className="grid grid-cols-7 gap-1 text-xs text-muted mb-1">
            {weekdays.map((w) => (
              <div key={w} className="text-center py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const inMonth = d.getMonth() === refDate.getMonth();
              const isToday = fmt(d) === today;
              const isSelected = fmt(d) === selectedDay;
              const dayTasks = tasksByDay(d);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDay(fmt(d))}
                  className={`min-h-[64px] text-left rounded border p-1 text-xs ${
                    isSelected ? "border-accent ring-1 ring-accent" : "border-border"
                  } ${inMonth ? "text-white" : "text-muted/40"}`}
                >
                  <span
                    className={
                      isToday ? "bg-accent text-bg rounded-full px-1.5 py-0.5" : undefined
                    }
                  >
                    {d.getDate()}
                  </span>
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className={`mt-1 truncate rounded px-1 ${
                        t.done ? "bg-emerald-900/40 text-emerald-300" : "bg-panelmuted text-muted"
                      }`}
                    >
                      {t.title}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-border">
            {EVENT_LEGEND.map((e) => (
              <span key={e.label} className="flex items-center gap-1 text-[11px] text-muted">
                <span className={`w-2 h-2 rounded-full ${e.color}`} />
                {e.label}
              </span>
            ))}
          </div>
        </div>

        {/* coluna direita: dia selecionado */}
        <div className="w-80 shrink-0 bg-panel border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => setDayOrPeriod("dia")}
                className={`text-xs rounded px-2 py-1 ${
                  dayOrPeriod === "dia" ? "bg-accent text-bg font-medium" : "text-muted"
                }`}
              >
                Dia
              </button>
              <button
                onClick={() => setDayOrPeriod("periodo")}
                className={`text-xs rounded px-2 py-1 ${
                  dayOrPeriod === "periodo" ? "bg-accent text-bg font-medium" : "text-muted"
                }`}
              >
                Período
              </button>
            </div>
            <button
              onClick={() => document.getElementById("nova-tarefa-input")?.focus()}
              className="text-xs text-white flex items-center gap-1 hover:text-accent"
            >
              <Plus size={12} /> Nova
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-xs">
              <button onClick={prevDay} className="text-muted hover:text-white">
                <ChevronLeft size={14} />
              </button>
              <button onClick={goToday} className="text-accent font-medium px-1">
                Hoje
              </button>
              <button onClick={nextDay} className="text-muted hover:text-white">
                <ChevronRight size={14} />
              </button>
            </div>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-bg border border-border rounded px-2 py-1 text-xs text-white"
            />
          </div>

          <p className="text-xs text-muted mb-3 capitalize">
            {selectedDayLabel} · {selectedDayTasks.length} pendente
            {selectedDayTasks.length === 1 ? "" : "s"}
          </p>

          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <select className="bg-bg border border-border rounded px-1.5 py-1 text-[11px] text-muted">
              <option>Todos tipos</option>
            </select>
            <select className="bg-bg border border-border rounded px-1.5 py-1 text-[11px] text-muted">
              <option>Todos</option>
            </select>
            <select className="bg-bg border border-border rounded px-1.5 py-1 text-[11px] text-muted">
              <option>Todas</option>
            </select>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              id="nova-tarefa-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              placeholder="Nova tarefa nesse dia..."
              className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-white"
            />
            <button
              onClick={createTask}
              className="bg-accent text-bg text-xs px-2 rounded font-medium"
            >
              +
            </button>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="text-center py-10">
              <Calendar size={28} className="text-muted mx-auto mb-2" />
              <p className="text-xs text-muted mb-2">Nenhuma tarefa neste período</p>
              <button
                onClick={() => document.getElementById("nova-tarefa-input")?.focus()}
                className="text-xs text-accent font-medium"
              >
                Criar tarefa
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedDayTasks.map((t) => (
                <div
                  key={t.id}
                  className={`text-xs rounded px-2 py-1.5 border ${
                    t.done
                      ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-300"
                      : "border-border bg-panelmuted text-white"
                  }`}
                >
                  {t.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecucaoTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, due_date, done")
      .eq("done", false)
      .order("due_date", { ascending: true });
    setTasks((data as Task[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = tasks[index];

  async function complete() {
    if (!current) return;
    await supabase.from("tasks").update({ done: true }).eq("id", current.id);
    setDone((n) => n + 1);
    setIndex((i) => i + 1);
  }

  function skip() {
    setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
  }

  return (
    <div>
      <div className="flex gap-4 mb-6 text-sm text-muted">
        <span>✅ {done} feitas</span>
        <span>⏭ {skipped} puladas</span>
        <span>
          {Math.min(index + 1, tasks.length)}/{tasks.length}
        </span>
      </div>

      <div className="bg-panel border border-border rounded-xl p-10 text-center max-w-xl mx-auto">
        {!current ? (
          <>
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-white font-medium">Nenhuma tarefa na fila</p>
            <p className="text-muted text-sm mt-1">Todas as pendências foram resolvidas.</p>
          </>
        ) : (
          <>
            <div className="text-xs text-muted mb-2">
              Vencimento: {current.due_date ?? "sem data"}
            </div>
            <p className="text-white text-lg font-medium mb-6">{current.title}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={complete}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-md"
              >
                Concluir
              </button>
              <button
                onClick={skip}
                className="bg-panelmuted hover:bg-border text-muted text-sm px-4 py-2 rounded-md"
              >
                Pular
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CockpitTabs() {
  const [tab, setTab] = useState<"agenda" | "pipeline" | "execucao">("agenda");

  return (
    <div>
      <div className="flex gap-1 mb-6 mx-8 bg-panel border border-border rounded-lg p-1 w-fit">
        {[
          { id: "agenda", label: "Agenda", Icon: Calendar },
          { id: "pipeline", label: "Pipeline", Icon: BarChart3 },
          { id: "execucao", label: "Execução", Icon: Zap },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
              tab === t.id ? "bg-accent text-bg font-medium" : "text-muted"
            }`}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="mx-8">
        {tab === "agenda" && <AgendaTab />}
        {tab === "pipeline" && <PipelineBoard />}
        {tab === "execucao" && <ExecucaoTab />}
      </div>
    </div>
  );
}
