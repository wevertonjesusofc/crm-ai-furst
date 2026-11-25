"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Regra = { id: string; nome: string; condicao: string; canal: string; ativo: boolean };

export default function RegrasAlertaPanel() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", condicao: "", canal: "interno" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("regras_alerta").select("*").order("created_at", { ascending: false });
    setRegras((data as Regra[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.nome.trim() || !form.condicao.trim()) return;
    await supabase.from("regras_alerta").insert(form);
    setForm({ nome: "", condicao: "", canal: "interno" });
    setShowModal(false);
    load();
  }

  async function toggle(r: Regra) {
    setRegras((prev) => prev.map((x) => (x.id === r.id ? { ...x, ativo: !x.ativo } : x)));
    await supabase.from("regras_alerta").update({ ativo: !r.ativo }).eq("id", r.id);
  }

  async function excluir(id: string) {
    await supabase.from("regras_alerta").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Regras de Alerta</h2>
      <p className="text-muted text-sm mb-4">
        Crie regras como: &quot;Se um deal ficar 3 dias sem atualização, notifique o vendedor&quot;. Envio real por
        WhatsApp/email ainda depende da integração de canais — por enquanto, os alertas ficam registrados aqui.
      </p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
            <Bell size={14} className="text-accent" /> Automações de Notificação
          </h3>
          <button onClick={() => setShowModal(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
            <Plus size={14} /> Nova Automação
          </button>
        </div>

        {regras.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={24} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">Nenhuma automação configurada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {regras.map((r) => (
              <div key={r.id} className="bg-panelmuted border border-border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{r.nome}</div>
                  <div className="text-muted text-xs">
                    {r.condicao} · canal: {r.canal}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(r)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${r.ativo ? "bg-accent" : "bg-panel border border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${r.ativo ? "left-4" : "left-0.5"}`} />
                  </button>
                  <button onClick={() => excluir(r.id)} className="text-red-500/70 hover:text-red-400">
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
              <h3 className="text-white font-medium">Nova Regra de Alerta</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <label className="text-[11px] text-muted">Nome</label>
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Oportunidade parada" autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Condição</label>
            <input value={form.condicao} onChange={(e) => setForm((f) => ({ ...f, condicao: e.target.value }))} placeholder="Ex: Oportunidade parada há 3 dias" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />
            <label className="text-[11px] text-muted">Canal</label>
            <select value={form.canal} onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4">
              <option value="interno">Notificação interna</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
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
