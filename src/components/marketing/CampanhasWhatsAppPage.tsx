"use client";

import { useEffect, useState, useCallback } from "react";
import { Send, Bookmark, Smartphone, Upload, Megaphone, Users, MessageSquare, Ban, BarChart3, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campanha = { id: string; nome: string; status: string; leads_contactados: number; responderam: number };

const TABS = [
  { id: "campanhas", label: "Campanhas", Icon: Send },
  { id: "mensagens", label: "Mensagens salvas", Icon: Bookmark },
  { id: "instancias", label: "Instâncias", Icon: Smartphone },
  { id: "importacao", label: "Importação", Icon: Upload },
] as const;

export default function CampanhasWhatsAppPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("campanhas");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("campanhas_whatsapp").select("*").order("created_at", { ascending: false });
    setCampanhas((data as Campanha[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    await supabase.from("campanhas_whatsapp").insert({ nome: "Nova campanha" });
    load();
  }

  const stats = [
    { label: "Total Campanhas", value: campanhas.length, icon: Send },
    { label: "Ativas", value: campanhas.filter((c) => c.status === "ativa").length, icon: Megaphone },
    { label: "Interessados contatados", value: campanhas.reduce((s, c) => s + c.leads_contactados, 0), icon: Users },
    { label: "Responderam", value: campanhas.reduce((s, c) => s + c.responderam, 0), icon: MessageSquare },
    { label: "Taxa Resposta Média", value: "0%", icon: BarChart3 },
    { label: "Bloqueados", value: 0, icon: Ban },
  ];

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-[11px] text-muted uppercase tracking-wide">Marketing · WhatsApp</span>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-white">Campanhas</h1>
        <button onClick={criar} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova campanha
        </button>
      </div>
      <p className="text-muted text-sm mb-6">Dispare mensagens em massa via API Oficial Meta ou instância própria.</p>

      <div className="flex gap-1.5 mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${tab === t.id ? "bg-panelmuted text-white" : "text-muted"}`}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "campanhas" && (
        <>
          <div className="grid grid-cols-6 gap-3 mb-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-panel border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5">
                  <s.icon size={12} /> {s.label}
                </div>
                <div className="text-lg font-semibold text-white">{s.value}</div>
              </div>
            ))}
          </div>
          {campanhas.length === 0 ? (
            <div className="bg-panel border border-border rounded-lg py-16 text-center">
              <Megaphone size={28} className="text-muted mx-auto mb-3" />
              <p className="text-white font-medium">Nenhuma campanha encontrada</p>
              <button onClick={criar} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md mt-3">
                + Criar primeira campanha
              </button>
            </div>
          ) : (
            <div className="bg-panel border border-border rounded-lg divide-y divide-border">
              {campanhas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4">
                  <span className="text-white text-sm">{c.nome}</span>
                  <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mensagens" && (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Bookmark size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhuma mensagem salva ainda</p>
        </div>
      )}

      {tab === "instancias" && (
        <div className="bg-panel border border-border rounded-lg p-5">
          <h3 className="text-white text-sm font-medium mb-1">Instâncias WhatsApp para Campanhas</h3>
          <p className="text-muted text-xs mb-4">Instâncias dedicadas para envio de campanhas em massa (separadas do inbox).</p>
          <div className="py-10 text-center">
            <Smartphone size={26} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm mb-3">Nenhuma instância cadastrada</p>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs rounded-md px-3 py-3 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Depende de uma instância WhatsApp Business real (API Oficial Meta ou provedor tipo UAZAPI) — ver checklist de integrações pendentes.</span>
          </div>
        </div>
      )}

      {tab === "importacao" && (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <Upload size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Importação de contatos pra campanha ainda não disponível — use Importar Leads.</p>
        </div>
      )}
    </div>
  );
}
