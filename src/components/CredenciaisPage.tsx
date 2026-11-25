"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Plus, X, ShieldAlert } from "lucide-react";

export default function CredenciaisPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="mx-8 pt-8 pb-8">
      <Link href="/agentes" className="text-muted hover:text-white text-sm flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-panelmuted text-accent flex items-center justify-center">
            <KeyRound size={18} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Credenciais</h1>
            <p className="text-muted text-sm">0 cadastradas · multi-provider</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> Adicionar credencial
        </button>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h3 className="text-white text-sm font-medium mb-1">IA da sua empresa</h3>
        <p className="text-muted text-xs mb-3">Nenhum benefício de IA incluído configurado ainda.</p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[11px] text-muted">Credencial padrão da empresa</label>
            <select disabled className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-muted mt-1">
              <option>Nenhuma configurada</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted">Modelo da credencial própria</label>
            <input
              disabled
              placeholder="ID do modelo disponível na sua API"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-muted mt-1"
            />
          </div>
          <button disabled className="bg-panelmuted text-muted text-sm px-4 py-2 rounded-md cursor-not-allowed">
            Salvar preferência
          </button>
        </div>
        <p className="text-muted text-[11px] mt-2">
          A credencial vinculada diretamente a um agente tem prioridade sobre esta preferência.
        </p>
      </div>

      <div className="bg-panel border border-border rounded-lg py-14 text-center">
        <KeyRound size={26} className="text-muted mx-auto mb-2" />
        <p className="text-muted text-sm mb-3">Nenhuma credencial ainda.</p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md"
        >
          + Adicionar primeira
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[440px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" /> Ainda não é seguro salvar chaves aqui
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-muted text-sm mb-3">
              O CRM AURA ainda não tem login/autenticação, e o banco (Supabase) está com a leitura liberada pra
              qualquer um que tenha a chave pública do app — é assim que o MVP funciona por enquanto.
            </p>
            <p className="text-muted text-sm mb-3">
              Guardar uma chave de API real (Anthropic, OpenAI etc.) nesse banco hoje deixaria ela visível pra
              qualquer pessoa que inspecionar o app. Por isso essa tela ainda é só uma prévia visual — a gente só
              vai habilitar o cadastro de credenciais de verdade depois que tivermos login e um jeito seguro de
              guardar segredo (ex: uma função de servidor, nunca direto no banco público).
            </p>
            <p className="text-muted text-xs mb-4">Isso está no checklist de integrações pendentes.</p>
            <div className="flex justify-end">
              <button onClick={() => setShowModal(false)} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
