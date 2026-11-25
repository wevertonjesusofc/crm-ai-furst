"use client";

import { useEffect, useState, useCallback } from "react";
import { Workflow, Plus, X, Zap, Mail, MessageSquare, Bot, Clock, GitBranch, Pencil, Tag, ClipboardCheck, Square, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Automacao = { id: string; nome: string; descricao: string | null; gatilho: string; ativo: boolean };

const PASSOS = [
  { nome: "Enviar Email", desc: "Disparar template", Icon: Mail },
  { nome: "Enviar WhatsApp", desc: "Mensagem via API", Icon: MessageSquare },
  { nome: "Follow-up do Agente", desc: "IA responde com contexto", Icon: Bot },
  { nome: "Esperar", desc: "Atrasar execução", Icon: Clock },
  { nome: "Condição (Se/Então)", desc: "Bifurcar fluxo", Icon: GitBranch },
  { nome: "Atualizar Campo", desc: "Mudar stage/score", Icon: Pencil },
  { nome: "Adicionar Tag", desc: "Marcar lead", Icon: Tag },
  { nome: "Criar Tarefa", desc: "Pra vendedor", Icon: ClipboardCheck },
  { nome: "Fim", desc: "Encerrar fluxo", Icon: Square },
];

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [building, setBuilding] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gatilho, setGatilho] = useState("lead_criado");

  const load = useCallback(async () => {
    const { data } = await supabase.from("automacoes").select("*").order("created_at", { ascending: false });
    setAutomacoes((data as Automacao[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salvar() {
    await supabase.from("automacoes").insert({ nome: nome.trim() || "Nova automação", descricao: descricao.trim(), gatilho });
    setBuilding(false);
    setNome("");
    setDescricao("");
    load();
  }

  if (building) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setBuilding(false)} className="text-muted hover:text-white text-sm flex items-center gap-1.5">
            <ArrowLeft size={14} /> Voltar
          </button>
          <button onClick={salvar} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
            Salvar
          </button>
        </div>
        <div className="grid grid-cols-[280px_1fr] gap-6">
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wide">Gatilho</label>
            <select value={gatilho} onChange={(e) => setGatilho(e.target.value)} className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4">
              <option value="lead_criado">Lead criado</option>
              <option value="deal_ganho">Venda ganha</option>
              <option value="consulta_agendada">Consulta agendada</option>
              <option value="pos_venda_satisfeito">Pós-venda satisfeito</option>
            </select>

            <label className="text-[11px] text-muted uppercase tracking-wide">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da automação" className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4" />

            <label className="text-[11px] text-muted uppercase tracking-wide">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que essa automação faz?" rows={3} className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />

            <label className="text-[11px] text-muted uppercase tracking-wide mb-2 block">Adicionar Passo</label>
            <div className="space-y-1.5">
              {PASSOS.map((p) => (
                <div key={p.nome} className="flex items-center gap-2 bg-panel border border-border rounded-md px-2.5 py-2 opacity-60 cursor-not-allowed">
                  <p.Icon size={13} className="text-muted" />
                  <div>
                    <div className="text-white text-xs">{p.nome}</div>
                    <div className="text-muted text-[10px]">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-center pt-8">
            <div className="bg-panel border-2 border-accent rounded-xl p-5 w-72">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg">
                  <Zap size={16} />
                </span>
                <span className="text-accent text-[11px] font-medium uppercase tracking-wide">Gatilho</span>
              </div>
              <div className="text-white font-medium">{gatilho === "lead_criado" ? "Interessado cadastrado" : gatilho}</div>
              <p className="text-muted text-sm mt-1">Quando a condição acontecer</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2 mt-6">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            Os passos (enviar email/WhatsApp, esperar, condições) ainda não são executáveis — a automação salva
            a configuração, mas rodar de verdade depende de um motor de execução (Agent Runtime + integrações de
            envio). Ver checklist de integrações pendentes.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Email</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Automações</h1>
        <button onClick={() => setBuilding(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova automação
        </button>
      </div>
      <p className="text-muted text-sm mb-6">
        Fluxos visuais disparados por gatilhos: <em>lead novo → email + espera 2 dias → outro email.</em>
      </p>

      {automacoes.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Workflow size={28} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhuma automação ainda</p>
          <p className="text-muted text-sm mt-1 mb-4">Monte fluxos visuais que rodam sozinhos. Ideal pra welcome series, follow-up, reativação, etc.</p>
          <button onClick={() => setBuilding(true)} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
            + Criar primeira automação
          </button>
        </div>
      ) : (
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {automacoes.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-white text-sm font-medium">{a.nome}</div>
                <div className="text-muted text-xs">{a.descricao}</div>
              </div>
              <span className={`text-[11px] rounded-full px-2 py-0.5 ${a.ativo ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>{a.ativo ? "Ativa" : "Inativa"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
