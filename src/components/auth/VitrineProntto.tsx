"use client";

// Vitrine da entrada: as ferramentas da Prontto girando em volta do núcleo,
// ligadas por linhas verdes com um brilho dourado passando, e painéis
// flutuantes contando, em exemplos reais, o que o sistema faz.

import { useEffect, useState } from "react";
import {
  Instagram,
  MessageCircle,
  Megaphone,
  CalendarCheck,
  Columns3,
  ClipboardList,
  Bot,
  HeartHandshake,
  Send,
  Target,
  Sparkles,
  Trophy,
  BellRing,
  CalendarClock,
  TrendingUp,
  Gift,
} from "lucide-react";

const FERRAMENTAS = [
  { nome: "Instagram", Icone: Instagram },
  { nome: "WhatsApp", Icone: MessageCircle },
  { nome: "Anúncios", Icone: Megaphone },
  { nome: "Agenda", Icone: CalendarCheck },
  { nome: "Funil de vendas", Icone: Columns3 },
  { nome: "Ficha clínica", Icone: ClipboardList },
  { nome: "Agentes de IA", Icone: Bot },
  { nome: "Pós-venda", Icone: HeartHandshake },
  { nome: "Gerente no Telegram", Icone: Send },
  { nome: "Meta do mês", Icone: Target },
];

const PAINEIS = [
  { Icone: Trophy, titulo: "Venda detectada no WhatsApp", texto: "Carlos fechou o pacote da esposa · R$ 80.720", cor: "text-accent" },
  { Icone: BellRing, titulo: "7h · Combinado vencido", texto: "Juliana pediu contato dia 23. Cobrar a Jéssica?", cor: "text-[#E39A8B]" },
  { Icone: TrendingUp, titulo: "Este Reels trouxe 11 pacientes", texto: "Tráfego: escalar · R$ 4,20 por real investido", cor: "text-accent" },
  { Icone: CalendarClock, titulo: "Retorno de botox em 5 dias", texto: "Mariana · o agente já vai lembrar", cor: "text-[#9FD9BF]" },
  { Icone: Sparkles, titulo: "Social selling", texto: "Comentou no post → a IA chamou no direct em 3 min", cor: "text-accent" },
  { Icone: Gift, titulo: "Indicação", texto: "Mariana já indicou 2 pacientes · merece bônus", cor: "text-[#9FD9BF]" },
  { Icone: Target, titulo: "Meta de novembro: 72%", texto: "Faltam R$ 16.800 · R$ 4.200 por dia útil", cor: "text-accent" },
  { Icone: MessageCircle, titulo: "\"Como tá meu dia?\"", texto: "O Gerente responde no Telegram, por texto ou áudio", cor: "text-[#9FD9BF]" },
];

// Posições dos painéis flutuantes (em % da área da vitrine)
const VAGAS = [
  { top: "6%", left: "18%" },
  { top: "12%", right: "3%" },
  { top: "44%", right: "1%" },
  { bottom: "14%", left: "16%" },
  { bottom: "6%", right: "6%" },
];

