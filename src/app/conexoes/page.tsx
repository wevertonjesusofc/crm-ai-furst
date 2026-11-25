"use client";

// Conexões: tudo que liga o sistema ao mundo de fora, num lugar só.
// Cartões simples; clicou, abre o formulário com o passo a passo.

import { useEffect, useState } from "react";
import { Brain, Share2, MessageSquare, Megaphone, Search, Mail, Phone, Calendar, CheckCircle2, CircleDashed, XCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { INTEGRACOES } from "@/lib/integracoes/catalogo";
import IntegracaoPanel from "@/components/sistema/panels/IntegracaoPanel";

const GRUPOS: { titulo: string; itens: { tipo: string; nome: string; frase: string; Icone: typeof Brain }[] }[] = [
  {
    titulo: "Essencial",
    itens: [
      { tipo: "ia", nome: "Inteligência artificial", frase: "O cérebro dos agentes (Claude).", Icone: Brain },
      { tipo: "redes_sociais", nome: "Redes sociais (Zernio)", frase: "Uma chave conecta Instagram, TikTok e as outras redes.", Icone: Share2 },
      { tipo: "whatsapp_uazapi", nome: "WhatsApp", frase: "O número da clínica, pela UAZAPI.", Icone: MessageSquare },
    ],
  },
  {
    titulo: "Anúncios",
    itens: [
      { tipo: "meta_ads", nome: "Meta Ads", frase: "Gasto e resultado dos anúncios do Instagram e Facebook.", Icone: Megaphone },
      { tipo: "google_ads", nome: "Google Ads", frase: "Gasto e resultado das campanhas do Google.", Icone: Search },
    ],
  },
  {
    titulo: "Outras",
    itens: [
      { tipo: "email_marketing", nome: "E-mail", frase: "Envio de e-mails pela Resend.", Icone: Mail },
      { tipo: "telefonia", nome: "Telefone (VoIP)", frase: "Ligações pelo sistema.", Icone: Phone },
      { tipo: "google_calendar", nome: "Google Agenda", frase: "Agenda da clínica.", Icone: Calendar },
    ],
  },
];

export default function ConexoesPage() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase.from("integracoes").select("tipo, status");
    setStatus(Object.fromEntries((data ?? []).map((d) => [d.tipo, d.status])));
  }
  useEffect(() => {
    carregar();
  }, [aberto]);

  if (aberto && INTEGRACOES[aberto]) {
    return (
      <div className="mx-8 pt-8 pb-10">
        <button onClick={() => setAberto(null)} className="flex items-center gap-1.5 text-xs text-muted hover:text-white mb-4">
          <ArrowLeft size={13} /> Voltar para Conexões
        </button>
        <IntegracaoPanel tipo={aberto} />
      </div>
    );
  }

  return (
    <div className="mx-8 pt-8 pb-10">
      <h1 className="text-3xl font-semibold text-white">Conexões</h1>
      <p className="text-muted text-sm mt-1 mb-6 max-w-xl">Liga o sistema da clínica com a IA, as redes sociais, o WhatsApp e os anúncios. Comece pelo bloco Essencial.</p>
      <div className="space-y-6">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">{g.titulo}</div>
            <div className="grid grid-cols-3 gap-3">
              {g.itens.map(({ tipo, nome, frase, Icone }) => {
                const st = status[tipo] ?? "desconectado";
                const S = st === "conectado" ? CheckCircle2 : st === "erro" ? XCircle : CircleDashed;
                const cor = st === "conectado" ? "text-accent" : st === "erro" ? "text-red-400" : "text-muted";
                return (
                  <button key={tipo} onClick={() => setAberto(tipo)} className="text-left bg-panel border border-border rounded-lg p-4 hover:border-accent/50">
                    <div className="flex items-start justify-between gap-2">
                      <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center"><Icone size={17} /></span>
                      <span className={`text-[11px] flex items-center gap-1 ${cor}`}>
                        <S size={12} /> {st === "conectado" ? "Conectado" : st === "erro" ? "Com erro" : "Conectar"}
                      </span>
                    </div>
                    <div className="text-white text-sm font-medium mt-3">{nome}</div>
                    <p className="text-muted text-xs mt-0.5">{frase}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
