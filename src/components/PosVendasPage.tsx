"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  X,
  MessageSquare,
  Smile,
  Meh,
  Frown,
  HeartPulse,
  Repeat,
  Send,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import UltimasMensagens from "@/components/paciente/UltimasMensagens";

type Satisfacao = "nao_avaliado" | "insatisfeito" | "neutro" | "satisfeito";
type Status = "em_recuperacao" | "recuperado" | "enviado_pipeline";

type PosVenda = {
  id: string;
  contact_id: string;
  paciente_nome: string;
  procedimento: string | null;
  data_procedimento: string;
  dias_recuperacao: number;
  ultimo_checkin_at: string | null;
  follow_ups_realizados: number;
  satisfacao: Satisfacao;
  status: Status;
  observacoes: string | null;
};

const SATISFACAO_META: Record<Satisfacao, { label: string; icon: typeof Smile; color: string }> = {
  nao_avaliado: { label: "Não avaliado", icon: Meh, color: "text-muted" },
  insatisfeito: { label: "Insatisfeito", icon: Frown, color: "text-red-400" },
  neutro: { label: "Neutro", icon: Meh, color: "text-amber-400" },
  satisfeito: { label: "Satisfeito", icon: Smile, color: "text-accent" },
};

const STATUS_FILTERS: ("todos" | Status)[] = ["todos", "em_recuperacao", "recuperado", "enviado_pipeline"];
const STATUS_LABEL: Record<Status, string> = {
  em_recuperacao: "Em Recuperação",
  recuperado: "Recuperado",
  enviado_pipeline: "Enviado ao funil",
};

