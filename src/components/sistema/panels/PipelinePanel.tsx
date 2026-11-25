"use client";

import { useEffect, useState, useCallback } from "react";
import { GitBranch, ChevronUp, ChevronDown, Plus, Trash2, Pencil, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Stage = { id: string; name: string; position: number };

export default function PipelinePanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("pipeline_stages").select("id, name, position").order("position");
    setStages((data as Stage[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mover(index: number, dir: -1 | 1) {
    const alvo = index + dir;
    if (alvo < 0 || alvo >= stages.length) return;
    const a = stages[index];
    const b = stages[alvo];
    const novo = [...stages];
    [novo[index], novo[alvo]] = [novo[alvo], novo[index]];
    setStages(novo);
    await Promise.all([
      supabase.from("pipeline_stages").update({ position: b.position }).eq("id", a.id),
      supabase.from("pipeline_stages").update({ position: a.position }).eq("id", b.id),
    ]);
  }

  async function salvarNome(id: string) {
    if (!editName.trim()) return;
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name: editName.trim() } : s)));
    await supabase.from("pipeline_stages").update({ name: editName.trim() }).eq("id", id);
    setEditingId(null);
  }

  async function adicionar() {
    if (!newName.trim()) return;
    const nextPos = (stages[stages.length - 1]?.position ?? 0) + 1;
    await supabase.from("pipeline_stages").insert({ name: newName.trim(), position: nextPos });
    setNewName("");
    load();
  }

  async function remover(id: string) {
    if (!confirm("Excluir esta etapa? Deals nela ficarão sem etapa.")) return;
    await supabase.from("pipeline_stages").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Pipeline</h2>
      <p className="text-muted text-sm mb-4">Defina as etapas do seu funil de vendas. Cada etapa representa uma fase da negociação.</p>

      <div className="bg-panel border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium flex items-center gap-1.5">
            <GitBranch size={15} className="text-accent" /> Funil de Vendas
          </h3>
          <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{stages.length} etapas</span>
        </div>

        <p className="text-[11px] text-muted uppercase tracking-wide mb-2">Etapas (use as setas para reordenar)</p>
        <div className="space-y-1.5 mb-4">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 bg-panelmuted border border-border rounded-md px-3 py-2">
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-white disabled:opacity-30 p-1 -m-1"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === stages.length - 1}
                  className="text-muted hover:text-white disabled:opacity-30 p-1 -m-1"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <span className="text-muted text-xs w-5">{i + 1}.</span>
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
              {editingId === s.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarNome(s.id)}
                  autoFocus
                  className="flex-1 bg-bg border border-accent rounded px-2 py-1 text-sm text-white"
                />
              ) : (
                <span className="flex-1 text-white text-sm">{s.name}</span>
              )}
              {editingId === s.id ? (
                <button onClick={() => salvarNome(s.id)} className="text-accent">
                  <Check size={14} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(s.id);
                    setEditName(s.name);
                  }}
                  className="text-muted hover:text-white"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button onClick={() => remover(s.id)} className="text-red-500/70 hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Nova etapa..."
            className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white"
          />
          <button onClick={adicionar} className="bg-accent text-bg text-sm font-medium px-4 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
