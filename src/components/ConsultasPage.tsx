"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  CalendarClock,
  User,
  Stethoscope,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "agendada" | "confirmada" | "realizada" | "faltou" | "cancelada";

type Consulta = {
  id: string;
  paciente_nome: string;
  procedimento: string | null;
  data: string;
  hora: string | null;
  status: Status;
  observacoes: string | null;
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  agendada: { label: "Agendada", color: "text-blue-400", bg: "bg-blue-950/40 border-blue-800/40" },
  confirmada: { label: "Confirmada", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800/40" },
  realizada: { label: "Realizada", color: "text-accent", bg: "bg-accent/10 border-accent/30" },
  faltou: { label: "Faltou", color: "text-red-400", bg: "bg-red-950/40 border-red-800/40" },
  cancelada: { label: "Cancelada", color: "text-muted", bg: "bg-panelmuted border-border" },
};

const STATUS_FILTERS: ("todas" | Status)[] = ["todas", "agendada", "confirmada", "realizada", "faltou", "cancelada"];

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"todas" | Status>("todas");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    paciente: "",
    procedimento: "",
    data: fmt(new Date()),
    hora: "09:00",
    observacoes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultas")
      .select("id, paciente_nome, procedimento, data, hora, status, observacoes")
      .order("data")
      .order("hora");
    setConsultas((data as Consulta[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConsulta() {
    if (!form.paciente.trim()) return;
    await supabase.from("consultas").insert({
      paciente_nome: form.paciente.trim(),
      procedimento: form.procedimento.trim() || null,
      data: form.data,
      hora: form.hora,
      observacoes: form.observacoes.trim() || null,
    });
    setForm({ paciente: "", procedimento: "", data: fmt(new Date()), hora: "09:00", observacoes: "" });
    setShowModal(false);
    load();
  }

  async function updateStatus(id: string, status: Status) {
    setConsultas((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    await supabase.from("consultas").update({ status }).eq("id", id);
  }

  const today = fmt(new Date());
  const filtered = useMemo(
    () => (statusFilter === "todas" ? consultas : consultas.filter((c) => c.status === statusFilter)),
    [consultas, statusFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Consulta[]>();
    for (const c of filtered) {
      if (!map.has(c.data)) map.set(c.data, []);
      map.get(c.data)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const hojeCount = consultas.filter((c) => c.data === today).length;
  const confirmadasCount = consultas.filter((c) => c.status === "confirmada").length;
  const pendentesCount = consultas.filter((c) => c.status === "agendada").length;
  const realizadasCount = consultas.filter((c) => c.status === "realizada").length;

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Consultas</h1>
          <p className="text-muted text-sm mt-0.5">Histórico de atendimentos: paciente, procedimento, data</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> Nova Consulta
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-blue-950/40 text-blue-400 flex items-center justify-center">
            <Calendar size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{hojeCount}</div>
            <div className="text-xs text-muted">Hoje</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
            <CalendarCheck size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{confirmadasCount}</div>
            <div className="text-xs text-muted">Confirmadas</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-amber-950/40 text-amber-400 flex items-center justify-center">
            <CalendarClock size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{pendentesCount}</div>
            <div className="text-xs text-muted">Pendentes</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{realizadasCount}</div>
            <div className="text-xs text-muted">Realizadas</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              statusFilter === s
                ? "bg-accent text-bg border-accent font-medium"
                : "text-muted border-border hover:text-white"
            }`}
          >
            {s === "todas" ? "Todas" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Carregando...</p>
      ) : grouped.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg p-10 text-center">
          <Stethoscope size={28} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhuma consulta encontrada</p>
          <button onClick={() => setShowModal(true)} className="text-accent text-xs mt-1">
            + Agendar consulta
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-white text-sm font-medium capitalize mb-2">
                {date === today ? `Hoje · ${fmtDateLabel(date)}` : fmtDateLabel(date)}
              </h3>
              <div className="bg-panel border border-border rounded-lg divide-y divide-border">
                {items.map((c) => {
                  const meta = STATUS_META[c.status];
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3">
                      <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(c.paciente_nome)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{c.paciente_nome}</div>
                        <div className="text-muted text-xs flex items-center gap-2">
                          {c.hora && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {c.hora}
                            </span>
                          )}
                          {c.procedimento && <span>{c.procedimento}</span>}
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {c.status !== "confirmada" && c.status !== "realizada" && (
                          <button
                            onClick={() => updateStatus(c.id, "confirmada")}
                            title="Confirmar"
                            className="text-muted hover:text-emerald-400 p-1"
                          >
                            <CalendarCheck size={15} />
                          </button>
                        )}
                        {c.status !== "realizada" && (
                          <button
                            onClick={() => updateStatus(c.id, "realizada")}
                            title="Marcar como realizada"
                            className="text-muted hover:text-accent p-1"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {c.status !== "cancelada" && c.status !== "realizada" && (
                          <button
                            onClick={() => updateStatus(c.id, "cancelada")}
                            title="Cancelar"
                            className="text-muted hover:text-red-400 p-1"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Stethoscope size={16} className="text-accent" /> Nova Consulta
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="text-[11px] text-muted">Paciente</label>
            <div className="relative mt-1 mb-3">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={form.paciente}
                onChange={(e) => setForm((f) => ({ ...f, paciente: e.target.value }))}
                placeholder="Nome do paciente"
                autoFocus
                className="w-full bg-bg border border-border rounded px-3 py-2 pl-8 text-sm text-white"
              />
            </div>

            <label className="text-[11px] text-muted">Procedimento</label>
            <input
              value={form.procedimento}
              onChange={(e) => setForm((f) => ({ ...f, procedimento: e.target.value }))}
              placeholder="Ex: Avaliação, Limpeza, Retorno..."
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Hora</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
            </div>

            <label className="text-[11px] text-muted">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="Detalhes adicionais..."
              rows={3}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button
                onClick={saveConsulta}
                className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
