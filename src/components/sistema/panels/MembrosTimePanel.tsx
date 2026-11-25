"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Membro = { id: string; nome: string; email: string | null; telefone: string | null; cargo: string; time: string };

export default function MembrosTimePanel() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cargo: "vendedor", time: "admin" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("membros_time").select("*").order("created_at");
    setMembros((data as Membro[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.nome.trim()) return;
    await supabase.from("membros_time").insert(form);
    setForm({ nome: "", email: "", telefone: "", cargo: "vendedor", time: "admin" });
    setShowModal(false);
    load();
  }

  async function excluir(id: string) {
    await supabase.from("membros_time").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Membros do Time</h2>
      <p className="text-muted text-sm mb-4">
        Adicione e edite membros da equipe. Defina cargos (admin, vendedor, closer, SDR). Login/permissões de
        acesso reais ainda dependem de autenticação — por enquanto isso é só o cadastro.
      </p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
            <Users size={14} className="text-accent" /> Gestão de Equipe
          </h3>
          <button onClick={() => setShowModal(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Novo Membro
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2 text-[10px] text-muted uppercase tracking-wide py-2 border-t border-border">
          <span>Nome</span>
          <span>Email</span>
          <span>Telefone</span>
          <span>Cargo</span>
          <span>Time</span>
          <span></span>
        </div>
        {membros.map((m) => (
          <div key={m.id} className="grid grid-cols-6 gap-2 text-sm text-white py-2 border-t border-border items-center">
            <span className="truncate">{m.nome}</span>
            <span className="text-muted text-xs truncate">{m.email ?? "—"}</span>
            <span className="text-muted text-xs">{m.telefone ?? "—"}</span>
            <span className="text-[10px] bg-panelmuted text-muted rounded px-1.5 py-0.5 w-fit">{m.cargo}</span>
            <span className="text-[10px] bg-panelmuted text-muted rounded px-1.5 py-0.5 w-fit">{m.time}</span>
            <button onClick={() => excluir(m.id)} className="text-red-500/70 hover:text-red-400 justify-self-end">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {membros.length === 0 && <p className="text-muted text-sm text-center py-4">Nenhum membro cadastrado</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Novo Membro</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Nome</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-muted">Telefone</label>
                <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-muted">Cargo</label>
                <select value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1">
                  <option value="admin">Admin</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="closer">Closer</option>
                  <option value="sdr">SDR</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted">Time</label>
                <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
            </div>
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