export default function VitrineProntto() {
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setRodada((r) => r + 1), 3200);
    return () => clearInterval(t);
  }, []);

  const R = 41; // raio da órbita em % da caixa
  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{`
        @keyframes prontto-gira { to { transform: rotate(360deg); } }
        @keyframes prontto-desgira { to { transform: rotate(-360deg); } }
        @keyframes prontto-pulsa { 0%,100% { opacity:.55; transform: scale(1);} 50% { opacity:1; transform: scale(1.06);} }
        @keyframes prontto-entra { from { opacity:0; transform: translateY(10px) scale(.98);} to { opacity:1; transform:none;} }
        @keyframes prontto-flutua { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }
        .prontto-orbita { animation: prontto-gira 90s linear infinite; }
        .prontto-no { animation: prontto-desgira 90s linear infinite; }
        .prontto-nucleo { animation: prontto-pulsa 4s ease-in-out infinite; }
        .prontto-painel { animation: prontto-entra .7s ease-out both, prontto-flutua 6s ease-in-out .7s infinite; }
        @keyframes prontto-onda { 0% { transform: scale(.35); opacity:.6;} 100% { transform: scale(1.25); opacity:0;} }
        .prontto-onda { animation: prontto-onda 6s ease-out infinite; }
        .prontto-anel2 { animation: prontto-desgira 140s linear infinite; }
        @keyframes prontto-brilha { 0%,100% { box-shadow: 0 0 18px rgba(15,122,90,.35);} 50% { box-shadow: 0 0 30px rgba(201,169,110,.45);} }
        .prontto-icone { animation: prontto-brilha 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .prontto-orbita, .prontto-no, .prontto-nucleo, .prontto-painel, .prontto-onda, .prontto-anel2, .prontto-icone { animation: none !important; }
          .prontto-brilho { display: none; }
        }
      `}</style>

      {/* brilho de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_50%,rgba(15,122,90,.38),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(201,169,110,.14),transparent_35%)]" />
      <div
        className="absolute inset-0 opacity-[.18]"
        style={{ backgroundImage: "radial-gradient(rgba(245,241,232,.55) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(circle at 55% 50%, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(circle at 55% 50%, black 30%, transparent 75%)" }}
      />

      {/* órbita (quadrada, centralizada) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square h-[88%] max-w-full">
        {[0, 2, 4].map((d) => (
          <div key={d} className="prontto-onda absolute inset-[8%] rounded-full border border-accent/30" style={{ animationDelay: `${d}s` }} />
        ))}
        <svg viewBox="0 0 100 100" className="prontto-anel2 absolute inset-0 w-full h-full" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="none" stroke="#C9A96E" strokeOpacity=".18" strokeWidth=".2" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <circle key={i} cx={(50 + 48 * Math.cos(a)).toFixed(3)} cy={(50 + 48 * Math.sin(a)).toFixed(3)} r={i % 3 === 0 ? 0.55 : 0.3} fill="#C9A96E" fillOpacity={i % 3 === 0 ? 0.8 : 0.4} />;
          })}
        </svg>
        <div className="prontto-orbita absolute inset-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <defs>
              <linearGradient id="prontto-linha" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F7A5A" stopOpacity=".9" />
                <stop offset="100%" stopColor="#C9A96E" stopOpacity=".55" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="#0F7A5A" strokeOpacity=".45" strokeWidth=".25" strokeDasharray="1 1.5" />
            <circle cx="50" cy="50" r={R * 0.55} fill="none" stroke="#0F7A5A" strokeOpacity=".25" strokeWidth=".2" />
            {FERRAMENTAS.map((_, i) => {
              const a = (i / FERRAMENTAS.length) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + R * Math.cos(a);
              const y = 50 + R * Math.sin(a);
              const caminho = `M50 50 L${x.toFixed(2)} ${y.toFixed(2)}`;
              return (
                <g key={i}>
                  <path d={caminho} stroke="url(#prontto-linha)" strokeWidth=".35" fill="none" />
                  <circle className="prontto-brilho" r="1.1" fill="#E7C98F">
                    <animateMotion dur={`${2.6 + (i % 4) * 0.7}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" path={i % 2 ? caminho : `M${x.toFixed(2)} ${y.toFixed(2)} L50 50`} />
                    <animate attributeName="opacity" values="0;1;1;0" dur={`${2.6 + (i % 4) * 0.7}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </svg>

          {FERRAMENTAS.map(({ nome, Icone }, i) => {
            const a = (i / FERRAMENTAS.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + R * Math.cos(a);
            const y = 50 + R * Math.sin(a);
            return (
              <div key={nome} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x.toFixed(3)}%`, top: `${y.toFixed(3)}%` }}>
                <div className="prontto-no flex flex-col items-center gap-1.5">
                  <span className="prontto-icone w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F4537] to-[#0A372C] border border-[#2A6A57] flex items-center justify-center text-creme">
                    <Icone size={20} />
                  </span>
                  <span className="text-[11px] text-muted whitespace-nowrap">{nome}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* núcleo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="prontto-nucleo w-28 h-28 rounded-full bg-gradient-to-br from-[#0F7A5A] to-[#083A2E] border border-accent/60 shadow-[0_0_60px_rgba(201,169,110,.35)] flex items-center justify-center">
            <span className="font-serif text-5xl font-bold text-accent">P</span>
          </div>
          <span className="mt-2 text-xs tracking-[0.2em] uppercase text-accent">Prontto AI</span>
        </div>
      </div>

      {/* painéis flutuantes */}
      {VAGAS.map((pos, v) => {
        const p = PAINEIS[(rodada + v * 3) % PAINEIS.length];
        return (
          <div key={`${v}-${(rodada + v * 3) % PAINEIS.length}`} className="prontto-painel absolute w-64 rounded-2xl bg-[#0A372C]/95 backdrop-blur border border-accent/35 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,.4),0_0_0_1px_rgba(201,169,110,.08)]" style={{ ...pos, animationDelay: `${v * 0.15}s` }}>
            <div className={`flex items-center gap-2 text-xs font-semibold ${p.cor}`}>
              <p.Icone size={14} /> {p.titulo}
            </div>
            <p className="text-sm text-creme mt-1 leading-snug">{p.texto}</p>
          </div>
        );
      })}
    </div>
  );
}
