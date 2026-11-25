"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Regra = {
  id: string;
  nome: string;
  ativa: boolean;
  evento: string;
  palavras_chave: string | null;
  min_mensagens: number | null;
  acao_tipo: string;
  grupo_responsavel: string | null;
  mensagem: string | null;
  cooldown_min: number;
  max_por_dia: number;
};

export default function RegrasTab({ agenteId }: { agenteId: string }) {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agente_regras").select("*").eq("agente_id", agenteId).order("created_at");
    setRegras((data as Regra[]) ?? []);
    setLoading(false);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function nova() {
    const { data } = await supabase
      .from("agente_regras")
      .insert({
        agente_id: agenteId,
        nome: "Nova regra",
        evento: "lead_mensagem",
        palavras_chave: "caro|preço|valor|orçamento",
        min_mensagens: 3,
        acao_tipo: "notificar_humano",
        grupo_responsavel: "comercial",
        mensagem: "Lead {{lead_name}} disse '{{matched_keyword}}' — assume aí",
        cooldown_min: 60,
        max_por_dia: 1,
      })
      .select("*")
      .single();
    if (data) setRegras((prev) => [...prev, data as Regra]);
  }

  function patch(id: string, fields: Partial<Regra>) {
    setRegras((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  }

  async function salvar(r: Regra) {
    const { id, ...rest } = r;
    await supabase.from("agente_regras").update(rest).eq("id", id);
  }

  async function apagar(id: string) {
    setRegras((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("agente_regras").delete().eq("id", id);
  }

  if (loading) return <p className="text-muted text-sm">Carregando regras...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white text-sm font-medium">Regras de workflow</p>
          <p className="text-muted text-xs">Quando ACONTECER X → faz Y. Aplicado durante a conversa do agente.</p>
        </div>
        <button onClick={nova} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova regra
        </button>
      </div>

      {regras.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-14 text-center">
          <Zap size={24} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhuma regra configurada ainda.</p>
          <p className="text-muted text-xs mt-1">Clica em &quot;Nova regra&quot; pra criar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {regras.map((r) => (
            <div key={r.id} className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${r.ativa ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>
                  {r.ativa ? "Ativa" : "Pausada"}
                </span>
                <input
                  value={r.nome}
                  onChange={(e) => patch(r.id, { nome: e.target.value })}
                  onBlur={() => salvar(r)}
                  className="bg-transparent text-white text-sm font-medium flex-1 mx-3 focus:outline-none"
                />
                <button onClick={() => apagar(r.id)} className="text-red-500/70 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="bg-bg border border-border rounded-md p-3 mb-3">
                <p className="text-[10px] text-accent uppercase tracking-wide mb-2">⚡ Quando (gatilho)</p>
                <label className="text-[11px] text-muted">Evento</label>
                <select
                  value={r.evento}
                  onChange={(e) => {
                    patch(r.id, { evento: e.target.value });
                    salvar({ ...r, evento: e.target.value });
                  }}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-2"
                >
                  <option value="lead_mensagem">💬 Lead enviou mensagem</option>
                  <option value="deal_parado">Deal sem atualização</option>
                  <option value="consulta_agendada">Consulta agendada</option>
                </select>
                <label className="text-[11px] text-muted">Palavras-chave (regex)</label>
                <input
                  value={r.palavras_chave ?? ""}
                  onChange={(e) => patch(r.id, { palavras_chave: e.target.value })}
                  onBlur={() => salvar(r)}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-2 font-mono"
                />
                <label className="text-[11px] text-muted">Só dispara depois de N mensagens (opcional)</label>
                <input
                  type="number"
                  value={r.min_mensagens ?? ""}
                  onChange={(e) => patch(r.id, { min_mensagens: Number(e.target.value) })}
                  onBlur={() => salvar(r)}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1"
                />
              </div>

              <div className="bg-blue-950/20 border border-blue-800/20 rounded-md p-3">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-2">📌 O que faz (ação)</p>
                <label className="text-[11px] text-muted">Tipo</label>
                <select
                  value={r.acao_tipo}
                  onChange={(e) => {
                    patch(r.id, { acao_tipo: e.target.value });
                    salvar({ ...r, acao_tipo: e.target.value });
                  }}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-2"
                >
                  <option value="notificar_humano">🔔 Notificar humano</option>
                  <option value="mudar_etapa">Mudar etapa do funil</option>
                  <option value="criar_tarefa">Criar tarefa</option>
                </select>
                <label className="text-[11px] text-muted">Grupo / responsável</label>
                <input
                  value={r.grupo_responsavel ?? ""}
                  onChange={(e) => patch(r.id, { grupo_responsavel: e.target.value })}
                  onBlur={() => salvar(r)}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-2"
                />
                <label className="text-[11px] text-muted">Mensagem (suporta {"{{lead_name}}"}, {"{{matched_keyword}}"})</label>
                <textarea
                  value={r.mensagem ?? ""}
                  onChange={(e) => patch(r.id, { mensagem: e.target.value })}
                  onBlur={() => salvar(r)}
                  rows={2}
                  className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[11px] text-muted">Cooldown (min)</label>
                  <input
                    type="number"
                    value={r.cooldown_min}
                    onChange={(e) => patch(r.id, { cooldown_min: Number(e.target.value) })}
                    onBlur={() => salvar(r)}
                    className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted">Máx por dia/lead</label>
                  <input
                    type="number"
                    value={r.max_por_dia}
                    onChange={(e) => patch(r.id, { max_por_dia: Number(e.target.value) })}
                    onBlur={() => salvar(r)}
                    className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  patch(r.id, { ativa: !r.ativa });
                  salvar({ ...r, ativa: !r.ativa });
                }}
                className="text-muted hover:text-white text-xs mt-3"
              >
                {r.ativa ? "Pausar" : "Ativar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
