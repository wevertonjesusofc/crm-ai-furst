"use client";

import { useEffect, useState, useCallback } from "react";
import { Radio, MessageSquare, Globe, FileText, Users, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Canal = { id: string; nome: string; tipo: string; ativo: boolean };

const TABS = [
  { id: "whatsapp", label: "WhatsApp", Icon: MessageSquare },
  { id: "paginas", label: "Páginas externas", Icon: Globe },
  { id: "canais", label: "Canais", Icon: FileText },
  { id: "distribuicoes", label: "Distribuições", Icon: Users },
] as const;

export default function CanaisEntradaPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("paginas");
  const [canais, setCanais] = useState<Canal[]>([]);
  const [nome, setNome] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("canais_entrada").select("*").order("created_at", { ascending: false });
    setCanais((data as Canal[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criarCanal() {
    if (!nome.trim()) return;
    await supabase.from("canais_entrada").insert({ nome: nome.trim(), tipo: "pagina_externa" });
    setNome("");
    load();
  }

  const canaisCount = canais.filter((c) => c.tipo === "pagina_externa").length;

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · Captura</span>
      <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
        <Radio size={20} className="text-accent" /> Canais de Entrada
      </h1>
      <p className="text-muted text-sm mb-6">De onde vêm os leads e pra quem são distribuídos.</p>

      <div className="flex gap-1.5 border-b border-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 px-1 text-sm flex items-center gap-1.5 ${
              tab === t.id ? "text-accent border-b-2 border-accent font-medium" : "text-muted"
            }`}
          >
            <t.Icon size={13} />
            {t.label}
            {t.id === "canais" && ` (${canaisCount})`}
            {t.id === "distribuicoes" && ` (0)`}
          </button>
        ))}
      </div>

      {tab === "paginas" && (
        <div>
          <div className="bg-panel border border-border rounded-lg p-5 mb-4">
            <h3 className="text-white font-medium mb-1">Conecte suas páginas</h3>
            <p className="text-muted text-sm mb-3">Receba os cadastros dos seus formulários e envie cada lead para a pessoa certa.</p>
            <div className="flex gap-2">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarCanal()}
                placeholder="Ex.: Página da imersão"
                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm text-white"
              />
              <button
                onClick={criarCanal}
                className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5"
              >
                <Plus size={14} /> Criar canal
              </button>
            </div>
          </div>

          {canais.filter((c) => c.tipo === "pagina_externa").length > 0 && (
            <div className="space-y-2">
              {canais
                .filter((c) => c.tipo === "pagina_externa")
                .map((c) => (
                  <div key={c.id} className="bg-panel border border-border rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white text-sm">{c.nome}</span>
                    <span className="text-[11px] bg-accent/15 text-accent rounded-full px-2 py-0.5">Ativo</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === "whatsapp" && (
        <div className="bg-panel border border-border rounded-lg py-14 text-center">
          <MessageSquare size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">WhatsApp ainda não conectado — depende da integração de canais (ver checklist).</p>
        </div>
      )}

      {tab === "canais" && (
        <div className="bg-panel border border-border rounded-lg py-14 text-center">
          <FileText size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">{canaisCount === 0 ? "Nenhum canal criado ainda." : `${canaisCount} canal(is) — veja em "Páginas externas".`}</p>
        </div>
      )}

      {tab === "distribuicoes" && (
        <div className="bg-panel border border-border rounded-lg py-14 text-center">
          <Users size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhuma regra de distribuição ainda — faz sentido só com mais de uma pessoa na equipe.</p>
        </div>
      )}
    </div>
  );
}
