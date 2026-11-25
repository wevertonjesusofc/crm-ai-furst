"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Plus, X, ArrowLeft, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Template = { id: string; nome: string; assunto: string | null; corpo: string; categoria: string };

const VARIAVEIS = ["@nome", "@primeiro_nome", "@empresa", "@email", "@telefone", "@cidade", "@estado", "@vendedor"];

export default function TemplatesEmailPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("templates_email").select("*").order("created_at", { ascending: false });
    setTemplates((data as Template[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function novoTemplate() {
    const { data } = await supabase
      .from("templates_email")
      .insert({ nome: "Sem título", corpo: "Olá, @nome!\n\nComece a editar este template." })
      .select("*")
      .single();
    if (data) setEditing(data as Template);
    load();
  }

  async function salvar() {
    if (!editing) return;
    await supabase
      .from("templates_email")
      .update({ nome: editing.nome, assunto: editing.assunto, corpo: editing.corpo, categoria: editing.categoria })
      .eq("id", editing.id);
    setEditing(null);
    load();
  }

  async function excluir(id: string) {
    await supabase.from("templates_email").delete().eq("id", id);
    load();
  }

  function inserirVariavel(v: string) {
    if (!editing) return;
    setEditing({ ...editing, corpo: editing.corpo + " " + v });
  }

  if (editing) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setEditing(null)} className="text-muted hover:text-white text-sm flex items-center gap-1.5">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-panelmuted text-muted rounded px-2 py-1">TEMPLATE EMAIL</span>
            <button onClick={salvar} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
              Salvar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[280px_1fr] gap-6">
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wide">Nome do template</label>
            <input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />

            <label className="text-[11px] text-muted uppercase tracking-wide">Assunto do email</label>
            <input value={editing.assunto ?? ""} onChange={(e) => setEditing({ ...editing, assunto: e.target.value })} placeholder="Ex: Bem-vindo à nossa marca" className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />

            <label className="text-[11px] text-muted uppercase tracking-wide">Categoria</label>
            <input value={editing.categoria} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} placeholder="Onboarding" className="w-full bg-panel border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4" />

            <label className="text-[11px] text-muted uppercase tracking-wide mb-2 block">Variáveis disponíveis</label>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS.map((v) => (
                <button key={v} onClick={() => inserirVariavel(v)} className="text-[11px] bg-panelmuted text-accent rounded-full px-2 py-1 hover:bg-panel border border-border">
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted uppercase tracking-wide mb-2 block">Corpo do email</label>
            <textarea
              value={editing.corpo}
              onChange={(e) => setEditing({ ...editing, corpo: e.target.value })}
              rows={16}
              className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 text-sm resize-none"
            />
            <div className="flex gap-2 mt-3">
              <input placeholder="seu@email.com" className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm text-white" />
              <button
                onClick={() => alert("Envio de teste depende de um provedor de email conectado — ainda não implementado.")}
                className="border border-border text-white text-sm px-4 py-2 rounded-md flex items-center gap-1.5"
              >
                <Send size={13} /> Enviar email de teste
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filtered = templates.filter((t) => t.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Email</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Templates</h1>
        <button onClick={novoTemplate} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Novo template
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Reutilize templates em campanhas e automações, com variáveis (@nome, @vendedor, etc).</p>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar templates..." className="bg-panel border border-border rounded-md px-3 py-2 text-sm text-white w-64 mb-4" />

      {filtered.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <FileText size={28} className="text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">Nenhum template ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-panel border border-border rounded-lg p-4">
              <div className="bg-white rounded-md p-3 h-24 overflow-hidden text-[10px] text-gray-700 mb-3">{t.corpo}</div>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">{t.nome}</div>
                  <div className="text-muted text-xs truncate">{t.assunto}</div>
                </div>
                <button onClick={() => excluir(t.id)} className="text-red-500/70 hover:text-red-400 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{t.categoria}</span>
                <button onClick={() => setEditing(t)} className="text-accent text-xs">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
