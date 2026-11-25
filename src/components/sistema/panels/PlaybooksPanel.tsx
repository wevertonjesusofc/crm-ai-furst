"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Eye, Pencil, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PlaybooksPanel() {
  const [conteudo, setConteudo] = useState("");
  const [mode, setMode] = useState<"editar" | "visualizar">("editar");

  const load = useCallback(async () => {
    const { data } = await supabase.from("playbook").select("conteudo").eq("id", "default").maybeSingle();
    if (data) setConteudo(data.conteudo ?? "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salvar() {
    await supabase.from("playbook").update({ conteudo }).eq("id", "default");
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Playbooks</h2>
      <p className="text-muted text-sm mb-4">Roteiros de vendas passo a passo. A IA vai usar esses playbooks pra sugerir o que falar em cada etapa da negociação (quando o Agent Runtime estiver conectado).</p>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
              <BookOpen size={14} className="text-accent" /> Playbook de Vendas
            </h3>
            <p className="text-muted text-xs">Configure o contexto e diretrizes para a IA de vendas</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMode("editar")} className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 ${mode === "editar" ? "bg-panelmuted text-white" : "text-muted"}`}>
              <Pencil size={12} /> Editar
            </button>
            <button onClick={() => setMode("visualizar")} className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 ${mode === "visualizar" ? "bg-panelmuted text-white" : "text-muted"}`}>
              <Eye size={12} /> Visualizar
            </button>
            <button onClick={load} className="text-muted hover:text-white p-1.5">
              <RefreshCw size={13} />
            </button>
            <button onClick={salvar} className="bg-accent text-bg text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1">
              <Save size={12} /> Salvar
            </button>
          </div>
        </div>

        {mode === "editar" ? (
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Escreva o playbook usando Markdown..."
            rows={14}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white resize-none font-mono"
          />
        ) : (
          <div className="bg-bg border border-border rounded-lg px-3 py-2.5 min-h-[300px] text-sm text-white whitespace-pre-wrap">
            {conteudo || <span className="text-muted italic">Nada escrito ainda.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
