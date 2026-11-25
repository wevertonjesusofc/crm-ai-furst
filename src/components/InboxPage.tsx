"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  MessageSquare,
  Instagram,
  Plus,
  X,
  Smile,
  Paperclip,
  Folder,
  Mic,
  CheckCircle2,
  Clock,
  Phone,
  Info,
  ClipboardList,
  FileText,
  User,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Channel = "whatsapp" | "instagram";
type ConvStatus = "aberta" | "concluida";

type Conversa = {
  id: string;
  contact_id: string;
  channel: Channel;
  status: ConvStatus;
  last_message_at: string | null;
  contacts: { name: string; whatsapp: string | null; phone: string | null } | null;
};

type Mensagem = { id: string; direction: "enviada" | "recebida"; body: string; created_at: string };
type Task = { id: string; title: string; due_date: string | null; done: boolean };
type Note = { id: string; description: string | null; created_at: string };

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

export default function InboxPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [channelFilter, setChannelFilter] = useState<"todos" | Channel>("todos");
  const [search, setSearch] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [rightTab, setRightTab] = useState<"info" | "tarefas" | "notas">("info");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  const [newConvChannel, setNewConvChannel] = useState<Channel>("whatsapp");

  const loadConversas = useCallback(async () => {
    const { data } = await supabase
      .from("conversas")
      .select("id, contact_id, channel, status, last_message_at, contacts(name, whatsapp, phone)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const list = (data as unknown as Conversa[]) ?? [];
    setConversas(list);

    const previewEntries: Record<string, string> = {};
    await Promise.all(
      list.map(async (c) => {
        const { data: last } = await supabase
          .from("mensagens")
          .select("body")
          .eq("conversa_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last) previewEntries[c.id] = last.body;
      })
    );
    setPreviews(previewEntries);
  }, []);

  useEffect(() => {
    loadConversas();
  }, [loadConversas]);

  const selected = conversas.find((c) => c.id === selectedId) ?? null;

  const loadThread = useCallback(async (conversaId: string, contactId: string) => {
    const [{ data: msgs }, { data: taskRows }, { data: activityRows }] = await Promise.all([
      supabase.from("mensagens").select("id, direction, body, created_at").eq("conversa_id", conversaId).order("created_at"),
      supabase.from("tasks").select("id, title, due_date, done").eq("contact_id", contactId).order("due_date"),
      supabase
        .from("activities")
        .select("id, description, created_at")
        .eq("contact_id", contactId)
        .eq("type", "note")
        .order("created_at", { ascending: false }),
    ]);
    setMessages((msgs as Mensagem[]) ?? []);
    setTasks((taskRows as Task[]) ?? []);
    setNotes((activityRows as Note[]) ?? []);
  }, []);

  function selectConversa(c: Conversa) {
    setSelectedId(c.id);
    setRightTab("info");
    loadThread(c.id, c.contact_id);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selected) return;
    const body = newMsg.trim();
    setNewMsg("");
    const { data } = await supabase
      .from("mensagens")
      .insert({ conversa_id: selected.id, direction: "enviada", body })
      .select("id, direction, body, created_at")
      .single();
    if (data) setMessages((prev) => [...prev, data as Mensagem]);
    await supabase.from("conversas").update({ last_message_at: new Date().toISOString() }).eq("id", selected.id);
    loadConversas();
  }

  async function concluirConversa() {
    if (!selected) return;
    await supabase.from("conversas").update({ status: "concluida" }).eq("id", selected.id);
    loadConversas();
  }

  async function createConversa() {
    const name = newConvName.trim();
    if (!name) return;
    const { data: contact } = await supabase.from("contacts").insert({ name }).select("id").single();
    if (!contact) return;
    const { data: conv } = await supabase
      .from("conversas")
      .insert({ contact_id: contact.id, channel: newConvChannel })
      .select("id, contact_id, channel, status, last_message_at, contacts(name, whatsapp, phone)")
      .single();
    setShowNewConv(false);
    setNewConvName("");
    await loadConversas();
    if (conv) selectConversa(conv as unknown as Conversa);
  }

  async function addTask() {
    if (!newTask.trim() || !selected) return;
    const { data } = await supabase
      .from("tasks")
      .insert({ title: newTask.trim(), contact_id: selected.contact_id })
      .select("id, title, due_date, done")
      .single();
    if (data) setTasks((prev) => [...prev, data as Task]);
    setNewTask("");
  }

  async function toggleTask(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await supabase.from("tasks").update({ done }).eq("id", id);
  }

  async function addNote() {
    if (!newNote.trim() || !selected) return;
    const { data } = await supabase
      .from("activities")
      .insert({ contact_id: selected.contact_id, type: "note", description: newNote.trim() })
      .select("id, description, created_at")
      .single();
    if (data) setNotes((prev) => [data as Note, ...prev]);
    setNewNote("");
  }

  const filtered = useMemo(() => {
    let list = conversas;
    if (channelFilter !== "todos") list = list.filter((c) => c.channel === channelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.contacts?.name.toLowerCase().includes(q) || (previews[c.id] ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversas, channelFilter, search, previews]);

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Conversas</h1>
          <p className="text-muted text-xs flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewConv(true)}
            className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <Plus size={14} /> Nova Conversa
          </button>
          <button className="text-muted hover:text-white border border-border rounded-md p-2">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr_300px] gap-0 border border-border rounded-lg overflow-hidden" style={{ height: 620 }}>
        {/* coluna 1: lista de conversas */}
        <div className="border-r border-border flex flex-col bg-panel">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex gap-1 bg-panelmuted rounded-md p-1">
              {(["todos", "whatsapp", "instagram"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setChannelFilter(f)}
                  className={`flex-1 text-xs py-1.5 rounded flex items-center justify-center gap-1 ${
                    channelFilter === f ? "bg-accent text-bg font-medium" : "text-muted"
                  }`}
                >
                  {f === "whatsapp" && <MessageSquare size={11} />}
                  {f === "instagram" && <Instagram size={11} />}
                  {f === "todos" ? "Todos" : f === "whatsapp" ? "WhatsApp" : "Instagram"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome ou mensagem"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 pl-7 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare size={22} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-xs">Nenhuma conversa ainda</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversa(c)}
                  className={`w-full text-left p-3 border-b border-border/60 hover:bg-panelmuted/60 ${
                    selectedId === c.id ? "bg-panelmuted" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(c.contacts?.name ?? "?")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-xs font-medium truncate">{c.contacts?.name}</span>
                        <span className="text-[10px] text-muted shrink-0">{timeAgo(c.last_message_at)}</span>
                      </div>
                      <div className="text-muted text-[11px] truncate">{previews[c.id] ?? "Sem mensagens"}</div>
                      <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                        {c.channel === "whatsapp" ? <MessageSquare size={9} /> : <Instagram size={9} />}
                        {c.channel === "whatsapp" ? "WhatsApp" : "Instagram"}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* coluna 2: thread */}
        <div className="flex flex-col bg-bg">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">Selecione uma conversa</div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2 bg-panel">
                <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold">
                  {initials(selected.contacts?.name ?? "?")}
                </span>
                <div>
                  <div className="text-white text-sm font-medium">{selected.contacts?.name}</div>
                  <div className="text-muted text-[11px]">{selected.channel === "whatsapp" ? "WhatsApp" : "Instagram"}</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted text-sm">Nenhuma mensagem ainda</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "enviada" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.direction === "enviada" ? "bg-accent text-bg" : "bg-panelmuted text-white"
                        }`}
                      >
                        {m.body}
                        <div className={`text-[10px] mt-1 ${m.direction === "enviada" ? "text-bg/70" : "text-muted"}`}>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {selected.status === "aberta" && (
                <div className="mx-3 mb-2 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs rounded-md px-3 py-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Tudo certo — você pode continuar enviando.
                </div>
              )}
              <div className="flex items-center gap-2 p-3 border-t border-border">
                <Smile size={16} className="text-muted" />
                <Paperclip size={16} className="text-muted" />
                <Folder size={16} className="text-muted" />
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-panel border border-border rounded px-3 py-1.5 text-sm text-white"
                />
                <Mic size={16} className="text-muted" />
              </div>
            </>
          )}
        </div>

        {/* coluna 3: info do lead */}
        <div className="border-l border-border bg-panel flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted text-xs text-center px-4">
              Selecione uma conversa para ver os dados do lead.
            </div>
          ) : (
            <>
              <div className="p-4 text-center border-b border-border">
                <span className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-semibold mx-auto mb-2">
                  {initials(selected.contacts?.name ?? "?")}
                </span>
                <div className="text-white text-sm font-medium">{selected.contacts?.name}</div>
                <div className="text-muted text-[11px] mb-3">Lead</div>
                <span
                  className={`text-[11px] rounded-full px-2 py-1 flex items-center justify-center gap-1 w-fit mx-auto ${
                    selected.status === "aberta"
                      ? "bg-amber-950/40 text-amber-400"
                      : "bg-emerald-950/40 text-emerald-400"
                  }`}
                >
                  <Clock size={10} /> {selected.status === "aberta" ? "Aguardando" : "Concluída"}
                </span>
                <div className="text-muted text-[11px] flex items-center justify-center gap-1 mt-2">
                  <Phone size={11} /> {selected.contacts?.whatsapp || selected.contacts?.phone || "—"}
                </div>
                {selected.status === "aberta" && (
                  <button
                    onClick={concluirConversa}
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-1.5 rounded-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={13} /> Concluir conversa
                  </button>
                )}
              </div>

              <div className="flex border-b border-border">
                {[
                  { id: "info" as const, label: "Info", Icon: Info },
                  { id: "tarefas" as const, label: "Tarefas", Icon: ClipboardList },
                  { id: "notas" as const, label: "Notas", Icon: FileText },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRightTab(t.id)}
                    className={`flex-1 text-xs py-2 flex items-center justify-center gap-1 ${
                      rightTab === t.id ? "text-accent border-b-2 border-accent font-medium" : "text-muted"
                    }`}
                  >
                    <t.Icon size={12} /> {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {rightTab === "info" && (
                  <div className="text-xs text-muted">
                    <div className="text-[10px] uppercase tracking-wide mb-1">Produtos</div>
                    <p className="mb-4">Nenhum produto</p>
                    <div className="text-[10px] uppercase tracking-wide mb-1">Financeiro</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-panelmuted rounded-md p-2">
                        <div className="text-white text-sm font-semibold">R$ 0</div>
                        <div className="text-[10px] text-muted">LTV</div>
                      </div>
                      <div className="bg-panelmuted rounded-md p-2">
                        <div className="text-white text-sm font-semibold">0</div>
                        <div className="text-[10px] text-muted">Compras</div>
                      </div>
                    </div>
                  </div>
                )}
                {rightTab === "tarefas" && (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTask()}
                        placeholder="Nova tarefa..."
                        className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-white"
                      />
                      <button onClick={addTask} className="bg-accent text-bg text-xs px-2 rounded font-medium">
                        <Plus size={12} />
                      </button>
                    </div>
                    {tasks.length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle2 size={20} className="text-muted mx-auto mb-1" />
                        <p className="text-muted text-xs">Nenhuma tarefa pendente</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {tasks.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-xs text-white bg-panelmuted rounded px-2 py-1.5">
                            <input type="checkbox" checked={t.done} onChange={(e) => toggleTask(t.id, e.target.checked)} />
                            <span className={t.done ? "line-through text-muted" : ""}>{t.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {rightTab === "notas" && (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNote()}
                        placeholder="Nota interna..."
                        className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-white"
                      />
                      <button onClick={addNote} className="bg-accent text-bg text-xs px-2 rounded font-medium">
                        <Plus size={12} />
                      </button>
                    </div>
                    {notes.length === 0 ? (
                      <div className="text-center py-6">
                        <FileText size={20} className="text-muted mx-auto mb-1" />
                        <p className="text-muted text-xs">Nenhuma nota registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {notes.map((n) => (
                          <div key={n.id} className="bg-panelmuted rounded px-2 py-1.5">
                            <div className="text-[10px] text-muted">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                            <div className="text-white text-xs">{n.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showNewConv && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[380px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" /> Nova Conversa
              </h3>
              <button onClick={() => setShowNewConv(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Contato</label>
            <div className="relative mt-1 mb-3">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={newConvName}
                onChange={(e) => setNewConvName(e.target.value)}
                placeholder="Nome do contato"
                autoFocus
                className="w-full bg-bg border border-border rounded px-3 py-2 pl-8 text-sm text-white"
              />
            </div>
            <label className="text-[11px] text-muted">Canal</label>
            <div className="grid grid-cols-2 gap-2 mt-1 mb-4">
              <button
                onClick={() => setNewConvChannel("whatsapp")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm border ${
                  newConvChannel === "whatsapp" ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                <MessageSquare size={14} /> WhatsApp
              </button>
              <button
                onClick={() => setNewConvChannel("instagram")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm border ${
                  newConvChannel === "instagram" ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                <Instagram size={14} /> Instagram
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewConv(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button onClick={createConversa} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