function daysSince(dateStr: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000));
}
function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PosVendasPage({ initial }: { initial: PosVenda[] }) {
  const [items, setItems] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"todos" | Status>("todos");
  const [showNew, setShowNew] = useState(false);
  const [checkinFor, setCheckinFor] = useState<PosVenda | null>(null);
  const [checkinMsg, setCheckinMsg] = useState(
    "Como está o seu repouso? Está conseguindo descansar direitinho?"
  );
  const [checkinSat, setCheckinSat] = useState<Satisfacao>("satisfeito");

  const [form, setForm] = useState({
    paciente: "",
    procedimento: "",
    dataProcedimento: fmt(new Date()),
    diasRecuperacao: "30",
    observacoes: "",
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pos_venda")
      .select("id, contact_id, procedimento, data_procedimento, dias_recuperacao, ultimo_checkin_at, follow_ups_realizados, satisfacao, status, observacoes, contacts(name)")
      .order("data_procedimento", { ascending: false });
    const mapped = ((data as unknown as (Omit<PosVenda, "paciente_nome"> & { contacts: { name: string } | null })[]) ?? []).map(
      (d) => ({ ...d, paciente_nome: d.contacts?.name ?? "—" })
    );
    setItems(mapped);
  }, []);

  async function createAcompanhamento() {
    const name = form.paciente.trim();
    if (!name) return;
    const { data: contact } = await supabase.from("contacts").insert({ name }).select("id").single();
    if (!contact) return;
    await supabase.from("pos_venda").insert({
      contact_id: contact.id,
      procedimento: form.procedimento.trim() || null,
      data_procedimento: form.dataProcedimento,
      dias_recuperacao: Number(form.diasRecuperacao) || 30,
      observacoes: form.observacoes.trim() || null,
    });
    setForm({ paciente: "", procedimento: "", dataProcedimento: fmt(new Date()), diasRecuperacao: "30", observacoes: "" });
    setShowNew(false);
    load();
  }

  async function saveCheckin() {
    if (!checkinFor) return;
    const dia = daysSince(checkinFor.data_procedimento);
    await supabase.from("activities").insert({
      contact_id: checkinFor.contact_id,
      type: "whatsapp",
      description: `Check-in pós-venda (dia ${dia}/${checkinFor.dias_recuperacao} de recuperação): "${checkinMsg}" — Satisfação: ${SATISFACAO_META[checkinSat].label}`,
    });
    const isRecuperado = dia >= checkinFor.dias_recuperacao;
    await supabase
      .from("pos_venda")
      .update({
        ultimo_checkin_at: new Date().toISOString(),
        follow_ups_realizados: checkinFor.follow_ups_realizados + 1,
        satisfacao: checkinSat,
        status: isRecuperado ? "recuperado" : checkinFor.status,
      })
      .eq("id", checkinFor.id);
    setCheckinFor(null);
    setCheckinMsg("Como está o seu repouso? Está conseguindo descansar direitinho?");
    setCheckinSat("satisfeito");
    load();
  }

  async function enviarParaPipeline(item: PosVenda) {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("position")
      .limit(1)
      .single();
    await supabase.from("deals").insert({
      contact_id: item.contact_id,
      title: `${item.paciente_nome} — retorno/upsell`,
      value: 0,
      stage_id: stage?.id,
      status: "open",
    });
    await supabase.from("pos_venda").update({ status: "enviado_pipeline" }).eq("id", item.id);
    load();
  }

  async function marcarRecuperado(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "recuperado" } : i)));
    await supabase.from("pos_venda").update({ status: "recuperado" }).eq("id", id);
  }

  const filtered = useMemo(
    () => (statusFilter === "todos" ? items : items.filter((i) => i.status === statusFilter)),
    [items, statusFilter]
  );

  const followUpsRealizados = items.reduce((s, i) => s + i.follow_ups_realizados, 0);
  const leadsRecuperados = items.filter((i) => i.status === "recuperado" || i.status === "enviado_pipeline").length;
  const leadsSatisfeitos = items.filter((i) => i.satisfacao === "satisfeito").length;
  const emRecuperacao = items.filter((i) => i.status === "em_recuperacao").length;

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pós-Vendas</h1>
          <p className="text-muted text-sm mt-0.5">
            Acompanhamento de recuperação e satisfação do paciente após o procedimento
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> Novo Acompanhamento
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="rounded-xl p-4 bg-gradient-to-br from-teal-600 to-teal-500 text-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm opacity-90">Follow-ups Realizados</span>
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <MessageSquare size={16} />
            </span>
          </div>
          <div className="text-2xl font-semibold">{followUpsRealizados}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm opacity-90">Leads Recuperados</span>
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <HeartPulse size={16} />
            </span>
          </div>
          <div className="text-2xl font-semibold">{leadsRecuperados}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm opacity-90">Leads Satisfeitos</span>
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Smile size={16} />
            </span>
          </div>
          <div className="text-2xl font-semibold">{leadsSatisfeitos}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-purple-600 to-purple-500 text-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm opacity-90">Mensagens Enviadas</span>
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Send size={16} />
            </span>
          </div>
          <div className="text-2xl font-semibold">{followUpsRealizados}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-orange-600 to-orange-500 text-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm opacity-90">Em Recuperação</span>
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <HeartPulse size={16} />
            </span>
          </div>
          <div className="text-2xl font-semibold">{emRecuperacao}</div>
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
            {s === "todos" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg p-10 text-center">
          <HeartPulse size={28} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhum acompanhamento de pós-venda ainda</p>
          <button onClick={() => setShowNew(true)} className="text-accent text-xs mt-1">
            + Novo acompanhamento
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const dia = daysSince(item.data_procedimento);
            const pct = Math.min(100, Math.round((dia / item.dias_recuperacao) * 100));
            const satMeta = SATISFACAO_META[item.satisfacao];
            const SatIcon = satMeta.icon;
            return (
              <div key={item.id} className="bg-panel border border-border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials(item.paciente_nome)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{item.paciente_nome}</span>
                    <span className={`text-[11px] flex items-center gap-1 ${satMeta.color}`}>
                      <SatIcon size={12} /> {satMeta.label}
                    </span>
                  </div>
                  <div className="text-muted text-xs mb-1">{item.procedimento || "Procedimento não informado"}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-panelmuted rounded-full overflow-hidden max-w-[220px]">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-muted shrink-0">
                      Dia {dia}/{item.dias_recuperacao} de repouso
                    </span>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-panelmuted text-muted shrink-0">
                  {STATUS_LABEL[item.status]}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setCheckinFor(item)}
                    className="text-xs border border-border rounded-md px-2.5 py-1.5 text-white hover:border-accent flex items-center gap-1"
                  >
                    <MessageSquare size={12} /> Check-in
                  </button>
                  {item.status === "em_recuperacao" && (
                    <button
                      onClick={() => marcarRecuperado(item.id)}
                      title="Marcar como recuperado"
                      className="text-muted hover:text-accent p-1.5"
                    >
                      <HeartPulse size={14} />
                    </button>
                  )}
                  {item.satisfacao === "satisfeito" && item.status !== "enviado_pipeline" && (
                    <button
                      onClick={() => enviarParaPipeline(item)}
                      title="Enviar para Pré-Vendas (novo lead/upsell)"
                      className="text-xs bg-accent/15 text-accent rounded-md px-2.5 py-1.5 flex items-center gap-1"
                    >
                      <Repeat size={12} /> Pré-Vendas <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
              <UltimasMensagens contactId={item.contact_id} />
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <HeartPulse size={16} className="text-accent" /> Novo Acompanhamento
              </h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
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
              placeholder="Ex: Cirurgia plástica, Implante..."
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Data do procedimento</label>
                <input
                  type="date"
                  value={form.dataProcedimento}
                  onChange={(e) => setForm((f) => ({ ...f, dataProcedimento: e.target.value }))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Dias de recuperação</label>
                <input
                  type="number"
                  value={form.diasRecuperacao}
                  onChange={(e) => setForm((f) => ({ ...f, diasRecuperacao: e.target.value }))}
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
              <button onClick={() => setShowNew(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button
                onClick={createAcompanhamento}
                className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {checkinFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[440px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" /> Check-in — {checkinFor.paciente_nome}
              </h3>
              <button onClick={() => setCheckinFor(null)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-muted text-xs mb-4">
              Dia {daysSince(checkinFor.data_procedimento)}/{checkinFor.dias_recuperacao} de recuperação ·{" "}
              {checkinFor.procedimento || "procedimento não informado"}
            </p>

            <label className="text-[11px] text-muted">Mensagem enviada / resumo do contato</label>
            <textarea
              value={checkinMsg}
              onChange={(e) => setCheckinMsg(e.target.value)}
              rows={3}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none"
            />

            <label className="text-[11px] text-muted">Como o paciente respondeu?</label>
            <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
              {(["insatisfeito", "neutro", "satisfeito"] as Satisfacao[]).map((s) => {
                const meta = SATISFACAO_META[s];
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    onClick={() => setCheckinSat(s)}
                    className={`flex flex-col items-center gap-1 rounded-md py-2.5 border text-xs ${
                      checkinSat === s ? `border-accent ${meta.color}` : "border-border text-muted"
                    }`}
                  >
                    <Icon size={18} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setCheckinFor(null)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button
                onClick={saveCheckin}
                className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md flex items-center gap-1.5"
              >
                <Calendar size={14} /> Registrar Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
