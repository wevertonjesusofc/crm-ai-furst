"use client";

// Organograma de funcionalidades: o sistema no centro, os módulos embaixo e,
// em cada módulo, o que já está pronto, o que está em teste e o que vem depois.

import { CheckCircle2, FlaskConical, Clock } from "lucide-react";
import { ROADMAP, Status } from "@/lib/roadmap";

const ESTILO: Record<Status, { rotulo: string; Icone: typeof Clock; cor: string; borda: string }> = {
  pronto: { rotulo: "Pronto", Icone: CheckCircle2, cor: "text-[#9FD9BF]", borda: "border-[#2A6A57]" },
  testando: { rotulo: "Em teste", Icone: FlaskConical, cor: "text-accent", borda: "border-accent/50" },
  proximo: { rotulo: "Próximo", Icone: Clock, cor: "text-muted", borda: "border-dashed border-border" },
};

export default function OrganogramaFuncionalidades() {
  const total = ROADMAP.flatMap((m) => m.itens);
  const conta = (s: Status) => total.filter((i) => i.status === s).length;
  const proximos = total.filter((i) => i.status === "proximo").sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));

  return (
    <div>
      <style>{`
        .func ul { display:flex; justify-content:center; padding-top:22px; position:relative; margin:0; }
        .func li { list-style:none; position:relative; padding:22px 10px 0; display:flex; flex-direction:column; align-items:center; }
        .func li::before, .func li::after { content:""; position:absolute; top:0; right:50%; width:50%; height:22px; border-top:1px solid #1A5646; }
        .func li::after { right:auto; left:50%; border-left:1px solid #1A5646; }
        .func li:only-child::before, .func li:only-child::after { display:none; }
        .func li:only-child { padding-top:0; }
        .func li:first-child::before, .func li:last-child::after { border:0; }
        .func li:last-child::before { border-right:1px solid #1A5646; border-radius:0 6px 0 0; }
        .func li:first-child::after { border-radius:6px 0 0 0; }
        .func ul ul::before { content:""; position:absolute; top:0; left:50%; height:22px; border-left:1px solid #1A5646; }
        .func > ul { padding-top:0; }
      `}</style>

      <div className="flex items-center justify-center gap-3 mb-6 text-xs">
        {(["pronto", "testando", "proximo"] as Status[]).map((s) => {
          const e = ESTILO[s];
          return (
            <span key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${e.borda} ${e.cor}`}>
              <e.Icone size={12} /> {e.rotulo}: <b className="tabular-nums">{conta(s)}</b>
            </span>
          );
        })}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="func w-max mx-auto">
          <ul>
            <li>
              <div className="w-56 rounded-2xl border border-accent/50 bg-gradient-to-br from-[#0F7A5A]/40 to-[#0A372C] p-4 text-center shadow-[0_0_30px_rgba(201,169,110,.15)]">
                <div className="font-serif text-2xl text-accent">Sistema da clínica</div>
                <div className="text-[11px] text-muted mt-1">marketing e vendas num lugar só</div>
              </div>
              <ul>
                {ROADMAP.map((m) => (
                  <li key={m.nome}>
                    <div className="w-60">
                      <div className="rounded-xl border border-border bg-panel px-3 py-2.5 mb-2 text-center">
                        <div className="text-white font-medium">{m.nome}</div>
                        <div className="text-[11px] text-muted">{m.descricao}</div>
                      </div>
                      <div className="space-y-1.5">
                        {m.itens.map((i) => {
                          const e = ESTILO[i.status];
                          return (
                            <div key={i.nome} className={`rounded-lg border ${e.borda} bg-panelmuted/60 px-2.5 py-2`}>
                              <div className="flex items-start gap-1.5">
                                <e.Icone size={13} className={`${e.cor} shrink-0 mt-0.5`} />
                                <span className="text-[12px] text-white leading-snug">{i.nome}</span>
                              </div>
                              {(i.ordem || i.nota) && (
                                <div className="text-[10px] text-muted mt-1 pl-5">
                                  {i.ordem ? `Passo ${i.ordem}` : ""}
                                  {i.ordem && i.nota ? " · " : ""}
                                  {i.nota ?? ""}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 bg-panel border border-border rounded-2xl p-5">
        <div className="text-xs uppercase tracking-[0.12em] text-muted mb-3">Próximos passos, na ordem</div>
        <ol className="grid grid-cols-2 gap-x-6 gap-y-2">
          {proximos.map((p) => (
            <li key={p.nome} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-accent text-bg text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">{p.ordem}</span>
              <span className="text-white">{p.nome}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
