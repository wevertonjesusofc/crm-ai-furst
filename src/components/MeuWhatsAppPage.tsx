"use client";

import { MessageSquare, Phone, RefreshCw, XCircle, AlertTriangle, Plus } from "lucide-react";

export default function MeuWhatsAppPage() {
  return (
    <div className="mx-8 pt-8 pb-8">
      <h1 className="text-2xl font-semibold text-white mb-1">Meu WhatsApp</h1>
      <p className="text-muted text-sm mb-6">Gerencie suas conexões de mensagens e ligações</p>

      <div className="bg-panel border border-border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-panelmuted text-accent flex items-center justify-center">
              <MessageSquare size={16} />
            </span>
            <div>
              <div className="text-white text-sm font-medium">Mensagens</div>
              <div className="text-muted text-xs">Nenhum número conectado</div>
            </div>
          </div>
          <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2.5 py-1 flex items-center gap-1">
            <RefreshCw size={11} /> Desconectado
          </span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs rounded-md px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>Conectar seu WhatsApp real ainda depende da integração de canais (WhatsApp Cloud API ou UAZAPI) — ver checklist de integrações pendentes.</span>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-9 h-9 rounded-lg bg-panelmuted text-muted flex items-center justify-center">
            <Phone size={16} />
          </span>
          <div>
            <div className="text-white text-sm font-medium">Suas Ligações</div>
            <div className="text-muted text-xs">Ainda não configurado</div>
          </div>
        </div>
        <div className="py-8 text-center">
          <XCircle size={22} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm mb-3">Seu dispositivo de ligações ainda não foi configurado.</p>
          <button
            onClick={() => alert("Ligações via VoIP dependem de uma integração externa (ex: WaVoIP) — ainda não conectada.")}
            className="bg-panelmuted border border-border text-white text-sm px-4 py-2 rounded-md flex items-center gap-1.5 mx-auto"
          >
            <Plus size={14} /> Configurar manualmente
          </button>
        </div>
      </div>
    </div>
  );
}
