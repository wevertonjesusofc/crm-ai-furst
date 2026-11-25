"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertTriangle, Calendar, CalendarDays, CheckCircle2, List, Kanban, Plus, X, Phone, MessageSquare, Mail, ClipboardCheck, User, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tipo = "ligacao" | "reuniao" | "tarefa" | "email";
type Task = {
  id: string;
  title: string;
  due_date: string | null;
  hora: string | null;
  done: boolean;
  tipo: Tipo;
  contact_id: string | null;
  contacts: { name: string } | null;
};
type Contact = { id: string; name: string };

const TIPO_META: Record<Tipo, { label: string; Icon: typeof Phone }> = {
  ligacao: { label: "Ligação", Icon: Phone },
  reuniao: { label: "Reunião", Icon: Users },
  tarefa: { label: "Tarefa", Icon: ClipboardCheck },
  email: { label: "Email", Icon: Mail },
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function TarefasGestaoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scope, setScope] = useState<"minhas" | "time">("minhas");
  const [view, setView] = useState<"lista" | "kanban" | "calendario">("lista");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ tipo: "ligacao" as Tipo, titulo: "", contactId: "", data: fmt(new Date()), hora: "19:00", notas: "" });

  const load = useCallback(async () => {
    const [{ data: taskRows }, { data: contactRows }] = await Promise.all([
      supabase.from("tasks").select("id, title, due_date, hora, done, tipo, contact_id, contacts(name)").order("due_date"),
      supabase.from("contacts").select("id, name").order("name"),
    ]);
    setTasks((taskRows as unknown as Task[]) ?? []);
    setContacts((contactRows as Contact[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.titulo.trim()) return;
    await supabase.from("tasks").insert({
      title: form.titulo.trim(),
      tipo: form.tipo,
      contact_id: form.contactId || null,
      due_date: form.data,
      hora: form.hora,
    });
    setShowNew(false);
    setForm({ tipo: "ligacao", titulo: "", contactId: "", data: fmt(new Date()), hora: "19:00", notas: "" });
    load();
  }

  async function toggleDone(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
  }

  const today = fmt(new Date());
  const atrasadas = tasks.filter((t) => !t.done && t.due_date && t.due_date < today).length;
  const hoje = tasks.filter((t) => t.due_date === today).length;
  const semana = tasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = (new Date(t.due_date).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const concluidas = tasks.filter((t) => t.done).length;

  const pendentes = useMemo(() => tasks.filter((t) => !t.done), [tasks]);

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Gestão de Tarefas</h1>
          <p className="text-muted text-sm mt-0.5">Suas tarefas pendentes e concluídas</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center">
            <AlertTriangle size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{atrasadas}</div>
            <div className="text-xs text-muted">Atrasadas</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-blue-950/40 text-blue-400 flex items-center justify-center">
            <Calendar size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{hoje}</div>
            <div className="text-xs text-muted">Hoje</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-purple-950/40 text-purple-400 flex items-center justify-center">
            <CalendarDays size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{semana}</div>
            <div className="text-xs text-muted">Esta Semana</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{concluidas}</div>
            <div className="text-xs text-muted">Concluídas</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-panel border border-border rounded-md overflow-hidden">
          <button onClick={() => setScope("minhas")} className={`text-sm px-3 py-1.5 flex items-center gap-1.5 ${scope === "minhas" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
            <User size={13} /> Minhas Tarefas
          </button>
          <button onClick={() => setScope("time")} className={`text-sm px-3 py-1.5 flex items-center gap-1.5 ${scope === "time" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
            <Users size={13} /> Todo o Time
          </button>
        </div>
        <span className="text-muted text-sm">{tasks.length} tarefas</span>
      </div>

      <div className="flex gap-1 bg-panel border border-border rounded-lg p-1 w-fit mb-4">
        <button onClick={() => setView("lista")} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${view === "lista" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
          <List size={13} /> Lista
        </button>
        <button onClick={() => setView("kanban")} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${view === "kanban" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
          <Kanban size={13} /> Kanban
        </button>
        <button onClick={() => setView("calendario")} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${view === "calendario" ? "bg-accent text-bg font-medium" : "text-muted"}`}>
          <Calendar size={13} /> Calendário
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Calendar size={28} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-muted text-sm mt-1">As tarefas aparecerão aqui quando forem criadas</p>
        </div>
      ) : view === "lista" ? (
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {tasks.map((t) => {
            const meta = TIPO_META[t.tipo] ?? TIPO_META.tarefa;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} />
                <meta.Icon size={14} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.done ? "line-through text-muted" : "text-white"}`}>{t.title}</div>
                  <div className="text-muted text-xs">
                    {t.contacts?.name ?? "sem cliente"} {t.due_date && `· ${t.due_date}`} {t.hora && `${t.hora}`}
                  </div>
                </div>
                <span className="text-[10px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{meta.label}</span>
              </div>
            );
          })}
        </div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(TIPO_META) as Tipo[]).map((tipo) => {
            const meta = TIPO_META[tipo];
            const items = pendentes.filter((t) => t.tipo === tipo);
            return (
              <div key={tipo}>
                <div className="flex items-center gap-1.5 text-white text-sm font-medium mb-2">
                  <meta.Icon size={13} /> {meta.label} <span className="text-muted text-xs">({items.length})</span>
                </div>
                <div className="bg-panel border border-border rounded-lg p-2 min-h-[120px] space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="bg-panelmuted border border-border rounded-md p-2.5 text-xs text-white">
                      {t.title}
                      <div className="text-muted mt-1">{t.contacts?.name ?? "sem cliente"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-panel border border-border rounded-lg p-4">
          {Array.from(new Set(tasks.filter((t) => t.due_date).map((t) => t.due_date))).sort()!.map((date) => (
            <div key={date} className="mb-3">
              <div className="text-white text-sm font-medium mb-1">{date}</div>
              <div className="space-y-1">
                {tasks
                  .filter((t) => t.due_date === date)
                  .map((t) => (
                    <div key={t.id} className="text-xs text-muted bg-panelmuted rounded px-2 py-1.5">
                      {t.hora && `${t.hora} · `}
                      {t.title}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[440px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Phone size={16} className="text-accent" /> Nova Tarefa
              </h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as Tipo }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1">
                  {(Object.keys(TIPO_META) as Tipo[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_META[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted">Responsável</label>
                <div className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1">weverton jesus</div>
              </div>
            </div>

            <label className="text-[11px] text-muted">Título *</label>
            <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />

            <label className="text-[11px] text-muted">Cliente</label>
            <select value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3">
              <option value="">Buscar cliente...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-muted">Hora</label>
                <input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
            </div>

            <label className="text-[11px] text-muted">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Observações..." rows={2} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button onClick={criar} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
