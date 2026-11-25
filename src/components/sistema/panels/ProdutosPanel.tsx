"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Produto = { id: string; nome: string; preco: number; sku: string | null; categoria: string | null; status: "ativo" | "inativo" };

function fmtMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export default function ProdutosPanel() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", preco: "0", sku: "", categoria: "", descricao: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });
    setProdutos((data as Produto[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.nome.trim()) return;
    await supabase.from("produtos").insert({
      nome: form.nome.trim(),
      preco: Number(form.preco) || 0,
      sku: form.sku.trim() || null,
      categoria: form.categoria.trim() || null,
      descricao: form.descricao.trim() || null,
    });
    setForm({ nome: "", preco: "0", sku: "", categoria: "", descricao: "" });
    setShowModal(false);
    load();
  }

  async function excluir(id: string) {
    await supabase.from("produtos").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Produtos</h2>
      <p className="text-muted text-sm mb-4">Cadastre os produtos/serviços que sua clínica oferece. Eles aparecem ao criar propostas e calcular comissões.</p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white text-sm font-medium">Produtos</h3>
            <p className="text-muted text-xs">Gerencie os produtos disponíveis para venda</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Novo Produto
          </button>
        </div>

        {produtos.length === 0 ? (
          <div className="grid grid-cols-5 gap-2 text-[10px] text-muted uppercase tracking-wide py-3 border-t border-border">
            <span>Nome</span>
            <span>SKU</span>
            <span>Categoria</span>
            <span>Preço</span>
            <span>Status</span>
          </div>
        ) : (
          <div className="border-t border-border">
            <div className="grid grid-cols-6 gap-2 text-[10px] text-muted uppercase tracking-wide py-2">
              <span>Nome</span>
              <span>SKU</span>
              <span>Categoria</span>
              <span>Preço</span>
              <span>Status</span>
              <span></span>
            </div>
            {produtos.map((p) => (
              <div key={p.id} className="grid grid-cols-6 gap-2 text-sm text-white py-2 border-t border-border items-center">
                <span className="truncate">{p.nome}</span>
                <span className="text-muted text-xs">{p.sku ?? "—"}</span>
                <span className="text-muted text-xs">{p.categoria ?? "—"}</span>
                <span>{fmtMoney(p.preco)}</span>
                <span className={`text-[10px] rounded-full px-2 py-0.5 w-fit ${p.status === "ativo" ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>{p.status}</span>
                <button onClick={() => excluir(p.id)} className="text-red-500/70 hover:text-red-400 justify-self-end">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {produtos.length === 0 && <p className="text-muted text-sm text-center py-4">Nenhum produto cadastrado</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Package size={16} className="text-accent" /> Novo Produto
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Nome</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome do produto" autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Preço (R$)</label>
                <input type="number" value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-muted">SKU</label>
                <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="Código do produto" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
            </div>
            <label className="text-[11px] text-muted">Categoria</label>
            <input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Consulta, Procedimento, Pacote" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />
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
