"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TOOL_CATALOG, ToolPolicy } from "../toolCatalog";

type ToolRow = { id: string; tool_key: string; tool_label: string; tool_desc: string | null; policy: ToolPolicy };

const POLICIES: { key: ToolPolicy; label: string }[] = [
  { key: "sempre", label: "Sempre" },
  { key: "aprovacao", label: "Com aprovação" },
  { key: "desativada", label: "Desativada" },
];

export default function ToolsTab({ agenteId }: { agenteId: string }) {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agente_tools").select("*").eq("agente_id", agenteId).order("tool_label");

    if ((data?.length ?? 0) === 0) {
      const seed = TOOL_CATALOG.map((t) => ({
        agente_id: agenteId,
        tool_key: t.key,
        tool_label: t.label,
        tool_desc: t.desc,
      }));
      const { data: inserted } = await supabase.from("agente_tools").insert(seed).select("*");
      setTools((inserted as ToolRow[]) ?? []);
    } else {
      setTools(data as ToolRow[]);
    }
    setLoading(false);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setPolicy(id: string, policy: ToolPolicy) {
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, policy } : t)));
    await supabase.from("agente_tools").update({ policy }).eq("id", id);
  }

  if (loading) return <p className="text-muted text-sm">Carregando tools...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-sm font-medium">{tools.length} tools</p>
      </div>
      <div className="space-y-2">
        {tools.map((t) => (
          <div key={t.id} className="bg-panel border border-border rounded-lg p-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-mono">{t.tool_label}</span>
                <span className="text-[9px] bg-panelmuted text-muted rounded px-1.5 py-0.5">sql</span>
              </div>
              <p className="text-muted text-xs mt-0.5">{t.tool_desc}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {POLICIES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPolicy(t.id, p.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border ${
                    t.policy === p.key
                      ? p.key === "desativada"
                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                        : "border-accent text-accent bg-accent/10"
                      : "border-border text-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted text-xs mt-4">
        A execução real dessas ferramentas (rodar a query, mandar a resposta) depende do Agent Runtime — aqui você
        já define quais o agente vai poder usar e a política de aprovação de cada uma.
      </p>
    </div>
  );
}
