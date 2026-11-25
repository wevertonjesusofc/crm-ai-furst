"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Nota = { id: string; titulo: string; conteudo: string; updated_at: string };

export default function NotasTab({ agenteId }: { agenteId: string }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [selected, setSelected] = useState<Nota | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agente_notas").select("*").eq("agente_id", agenteId).order("updated_at", { ascending: false });
    setNotas((data as Nota[]) ?? []);
    setLoading(false);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function nova() {
    const { data } = await supabase
      .from("agente_notas")
      .insert({ agente_id: agenteId, titulo: "Sem título", conteudo: "" })
      .select("*")
      .single();
    if (data) {
      setNotas((prev) => [data as Nota, ...prev]);
      setSelected(data as Nota);
    }
  }

  async function salvar(n: Nota) {
    setNotas((prev) => prev.map((x) => (x.id === n.id ? n : x)));
    await supabase.from("agente_notas").update({ titulo: n.titulo, conteudo: n.conteudo }).eq("id", n.id);
  }

  async function apagar(id: string) {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
    await supabase.from("agente_notas").delete().eq("id", id);
  }

  if (loading) return <p className="text-muted text-sm">Carregando notas...</p>;

  const filtradas = notas.filter((n) => n.titulo.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 h-[500px]">
      <div className="flex flex-col min-h-0">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nota..."
              className="w-full bg-panel border border-border rounded-md pl-7 pr-2 py-2 text-sm text-white"
            />
          </div>
          <button onClick={nova} className="bg-accent text-bg rounded-md px-3">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtradas.length === 0 ? (
            <div className="text-center py-10">
              <FileText size={22} className="text-muted mx-auto mb-2" />
              <p className="text-muted text-xs">Nenhuma nota ainda.</p>
              <p className="text-muted text-[11px] mt-1">O agente vai começar a criar quando você ou ele precisar lembrar de algo.</p>
            </div>
          ) : (
            filtradas.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n)}
                className={`w-full text-left rounded-md px-3 py-2 ${
                  selected?.id === n.id ? "bg-panelmuted border border-accent" : "bg-panel border border-border hover:border-accent"
                }`}
              >
                <p className="text-white text-sm truncate">{n.titulo}</p>
                <p className="text-muted text-xs truncate">{n.conteudo || "Sem conteúdo"}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 flex flex-col min-h-0">
        {selected ? (
          <>
            <input
              value={selected.titulo}
              onChange={(e) => setSelected({ ...selected, titulo: e.target.value })}
              onBlur={() => salvar(selected)}
              className="bg-transparent text-white font-medium text-lg mb-3 focus:outline-none"
            />
            <textarea
              value={selected.conteudo}
              onChange={(e) => setSelected({ ...selected, conteudo: e.target.value })}
              onBlur={() => salvar(selected)}
              className="flex-1 bg-bg border border-border rounded-md p-3 text-sm text-white resize-none"
            />
            <button onClick={() => apagar(selected.id)} className="text-red-500/70 hover:text-red-400 text-xs mt-3 flex items-center gap-1.5 self-start">
              <Trash2 size={12} /> Apagar nota
            </button>
          </>
        ) : (
          <div className="m-auto text-center">
            <FileText size={26} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">Seleciona uma nota à esquerda</p>
            <p className="text-muted text-xs mt-1">ou clica + pra criar uma nova</p>
          </div>
        )}
      </div>
    </div>
  );
}
