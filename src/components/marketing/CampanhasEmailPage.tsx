"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Plus, X, UserX, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campanha = { id: string; nome: string; assunto: string | null; status: "rascunho" | "enviada"; enviados: number };

const STEPS = ["Básico", "Audiência", "Conteúdo", "Revisão"];

export default function CampanhasEmailPage() {
  const [tab, setTab] = useState<"campanhas" | "descadastros">("campanhas");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ nome: "", assunto: "", remetenteNome: "", remetenteEmail: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("campanhas_email").select("*").order("created_at", { ascending: false });
    setCampanhas((data as Campanha[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salvar() {
    await supabase.from("campanhas_email").insert({
      nome: form.nome.trim(),
      assunto: form.assunto.trim(),
      remetente_nome: form.remetenteNome.trim(),
      remetente_email: form.remetenteEmail.trim(),
    });
    setShowNew(false);
    setStep(0);
    setForm({ nome: "", assunto: "", remetenteNome: "", remetenteEmail: "" });
    load();
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Email</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Campanhas</h1>
        <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova campanha
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Dispare emails em massa para listas filtradas ou leads específicos.</p>

      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setTab("campanhas")} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${tab === "campanhas" ? "bg-panelmuted text-white" : "text-muted"}`}>
          <Mail size={13} /> Campanhas
        </button>
        <button onClick={() => setTab("descadastros")} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${tab === "descadastros" ? "bg-panelmuted text-white" : "text-muted"}`}>
          <UserX size={13} /> Descadastros
        </button>
      </div>

      {tab === "descadastros" ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <UserX size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhum descadastro ainda</p>
        </div>
      ) : campanhas.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Mail size={28} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhuma campanha encontrada</p>
          <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md mt-3">
            + Criar campanha
          </button>
        </div>
      ) : (
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {campanhas.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-white text-sm font-medium">{c.nome}</div>
                <div className="text-muted text-xs">{c.assunto}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{c.status === "rascunho" ? "Rascunho" : "Enviada"}</span>
                <span className="text-muted text-xs">{c.enviados} enviados</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[460px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Nova Campanha Email</h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${i === step ? "bg-accent text-bg" : "bg-panelmuted text-muted"}`}>
                    {i + 1}
                  </span>
                  <span className={`text-xs ${i === step ? "text-white" : "text-muted"}`}>{s}</span>
                  {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted">Nome da Campanha</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Newsletter Março" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                </div>
                <div>
                  <label className="text-[11px] text-muted">Assunto do Email</label>
                  <input value={form.assunto} onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))} placeholder="Ex: Conheça Sua Empresa" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted">Nome do Remetente</label>
                    <input value={form.remetenteNome} onChange={(e) => setForm((f) => ({ ...f, remetenteNome: e.target.value }))} placeholder="Sua Empresa" className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Email do Remetente</label>
                    <input value={form.remetenteEmail} onChange={(e) => setForm((f) => ({ ...f, remetenteEmail: e.target.value }))} placeholder="contato@..." className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                </div>
              </div>
            )}

            {step > 0 && (
              <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs rounded-md px-3 py-3 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Segmentação de audiência, editor de conteúdo e envio de verdade dependem de um provedor de email
                  conectado — ainda não implementado. Você já pode salvar o básico da campanha como rascunho.
                </span>
              </div>
            )}

            <div className="flex justify-between mt-5">
              <button onClick={() => (step > 0 ? setStep(step - 1) : setShowNew(false))} className="text-muted text-sm px-3 py-1.5">
                {step > 0 ? "Voltar" : "Cancelar"}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => (step === 0 && form.nome.trim() ? setStep(step + 1) : step > 0 ? setStep(step + 1) : null)}
                  disabled={step === 0 && !form.nome.trim()}
                  className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md disabled:opacity-50"
                >
                  Próximo
                </button>
              ) : (
                <button onClick={salvar} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                  Salvar rascunho
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
