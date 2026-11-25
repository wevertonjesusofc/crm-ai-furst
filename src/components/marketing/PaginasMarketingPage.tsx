"use client";

import { useEffect, useState, useCallback } from "react";
import { Globe, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pagina = { id: string; nome: string; url: string; visitas: number; leads: number };

export default function PaginasMarketingPage() {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("paginas_marketing").select("*").order("created_at", { ascending: false });
    setPaginas((data as Pagina[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!nome.trim() || !url.trim()) return;
    await supabase.from("paginas_marketing").insert({ nome: nome.trim(), url: url.trim() });
    setNome("");
    setUrl("");
    setShowForm(false);
    load();
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Globe size={20} className="text-accent" /> Páginas
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> Adicionar página
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Acompanhe suas landing pages e descubra quais geram oportunidades.</p>

      {showForm && (
        <div className="bg-panel border border-border rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-[11px] text-muted">Nome da página</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Inscrições da imersão"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] text-muted">URL da landing page</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seusite.com/imersao"
                className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <button onClick={criar} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md self-end">
              Cadastrar
            </button>
          </div>
        </div>
      )}

      {paginas.length === 0 ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Globe size={28} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Sua primeira página começa aqui</p>
          <p className="text-muted text-sm mt-1 mb-4">
            Cadastre a URL — o rastreamento de visitas de verdade depende de instalar um script (integração pendente).
          </p>
          <button onClick={() => setShowForm(true)} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
            Adicionar minha página
          </button>
        </div>
      ) : (
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {paginas.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-white text-sm font-medium">{p.nome}</div>
                <div className="text-muted text-xs">{p.url}</div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-white text-sm font-semibold">{p.visitas}</div>
                  <div className="text-[10px] text-muted">visitas</div>
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{p.leads}</div>
                  <div className="text-[10px] text-muted">leads</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
