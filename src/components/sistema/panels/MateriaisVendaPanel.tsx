"use client";

import { useEffect, useState, useCallback } from "react";
import { Folder, Plus, X, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Material = { id: string; nome: string; descricao: string | null; tipo: string; url: string | null };

export default function MateriaisVendaPanel() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "link", url: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("materiais_venda").select("*").order("created_at", { ascending: false });
    setMateriais((data as Material[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.nome.trim()) return;
    await supabase.from("materiais_venda").insert({
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      url: form.url.trim() || null,
    });
    setForm({ nome: "", descricao: "", tipo: "link", url: "" });
    setShowModal(false);
    load();
  }

  async function excluir(id: string) {
    await supabase.from("materiais_venda").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Materiais de Venda</h2>
      <p className="text-muted text-sm mb-4">Guarde links de PDFs, apresentações e documentos que o time comercial usa no dia a dia.</p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white text-sm font-medium">Materiais de Vendas</h3>
            <p className="text-muted text-xs">Biblioteca de links para envio rápido no WhatsApp</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Novo Material
          </button>
        </div>

        {materiais.length === 0 ? (
          <div className="py-10 text-center">
            <Folder size={24} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">Nenhum material encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {materiais.map((m) => (
              <div key={m.id} className="bg-panelmuted border border-border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{m.nome}</div>
                  <div className="text-muted text-xs">
                    {m.tipo} {m.descricao && `· ${m.descricao}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-accent text-xs flex items-center gap-1">
                      Abrir <ExternalLink size={11} />
                    </a>
                  )}
                  <button onClick={() => excluir(m.id)} className="text-red-500/70 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Novo Material</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Nome</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3">
              <option value="link">Link</option>
              <option value="pdf">PDF</option>
              <option value="apresentacao">Apresentação</option>
              <option value="outro">Outro</option>
            </select>
            <label className="text-[11px] text-muted">URL</label>
            <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />
            <p className="text-muted text-[11px] mb-4">Upload direto de arquivo ainda não disponível — por enquanto, cole o link (Google Drive, etc).</p>
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
