"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Plus, X, ArrowLeft, User, Mail, Phone, Building2, Briefcase, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Formulario = {
  id: string;
  nome: string;
  descricao: string | null;
  campos: string[];
  cor_destaque: string;
  status: "rascunho" | "publicado";
  respostas: number;
};

const CAMPO_CATALOGO: Record<string, { label: string; icon: typeof User; placeholder: string }> = {
  nome: { label: "Nome", icon: User, placeholder: "Seu nome" },
  email: { label: "E-mail", icon: Mail, placeholder: "seu@email.com" },
  telefone: { label: "Telefone", icon: Phone, placeholder: "+55" },
  empresa: { label: "Empresa", icon: Building2, placeholder: "Nome da empresa" },
  cargo: { label: "Cargo", icon: Briefcase, placeholder: "Seu cargo" },
  mensagem: { label: "Mensagem", icon: MessageSquare, placeholder: "Como podemos ajudar?" },
};

const TEMPLATES = [
  { nome: "Em branco", desc: "Comece do zero", campos: [] as string[] },
  { nome: "Captação Simples", desc: "Nome, email e telefone", campos: ["nome", "email", "telefone"] },
  { nome: "Captação Completa", desc: "Todos os campos de qualificação", campos: ["nome", "email", "telefone", "empresa", "cargo", "mensagem"] },
];

export default function FormulariosPage() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Formulario | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("formularios").select("*").order("created_at", { ascending: false });
    setFormularios((data as Formulario[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criarDeTemplate(t: (typeof TEMPLATES)[number]) {
    const { data } = await supabase
      .from("formularios")
      .insert({ nome: t.nome === "Em branco" ? "Novo formulário" : t.nome, descricao: t.desc, campos: t.campos })
      .select("*")
      .single();
    setShowNew(false);
    load();
    if (data) setEditing(data as Formulario);
  }

  async function toggleCampo(campo: string) {
    if (!editing) return;
    const campos = editing.campos.includes(campo) ? editing.campos.filter((c) => c !== campo) : [...editing.campos, campo];
    setEditing({ ...editing, campos });
    await supabase.from("formularios").update({ campos }).eq("id", editing.id);
  }

  async function setCor(cor: string) {
    if (!editing) return;
    setEditing({ ...editing, cor_destaque: cor });
    await supabase.from("formularios").update({ cor_destaque: cor }).eq("id", editing.id);
  }

  async function setStatus(status: "rascunho" | "publicado") {
    if (!editing) return;
    setEditing({ ...editing, status });
    await supabase.from("formularios").update({ status }).eq("id", editing.id);
    load();
  }

  if (editing) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setEditing(null)} className="text-muted hover:text-white text-sm flex items-center gap-1.5">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="flex gap-2">
            <button onClick={() => setStatus("rascunho")} className="text-sm px-3 py-1.5 rounded-md border border-border text-muted">
              Salvar rascunho
            </button>
            <button onClick={() => setStatus("publicado")} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
              Publicar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_420px] gap-6">
          <div>
            <h2 className="text-white text-lg font-medium">{editing.nome}</h2>
            <p className="text-muted text-sm mb-4">{editing.descricao}</p>

            <h3 className="text-[11px] text-muted uppercase tracking-wide mb-2">Campos ({editing.campos.length})</h3>
            <div className="space-y-2 mb-4">
              {Object.entries(CAMPO_CATALOGO).map(([key, meta]) => {
                const active = editing.campos.includes(key);
                return (
                  <div key={key} className="flex items-center justify-between bg-panel border border-border rounded-lg px-3 py-2.5">
                    <span className="text-white text-sm flex items-center gap-2">
                      <meta.icon size={14} className="text-muted" /> {meta.label}
                    </span>
                    <button
                      onClick={() => toggleCampo(key)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${active ? "bg-accent" : "bg-panelmuted border border-border"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${active ? "left-4" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <h3 className="text-[11px] text-muted uppercase tracking-wide mb-2">Cor de destaque</h3>
            <div className="flex gap-2">
              {["#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4", "#f97316"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full ${editing.cor_destaque === c ? "ring-2 ring-white" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-wide mb-2">Preview</h3>
            <div className="bg-white rounded-lg p-6">
              {editing.campos.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Adicione campos pra ver o preview</p>
              ) : (
                <div className="space-y-3">
                  {editing.campos.map((c) => {
                    const meta = CAMPO_CATALOGO[c];
                    if (!meta) return null;
                    return (
                      <div key={c}>
                        <label className="text-xs font-medium text-gray-700">{meta.label}</label>
                        <input
                          disabled
                          placeholder={meta.placeholder}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mt-1"
                        />
                      </div>
                    );
                  })}
                  <button
                    className="w-full text-white font-medium py-2.5 rounded-md mt-2"
                    style={{ backgroundColor: editing.cor_destaque }}
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Captura</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Formulários</h1>
        <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Novo formulário
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Crie formulários embeddáveis para suas landing pages, distribua leads e acompanhe respostas.</p>

      {formularios.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <FileText size={28} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhum formulário ainda</p>
          <p className="text-muted text-sm mt-1 mb-4">Crie seu primeiro formulário para começar a captar leads</p>
          <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
            + Criar formulário
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {formularios.map((f) => (
            <button key={f.id} onClick={() => setEditing(f)} className="text-left bg-panel border border-border rounded-lg p-4 hover:border-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">{f.nome}</span>
                <span className={`text-[10px] rounded-full px-2 py-0.5 ${f.status === "publicado" ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>
                  {f.status === "publicado" ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <p className="text-muted text-xs mb-2">{f.descricao}</p>
              <div className="text-[11px] text-muted">{f.campos.length} campos · {f.respostas} respostas</div>
            </button>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Novo Formulário</h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.nome}
                  onClick={() => criarDeTemplate(t)}
                  className="w-full text-left bg-panelmuted border border-border rounded-lg p-3 hover:border-accent flex items-center gap-3"
                >
                  <FileText size={18} className="text-accent shrink-0" />
                  <div>
                    <div className="text-white text-sm font-medium">{t.nome}</div>
                    <div className="text-muted text-xs">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
