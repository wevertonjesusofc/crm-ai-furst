"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Pencil,
  Trash2,
  Sparkles,
  RefreshCw,
  GitMerge,
  Tag,
  ChevronDown,
  User,
  Building2,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Plus,
  Briefcase,
  Clock,
  MessageSquare,
  Phone,
  Instagram,
  Calendar,
  Paperclip,
  Folder,
  Mic,
  Smile,
  Wallet,
  CreditCard,
  FileText,
  Trophy,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import FichaClinicaTab from "@/components/paciente/FichaClinicaTab";
import { MOTIVOS_PERDA } from "@/lib/jornada";

type Contact = {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  funcionarios: string | null;
  faturamento: string | null;
  desafios: string | null;
  starred: boolean;
};
type Stage = { id: string; name: string; position: number };
type Deal = { id: string; title: string; value: number | null; stage_id: string | null; status: string; created_at: string };
type Activity = { id: string; type: "call" | "whatsapp" | "email" | "meeting" | "note"; description: string | null; created_at: string };
type Task = { id: string; title: string; due_date: string | null; done: boolean };

const ACTIVITY_META: Record<Activity["type"], { label: string; icon: typeof Phone; bg: string }> = {
  call: { label: "Ligação", icon: Phone, bg: "bg-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, bg: "bg-emerald-500" },
  email: { label: "Email", icon: FileText, bg: "bg-purple-500" },
  meeting: { label: "Reunião", icon: Calendar, bg: "bg-indigo-500" },
  note: { label: "Nota", icon: FileText, bg: "bg-gray-500" },
};

const TABS = ["Timeline", "Ficha clínica", "Comercial", "Mensagens", "Interações", "Social Selling", "Financeiro", "Notas"] as const;
type Tab = (typeof TABS)[number];

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
function fmtMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR")}`;
}
function daysSince(dateStr: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function EditableField({
  label,
  icon,
  value,
  onSave,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  return (
    <div className="bg-panelmuted border border-border rounded-md px-3 py-2 group">
      <div className="text-[11px] text-muted flex items-center gap-1.5">
        {icon} {label}
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onSave(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditing(false);
              onSave(draft);
            }
          }}
          className="w-full bg-bg border border-accent rounded px-1.5 py-1 text-sm text-white mt-1"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm mt-0.5 flex items-center justify-between"
        >
          <span className={value ? "text-white" : "text-muted italic"}>{value || "Não informado"}</span>
          <Pencil size={11} className="text-muted opacity-0 group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

export default function LeadDetailPage({
  contact: initialContact,
  stages,
  deals: initialDeals,
  activities,
  tasks: initialTasks,
}: {
  contact: Contact;
  stages: Stage[];
  deals: Deal[];
  activities: Activity[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [deals, setDeals] = useState(initialDeals);
  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<Tab>("Ficha clínica");
  const [timelineFilter, setTimelineFilter] = useState<"Todos" | "Comercial" | "CS">("Todos");
  const [taskFilter, setTaskFilter] = useState<"pendentes" | "concluidas">("pendentes");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [localActivities, setLocalActivities] = useState(activities);

  const primaryDeal = deals[0];
  const ganhoStage = stages.find((s) => s.name === "Ganho");
  const perdidoStage = stages.find((s) => s.name === "Perdido");

  const qualificacaoDone = [contact.company, contact.funcionarios, contact.faturamento, contact.desafios].filter(
    Boolean
  ).length;

  const ltv = deals.filter((d) => d.status === "won").reduce((sum, d) => sum + (d.value ?? 0), 0);
  const noFunilDias = primaryDeal ? daysSince(primaryDeal.created_at) : daysSince(contact.created_at);

  async function saveField(field: keyof Contact, value: string) {
    setContact((c) => ({ ...c, [field]: value }));
    await supabase.from("contacts").update({ [field]: value }).eq("id", contact.id);
  }

  async function toggleStar() {
    const next = !contact.starred;
    setContact((c) => ({ ...c, starred: next }));
    await supabase.from("contacts").update({ starred: next }).eq("id", contact.id);
  }

  async function deleteContact() {
    if (!confirm(`Excluir ${contact.name}? Essa ação não pode ser desfeita.`)) return;
    await supabase.from("contacts").delete().eq("id", contact.id);
    router.push("/comercial/pipeline");
  }

  async function moveStage(stageId: string) {
    if (!primaryDeal) return;
    const isGanho = stageId === ganhoStage?.id;
    const isPerdido = stageId === perdidoStage?.id;
    const status = isGanho ? "won" : isPerdido ? "lost" : "open";
    setDeals((prev) => prev.map((d) => (d.id === primaryDeal.id ? { ...d, stage_id: stageId, status } : d)));
    await supabase.from("deals").update({ stage_id: stageId, status }).eq("id", primaryDeal.id);
  }

  async function setDealOutcome(dealId: string, outcome: "won" | "lost") {
    if (outcome === "lost") {
      setMotivoPara(dealId);
      return;
    }
    const stageId = ganhoStage?.id;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, status: outcome, stage_id: stageId ?? d.stage_id } : d))
    );
    await supabase.from("deals").update({ status: outcome, stage_id: stageId }).eq("id", dealId);
  }

  // Perdeu: o sistema pergunta o motivo, para a jornada mostrar por que não fecham.
  const [motivoPara, setMotivoPara] = useState<string | null>(null);
  async function confirmarPerda(motivo: string) {
    if (!motivoPara) return;
    const stageId = perdidoStage?.id;
    const dealId = motivoPara;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: "lost", stage_id: stageId ?? d.stage_id } : d)));
    await supabase.from("deals").update({ status: "lost", stage_id: stageId, motivo_perda: motivo }).eq("id", dealId);
    setMotivoPara(null);
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    const { data } = await supabase
      .from("tasks")
      .insert({ title: newTaskTitle.trim(), contact_id: contact.id })
      .select("id, title, due_date, done")
      .single();
    if (data) setTasks((prev) => [...prev, data as Task]);
    setNewTaskTitle("");
  }

  async function toggleTask(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await supabase.from("tasks").update({ done }).eq("id", id);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    const { data } = await supabase
      .from("activities")
      .insert({ contact_id: contact.id, type: "note", description: newNote.trim() })
      .select("id, type, description, created_at")
      .single();
    if (data) setLocalActivities((prev) => [data as Activity, ...prev]);
    setNewNote("");
  }

  const filteredTasks = tasks.filter((t) => (taskFilter === "pendentes" ? !t.done : t.done));
  const notes = useMemo(() => localActivities.filter((a) => a.type === "note"), [localActivities]);

  return (
    <div className="mx-8 pb-8">
      <Link href="/comercial/pipeline" className="text-muted hover:text-white text-sm flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="bg-panel border border-border border-t-2 border-t-accent rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-lg">
              {initials(contact.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white text-xl font-semibold">{contact.name}</h1>
                <button onClick={toggleStar} className={contact.starred ? "text-amber-400" : "text-muted hover:text-white"}>
                  <Star size={16} fill={contact.starred ? "currentColor" : "none"} />
                </button>
                <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Sparkles size={10} /> 0 / 100
                </span>
                <button className="text-muted hover:text-white">
                  <Pencil size={14} />
                </button>
                <button onClick={deleteContact} className="text-red-500/70 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">
                  &lt;{daysSince(contact.created_at)}D
                </span>
                <button className="text-[11px] text-muted hover:text-white flex items-center gap-1">
                  <Plus size={10} /> Tag
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Recalcular (IA ainda não configurada)"
              className="bg-accent/90 text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5 opacity-70 cursor-not-allowed"
            >
              <Sparkles size={14} /> Recalcular
            </button>
            <button onClick={() => router.refresh()} className="text-muted hover:text-white border border-border rounded-md p-2">
              <RefreshCw size={14} />
            </button>
            <button
              title="Mesclar (em breve)"
              className="text-muted border border-border rounded-md px-3 py-2 text-sm flex items-center gap-1.5 opacity-70 cursor-not-allowed"
            >
              <GitMerge size={14} /> Mesclar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-xs text-muted flex items-center gap-1 bg-panelmuted rounded-md px-2 py-1.5">
            <Briefcase size={12} /> Funil de Vendas <ChevronDown size={12} />
          </span>
          {stages.map((s) => {
            const active = s.id === primaryDeal?.stage_id;
            const isPerdido = s.name === "Perdido";
            return (
              <button
                key={s.id}
                onClick={() => moveStage(s.id)}
                disabled={!primaryDeal}
                className={`text-xs px-2.5 py-1.5 rounded-md ${
                  active
                    ? isPerdido
                      ? "bg-red-600 text-white"
                      : "bg-accent text-bg font-medium"
                    : "text-muted hover:text-white disabled:hover:text-muted"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-muted">
          <Clock size={12} /> Lead há {daysSince(contact.created_at)} dias
          <span className="bg-panelmuted rounded-full px-2 py-0.5 flex items-center gap-1">
            <User size={10} /> weverton jesus
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-panel border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-red-400">0</div>
          <div className="text-[11px] text-muted">Score</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-white">{fmtMoney(ltv)}</div>
          <div className="text-[11px] text-muted">LTV</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-white">{deals.length}</div>
          <div className="text-[11px] text-muted">Vendas</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-white">{noFunilDias}d</div>
          <div className="text-[11px] text-muted">No Funil</div>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-4 items-start">
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium">Qualificação</h3>
              <span className="text-xs text-muted">{qualificacaoDone}/4</span>
            </div>
            <div className="space-y-2">
              <EditableField
                label="Empresa"
                icon={<Building2 size={11} />}
                value={contact.company}
                onSave={(v) => saveField("company", v)}
              />
              <EditableField
                label="Funcionários"
                icon={<Users size={11} />}
                value={contact.funcionarios}
                onSave={(v) => saveField("funcionarios", v)}
              />
              <EditableField
                label="Faturamento"
                icon={<DollarSign size={11} />}
                value={contact.faturamento}
                onSave={(v) => saveField("faturamento", v)}
              />
              <EditableField
                label="Desafios"
                icon={<AlertCircle size={11} />}
                value={contact.desafios}
                onSave={(v) => saveField("desafios", v)}
              />
            </div>
          </div>

          <div className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent" /> Tarefas
              </h3>
            </div>
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setTaskFilter("pendentes")}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  taskFilter === "pendentes" ? "bg-accent text-bg font-medium" : "text-muted border border-border"
                }`}
              >
                Pendentes ({tasks.filter((t) => !t.done).length})
              </button>
              <button
                onClick={() => setTaskFilter("concluidas")}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  taskFilter === "concluidas" ? "bg-accent text-bg font-medium" : "text-muted border border-border"
                }`}
              >
                Concluídas ({tasks.filter((t) => t.done).length})
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Nova tarefa..."
                className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-white"
              />
              <button onClick={addTask} className="bg-accent text-bg text-xs px-2 rounded font-medium">
                <Plus size={12} />
              </button>
            </div>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 size={20} className="text-muted mx-auto mb-1" />
                <p className="text-xs text-muted">
                  Nenhuma tarefa {taskFilter === "pendentes" ? "pendente" : "concluída"}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-white bg-panelmuted rounded px-2 py-1.5">
                    <input type="checkbox" checked={t.done} onChange={(e) => toggleTask(t.id, e.target.checked)} />
                    <span className={t.done ? "line-through text-muted" : ""}>{t.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-panel border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
                <Briefcase size={14} className="text-accent" /> Oportunidades ({deals.length})
              </h3>
              <button className="text-accent text-xs flex items-center gap-1">
                <Plus size={12} /> Novo
              </button>
            </div>
            <div className="space-y-2">
              {deals.map((d) => {
                const stage = stages.find((s) => s.id === d.stage_id);
                return (
                  <div key={d.id} className="bg-panelmuted border border-border rounded-md p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted mb-1">
                      <Briefcase size={10} /> Funil de Vendas ·{" "}
                      <span className="text-white font-medium">{stage?.name ?? "—"}</span>
                    </div>
                    <div className="text-white font-semibold text-sm">{fmtMoney(d.value ?? 0)}</div>
                    <div className="text-muted text-xs mb-2">weverton jesus</div>
                    {d.status === "open" && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDealOutcome(d.id, "won")}
                          className="flex-1 text-xs border border-emerald-800/40 text-emerald-400 rounded px-2 py-1 flex items-center justify-center gap-1"
                        >
                          <Trophy size={11} /> Ganho
                        </button>
                        <button
                          onClick={() => setDealOutcome(d.id, "lost")}
                          className="flex-1 text-xs border border-red-800/40 text-red-400 rounded px-2 py-1 flex items-center justify-center gap-1"
                        >
                          <XCircle size={11} /> Perdido
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {deals.length === 0 && <p className="text-muted text-xs text-center py-2">Nenhuma oportunidade ainda</p>}
            </div>
          </div>
        </div>

        <div>
          <div className="flex gap-1 mb-4 bg-panel border border-border rounded-lg p-1 w-fit flex-wrap">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs ${
                  tab === t ? "bg-accent text-bg font-medium" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Timeline" && (
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-medium flex items-center gap-1.5">
                    <Clock size={14} className="text-accent" /> Jornada do Lead
                  </h3>
                  <p className="text-muted text-xs">Histórico completo de interações</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-panelmuted border border-border rounded-md overflow-hidden text-xs">
                    {(["Todos", "Comercial", "CS"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTimelineFilter(f)}
                        className={`px-2.5 py-1 ${timelineFilter === f ? "bg-accent text-bg font-medium" : "text-muted"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted">{localActivities.length} eventos</span>
                </div>
              </div>
              {localActivities.length === 0 ? (
                <div className="text-center py-10">
                  <Clock size={26} className="text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">Nenhuma interação registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localActivities.map((a) => {
                    const meta = ACTIVITY_META[a.type];
                    const Icon = meta.icon;
                    return (
                      <div key={a.id} className="flex gap-3">
                        <span className={`w-7 h-7 rounded-full ${meta.bg} text-white flex items-center justify-center shrink-0`}>
                          <Icon size={13} />
                        </span>
                        <div className="flex-1 bg-panelmuted border border-border rounded-md p-3">
                          <div className="text-[11px] text-muted mb-1">
                            {new Date(a.created_at).toLocaleString("pt-BR")} · {meta.label}
                          </div>
                          <p className="text-white text-sm">{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "Comercial" && (
            <div className="bg-panel border border-border rounded-lg p-8 text-center">
              <h3 className="text-white font-medium flex items-center justify-center gap-1.5 mb-4">
                <Sparkles size={16} className="text-purple-400" /> Inteligência IA
              </h3>
              <Sparkles size={28} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm mb-4">Gere insights completos sobre este lead usando IA</p>
              <button
                onClick={() => alert("IA ainda não configurada nesta versão do CRM AURA.")}
                className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md inline-flex items-center gap-2"
              >
                <Sparkles size={14} /> Gerar Inteligência Completa
              </button>
            </div>
          )}

          {tab === "Mensagens" && (
            <div className="bg-panel border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <button className="flex items-center gap-1 bg-panelmuted rounded-md px-2.5 py-1.5 text-white">
                    <MessageSquare size={12} /> WhatsApp
                  </button>
                  <button className="flex items-center gap-1 text-muted px-2.5 py-1.5">
                    <Instagram size={12} /> Instagram
                  </button>
                  <button className="flex items-center gap-1 text-muted px-2.5 py-1.5 border border-border rounded-md">
                    <Calendar size={12} /> Agendar Msg
                  </button>
                  <button className="flex items-center gap-1 text-muted px-2.5 py-1.5 border border-border rounded-md">
                    <MessageSquare size={12} /> Reunião
                  </button>
                </div>
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Inativo
                </span>
              </div>
              <div className="bg-accent px-4 py-2 text-bg font-medium text-sm">{contact.name}</div>
              <div className="h-56 flex items-center justify-center text-muted text-sm">Nenhuma mensagem ainda</div>
              <div className="flex items-center gap-2 p-3 border-t border-border">
                <Smile size={16} className="text-muted" />
                <span className="text-[11px] text-muted border border-border rounded px-2 py-1 flex items-center gap-1">
                  Atendimento <ChevronDown size={10} />
                </span>
                <Paperclip size={16} className="text-muted" />
                <Folder size={16} className="text-muted" />
                <input
                  disabled
                  placeholder="Digite uma mensagem... (integração de WhatsApp ainda não conectada)"
                  className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs text-muted"
                />
                <Mic size={16} className="text-muted" />
              </div>
            </div>
          )}

          {tab === "Interações" && (
            <div className="bg-panel border border-border rounded-lg overflow-hidden">
              <div className="flex gap-2 p-3 border-b border-border text-xs">
                <button className="flex items-center gap-1 bg-panelmuted rounded-md px-2.5 py-1.5 text-white">
                  <Phone size={12} /> Chamadas
                </button>
                <button className="flex items-center gap-1 text-muted px-2.5 py-1.5">
                  <Calendar size={12} /> Reuniões
                </button>
              </div>
              <div className="py-14 text-center">
                <Phone size={26} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">Nenhuma chamada registrada</p>
                <p className="text-muted text-xs mt-1">As chamadas aparecerão aqui</p>
              </div>
            </div>
          )}

          {tab === "Social Selling" && (
            <div className="bg-panel border border-border rounded-lg p-5">
              <h3 className="text-white font-medium flex items-center gap-1.5 mb-4">
                <Instagram size={15} className="text-accent" /> Iniciar fluxo de Social Selling
              </h3>
              <label className="text-[11px] text-muted">@ do Instagram do lead</label>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="ex: frank.costa"
                  className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => alert("Automação de Social Selling ainda não implementada nesta versão.")}
                  className="bg-accent text-bg text-sm font-medium px-4 rounded-md"
                >
                  Iniciar
                </button>
              </div>
              <p className="text-muted text-xs mt-2">
                O fluxo padrão é de 7 dias com aquecimento progressivo (curtir → reagir → comentar → DM).
              </p>
            </div>
          )}

          {tab === "Financeiro" && (
            <div className="space-y-4">
              <div className="bg-panel border border-border rounded-lg p-8 text-center">
                {deals.filter((d) => d.status === "won").length === 0 ? (
                  <>
                    <Wallet size={26} className="text-muted mx-auto mb-2" />
                    <p className="text-muted text-sm">Nenhuma venda fechada ainda</p>
                  </>
                ) : (
                  <div className="text-left space-y-2">
                    {deals
                      .filter((d) => d.status === "won")
                      .map((d) => (
                        <div key={d.id} className="flex justify-between text-sm">
                          <span className="text-white">{d.title}</span>
                          <span className="text-accent font-medium">{fmtMoney(d.value ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="bg-panel border border-border rounded-lg p-5">
                <h3 className="text-white font-medium flex items-center gap-1.5 mb-3">
                  <CreditCard size={15} className="text-accent" /> Pagamentos
                </h3>
                <div className="text-center py-8">
                  <CreditCard size={24} className="text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">Nenhum pagamento registrado</p>
                </div>
              </div>
            </div>
          )}

          {motivoPara && (
            <div className="mb-4 bg-panel border border-amber-500/40 rounded-lg p-4">
              <div className="text-white text-sm font-medium mb-2">Por que não fechou?</div>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_PERDA.map((m) => (
                  <button key={m} onClick={() => confirmarPerda(m)} className="text-xs border border-border rounded-full px-3 py-1.5 text-white hover:border-accent">
                    {m}
                  </button>
                ))}
                <button onClick={() => setMotivoPara(null)} className="text-xs text-muted px-2">Cancelar</button>
              </div>
            </div>
          )}

          {tab === "Ficha clínica" && <FichaClinicaTab contactId={contact.id} />}

          {tab === "Notas" && (
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium flex items-center gap-1.5">
                  <FileText size={15} className="text-accent" /> Notas & Interações
                </h3>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Escrever uma nota..."
                  className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={addNote}
                  className="bg-accent text-bg text-sm font-medium px-4 rounded-md flex items-center gap-1.5"
                >
                  <Plus size={14} /> Adicionar Nota
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={24} className="text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">Nenhuma nota registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-panelmuted border border-border rounded-md p-3">
                      <div className="text-[11px] text-muted mb-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                      <p className="text-white text-sm">{n.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
