"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Template = { id: string; nome: string; prompt: string; categoria: string };

export default function TemplatesIAPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", prompt: "", categoria: "Geral" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("templates_ia").select("*").order("created_at", { ascending: false });
    setTemplates((data as Template[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.nome.trim() || !form.prompt.trim()) return;
    await supabase.from("templates_ia").insert(form);
    setForm({ nome: "", prompt: "", categoria: "Geral" });
    setShowModal(false);
    load();
  }

  async function excluir(id: string) {
    await supabase.from("templates_ia").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Templates de IA</h2>
      <p className="text-muted text-sm mb-4">
        Crie prompts reutilizáveis para a IA analisar ligações, emails e reuniões. Ex: &quot;Analise o tom da
        conversa e sugira próximos passos&quot;.
      </p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white text-sm font-medium">Templates de Análise IA</h3>
            <p className="text-muted text-xs">Prompts personalizados para análise e geração de mensagens</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Novo Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles size={22} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">Nenhum template ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="bg-panelmuted border border-border rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">{t.nome}</span>
                    <span className="text-[10px] bg-panel text-muted rounded-full px-2 py-0.5 ml-2">{t.categoria}</span>
                  </div>
                  <button onClick={() => excluir(t.id)} className="text-red-500/70 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-muted text-xs mt-1">{t.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[440px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Novo Template de IA</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Nome</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Categoria</label>
            <input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Prompt</label>
            <textarea value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} rows={4} placeholder="Ex: Analise o tom da conversa e sugira próximos passos..." className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="text-muted text-sm px-3 py-1.5">
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
