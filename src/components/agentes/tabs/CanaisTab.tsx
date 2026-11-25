"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Send, Instagram, Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Canal = {
  id: string;
  tipo: "chat_web" | "telegram" | "whatsapp" | "instagram" | "botao_flutuante";
  ativo: boolean;
  prioridade: number;
  config: Record<string, string>;
};

const TIPO_LABEL: Record<Canal["tipo"], string> = {
  chat_web: "Chat web",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  botao_flutuante: "Botão flutuante",
};

const TIPO_ICON: Record<Canal["tipo"], typeof MessageSquare> = {
  chat_web: MessageSquare,
  telegram: Send,
  whatsapp: Send,
  instagram: Instagram,
  botao_flutuante: MessageSquare,
};

export default function CanaisTab({ agenteId, agenteNome }: { agenteId: string; agenteNome: string }) {
  const [canais, setCanais] = useState<Canal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agente_canais").select("*").eq("agente_id", agenteId);

    if ((data?.length ?? 0) === 0) {
      const { data: inserted } = await supabase
        .from("agente_canais")
        .insert({ agente_id: agenteId, tipo: "chat_web", ativo: true, config: {} })
        .select("*");
      setCanais((inserted as Canal[]) ?? []);
    } else {
      setCanais(data as Canal[]);
    }
    setLoading(false);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAtivo(c: Canal) {
    setCanais((prev) => prev.map((x) => (x.id === c.id ? { ...x, ativo: !x.ativo } : x)));
    await supabase.from("agente_canais").update({ ativo: !c.ativo }).eq("id", c.id);
  }

  async function remover(id: string) {
    setCanais((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("agente_canais").delete().eq("id", id);
  }

  async function updateConfig(c: Canal, key: string, value: string) {
    const novoConfig = { ...c.config, [key]: value };
    setCanais((prev) => prev.map((x) => (x.id === c.id ? { ...x, config: novoConfig } : x)));
    await supabase.from("agente_canais").update({ config: novoConfig }).eq("id", c.id);
  }

  async function adicionar(tipo: Canal["tipo"]) {
    const { data } = await supabase
      .from("agente_canais")
      .insert({ agente_id: agenteId, tipo, ativo: true, config: {} })
      .select("*")
      .single();
    if (data) setCanais((prev) => [...prev, data as Canal]);
  }

  function gerarSecret(c: Canal) {
    const secret = crypto.randomUUID().replace(/-/g, "");
    updateConfig(c, "webhook_secret", secret);
  }

  if (loading) return <p className="text-muted text-sm">Carregando canais...</p>;

  const disponiveis: Canal["tipo"][] = (["telegram", "whatsapp", "instagram", "botao_flutuante"] as Canal["tipo"][]).filter(
    (t) => !canais.some((c) => c.tipo === t)
  );

  return (
    <div>
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3">Canais ativos ({canais.length})</p>
      <div className="space-y-4">
        {canais.map((c) => {
          const Icon = TIPO_ICON[c.tipo];
          return (
            <div key={c.id} className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={15} className="text-accent" />
                  <span className="text-white text-sm font-medium">{TIPO_LABEL[c.tipo]}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${c.ativo ? "bg-accent/15 text-accent" : "bg-panelmuted text-muted"}`}>
                    {c.ativo ? "Ativo" : "Pausado"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleAtivo(c)} className="text-xs text-muted hover:text-white">
                    {c.ativo ? "Pausar" : "Ativar"}
                  </button>
                  {c.tipo !== "chat_web" && (
                    <button onClick={() => remover(c.id)} className="text-red-500/70 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {c.tipo === "chat_web" && (
                <p className="text-muted text-xs italic">Rota auto: /agentes/{agenteId}</p>
              )}

              {c.tipo === "telegram" && (
                <div className="space-y-3">
                  <div className="bg-blue-950/30 border border-blue-800/30 text-blue-300 text-xs rounded-md p-3">
                    <b>Como conectar:</b> abre o Telegram, fala com @BotFather, manda /newbot, cola o token abaixo.
                    A conexão de verdade (webhook recebendo mensagens) depende do Agent Runtime.
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Token do bot (do BotFather)</label>
                    <input
                      value={c.config.token ?? ""}
                      onChange={(e) => updateConfig(c, "token", e.target.value)}
                      placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Secret do webhook (auto-gerado)</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        readOnly
                        value={c.config.webhook_secret ?? ""}
                        placeholder="clica em gerar →"
                        className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white font-mono"
                      />
                      <button onClick={() => gerarSecret(c)} className="border border-border text-muted hover:text-white rounded-md px-3">
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {c.tipo === "whatsapp" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-muted">Número WhatsApp (instância)</label>
                    <input
                      value={c.config.numero ?? ""}
                      onChange={(e) => updateConfig(c, "numero", e.target.value)}
                      placeholder="Conecte um número em Meu Espaço"
                      className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-1.5">Pra que esse agente vai atender nesse número?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["uso_interno", "atende_leads"] as const).map((modo) => (
                        <button
                          key={modo}
                          onClick={() => updateConfig(c, "modo", modo)}
                          className={`text-left rounded-lg border p-2.5 text-xs ${
                            (c.config.modo ?? "atende_leads") === modo ? "border-accent bg-accent/10" : "border-border"
                          }`}
                        >
                          <span className="text-white">{modo === "uso_interno" ? "Uso interno" : "Atende leads"}</span>
                          <p className="text-muted mt-0.5">
                            {modo === "uso_interno" ? "Só quem você autorizar conversa com ele." : "Qualquer pessoa que mandar msg fala com ele."}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Palavras-chave (só responde se a msg conter)</label>
                    <input
                      value={c.config.palavras_chave ?? ""}
                      onChange={(e) => updateConfig(c, "palavras_chave", e.target.value)}
                      placeholder="ex: relatório, vendas, faturamento"
                      className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                    />
                  </div>
                </div>
              )}

              {c.tipo === "instagram" && (
                <div>
                  <label className="text-[11px] text-muted">Conta Instagram (@usuario)</label>
                  <input
                    value={c.config.usuario ?? ""}
                    onChange={(e) => updateConfig(c, "usuario", e.target.value)}
                    placeholder="Conecte em Marketing > Redes sociais"
                    className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                  />
                </div>
              )}

              {c.tipo === "botao_flutuante" && (
                <p className="text-muted text-xs">Bolha de acesso rápido em qualquer página do CRM — para o {agenteNome}.</p>
              )}
            </div>
          );
        })}
      </div>

      {disponiveis.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] text-muted uppercase tracking-wide mb-2">Adicionar canal</p>
          <div className="grid grid-cols-3 gap-2">
            {disponiveis.map((t) => {
              const Icon = TIPO_ICON[t];
              return (
                <button
                  key={t}
                  onClick={() => adicionar(t)}
                  className="bg-panel border border-border hover:border-accent rounded-lg p-3 flex items-center gap-2 text-left"
                >
                  <Icon size={14} className="text-accent" />
                  <span className="text-white text-xs">{TIPO_LABEL[t]}</span>
                  <Plus size={12} className="text-muted ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
