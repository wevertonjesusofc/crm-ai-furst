"use client";

import { CheckCircle2, Sparkles, ShieldCheck, Workflow, Bot } from "lucide-react";
import McpConexaoPanel from "@/components/sistema/McpConexaoPanel";

export default function ConectarIAPage() {
  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-accent uppercase tracking-wide font-medium">Sua operação. Sua inteligência.</span>
        <span className="text-[11px] text-muted flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-accent" /> Conexão segura
        </span>
      </div>
      <h1 className="text-3xl font-semibold text-white mb-2">
        Da conversa ao processo. <span className="text-muted">Tudo conectado.</span>
      </h1>
      <p className="text-muted text-sm mb-8 max-w-lg">
        Conecte sua IA (Claude, ChatGPT ou outra) ao CRM AURA e transforme o conhecimento sobre sua clínica em funis, etapas e agentes.
      </p>

      <div className="grid grid-cols-[1fr_380px] gap-8">
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Workflow size={16} />
            </span>
            <div>
              <div className="text-white text-sm font-medium">Um processo que faz sentido</div>
              <p className="text-muted text-xs mt-0.5">Funis e etapas construídos a partir da sua operação.</p>
            </div>
          </div>
          <div className="bg-panel border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Bot size={16} />
            </span>
            <div>
              <div className="text-white text-sm font-medium">Agentes com uma missão clara</div>
              <p className="text-muted text-xs mt-0.5">Rascunhos preparados para você revisar e configurar.</p>
            </div>
          </div>

          <div className="bg-bg border border-border rounded-lg p-4 text-xs text-muted mt-6">
            <p className="text-white text-sm font-medium mb-2">Já dá pra usar hoje</p>
            <p>
              O projeto CRM AURA já tem um servidor MCP (Model Context Protocol) configurado pro Supabase — dá pra
              conectar o Claude Code direto no banco de dados pra consultar contatos, deals e tarefas. Foi assim
              que esse CRM inteiro foi construído nesta conversa.
            </p>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <CheckCircle2 size={12} /> Sua conta
            </span>
            <div className="flex-1 h-px bg-accent" />
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <CheckCircle2 size={12} /> Sua empresa
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-white">3. Conexão</span>
          </div>

          <h3 className="text-white font-medium mb-1 flex items-center gap-1.5">
            <Sparkles size={15} className="text-accent" /> Sua IA, dentro da operação
          </h3>
          <p className="text-muted text-sm mb-4">Conecte Claude ou ChatGPT e transforme sua próxima conversa em um processo pronto no CRM.</p>

          <McpConexaoPanel />
        </div>
      </div>
    </div>
  );
}
