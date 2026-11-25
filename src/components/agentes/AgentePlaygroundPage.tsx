"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Settings, Wrench, Paperclip, Mic, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Agente = { id: string; nome: string; emoji: string; cor: string; proposito: string | null };
type Mensagem = { id: string; direction: "enviada" | "recebida"; body: string; created_at: string };

const COR_BG: Record<string, string> = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  gray: "bg-gray-500",
};

export default function AgentePlaygroundPage({ agenteId }: { agenteId: string }) {
  const [agente, setAgente] = useState<Agente | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [avisoRuntime, setAvisoRuntime] = useState(false);
  const [pensando, setPensando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("agentes").select("id, nome, emoji, cor, proposito").eq("id", agenteId).maybeSingle();
    setAgente(data as Agente);
  }, [agenteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim()) return;
    const corpo = texto.trim();
    setTexto("");

    let sid = sessaoId;
    if (!sid) {
      const { data } = await supabase.from("agente_sessoes").insert({ agente_id: agenteId, canal: "playground" }).select("id").single();
      sid = data?.id ?? null;
      setSessaoId(sid);
    }
    if (!sid) return;

    const { data: msg } = await supabase
      .from("agente_mensagens")
      .insert({ sessao_id: sid, direction: "enviada", body: corpo })
      .select("*")
      .single();
    if (msg) setMensagens((prev) => [...prev, msg as Mensagem]);
    await supabase.from("agente_sessoes").update({ last_message_at: new Date().toISOString() }).eq("id", sid);

    setPensando(true);
    const { data: sessao } = await supabase.auth.getSession();
    const resp = await fetch(`/api/agentes/${agenteId}/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessao.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ sessaoId: sid }),
    });
    setPensando(false);

    if (resp.ok) {
      const data = await resp.json();
      setMensagens((prev) => [
        ...prev,
        { id: crypto.randomUUID(), direction: "recebida", body: data.reply, created_at: new Date().toISOString() },
      ]);
    } else {
      setAvisoRuntime(true);
    }
  }

  if (!agente) {
    return (
      <div className="mx-8 pt-8 pb-8">
        <p className="text-muted text-sm">Carregando agente...</p>
      </div>
    );
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/agentes/${agenteId}/config`} className="text-muted hover:text-white flex items-center gap-1.5 text-sm">
          <ChevronLeft size={16} /> Playground
        </Link>
        <Link href={`/agentes/${agenteId}/config`} className="text-muted hover:text-white flex items-center gap-1.5 text-sm">
          <Settings size={14} /> Configurar agente
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="bg-panel border border-border rounded-lg flex flex-col h-[600px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-lg ${COR_BG[agente.cor] ?? "bg-panelmuted"} flex items-center justify-center text-lg`}>
                {agente.emoji}
              </span>
              <div>
                <p className="text-white text-sm font-medium">{agente.nome}</p>
                <p className="text-muted text-xs">Converse com o agente para testar o atendimento</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <button className="text-sm text-muted border border-border rounded-md px-3 py-1.5 flex items-center gap-1.5">
              Selecionar contato
            </button>
            <button className="text-sm text-muted border border-border rounded-md px-3 py-1.5 flex items-center gap-1.5">
              <Wrench size={13} /> Ferramentas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {mensagens.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">{agente.emoji}</span>
                <p className="text-white text-sm font-medium">{agente.nome}</p>
                <p className="text-muted text-xs mt-1">Manda algo pra começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mensagens.map((m) =>
                  m.direction === "enviada" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="bg-accent text-bg text-sm rounded-lg rounded-br-sm px-3 py-2 max-w-[70%]">{m.body}</div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-start">
                      <div className="bg-panelmuted text-white text-sm rounded-lg rounded-bl-sm px-3 py-2 max-w-[70%] whitespace-pre-wrap">
                        {m.body}
                      </div>
                    </div>
                  )
                )}
                {pensando && (
                  <div className="flex justify-start">
                    <div className="bg-panelmuted text-muted text-sm rounded-lg rounded-bl-sm px-3 py-2">digitando...</div>
                  </div>
                )}
                {avisoRuntime && (
                  <p className="text-center text-muted text-xs italic py-2">
                    O {agente.nome} ainda não pode responder de verdade — falta configurar GEMINI_API_KEY (grátis, pra
                    teste) ou ANTHROPIC_API_KEY no .env.local desta versão do CRM AURA.
                  </p>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2">
              <button className="text-muted hover:text-white">
                <Paperclip size={16} />
              </button>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviar()}
                placeholder={`Manda mensagem pro ${agente.nome}...`}
                className="flex-1 bg-transparent text-sm text-white focus:outline-none"
              />
              <button className="text-muted hover:text-white">
                <Mic size={16} />
              </button>
              <button onClick={enviar} className="text-accent hover:text-accent/80">
                <Send size={16} />
              </button>
            </div>
            <p className="text-muted text-[10px] text-center mt-1.5">Enter envia · Shift+Enter quebra linha</p>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <p className="text-[11px] text-accent uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Wrench size={12} /> Tool calls
          </p>
          <div className="text-center py-10">
            <Wrench size={22} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-xs">Nenhuma tool call ainda.</p>
            <p className="text-muted text-[11px] mt-1">Quando o agente usar uma ferramenta, aparece aqui em tempo real.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
