"use client";

// Tela inicial: o "como tá meu dia?" do dono, sem precisar perguntar a ninguém.

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, UserPlus, Trophy, CalendarClock, Receipt, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MetaDoMes from "@/components/MetaDoMes";
import JornadaPaciente from "@/components/JornadaPaciente";
import { brl } from "@/lib/meta";

type Resumo = {
  conversas: number;
  semResposta: number;
  novos: number;
  vendas: number;
  receita: number;
  retornos: number;
  orcamentos: number;
};

export default function InicioPage() {
  const [r, setR] = useState<Resumo | null>(null);
  const [nome, setNome] = useState("");

  useEffect(() => {
    (async () => {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const desde = inicio.toISOString();
      const hoje = desde.slice(0, 10);
      const em15 = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
      const seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
      const [cfg, msgs, novos, ganhos, retornos, orcs, convs] = await Promise.all([
        supabase.from("sistema_config").select("perfil_nome").eq("id", "default").maybeSingle(),
        supabase.from("mensagens").select("conversa_id, direction").gte("created_at", desde),
        supabase.from("contacts").select("id", { count: "exact", head: true }).gte("created_at", desde),
        supabase.from("deals").select("value").eq("status", "won").gte("updated_at", desde),
        supabase.from("procedimentos_realizados").select("id", { count: "exact", head: true }).eq("retorno_status", "pendente").lte("retorno_em", em15),
        supabase.from("orcamentos").select("id", { count: "exact", head: true }).eq("status", "pendente").lte("enviado_em", seteDias),
        supabase.from("conversas").select("id").eq("status", "aberta"),
      ]);
      setNome((cfg.data?.perfil_nome ?? "").split(" ")[0]);
      const recebidas = new Set((msgs.data ?? []).filter((m) => m.direction === "recebida").map((m) => m.conversa_id));
      let semResposta = 0;
      for (const c of convs.data ?? []) {
        const { data: ult } = await supabase.from("mensagens").select("direction").eq("conversa_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (ult?.direction === "recebida") semResposta++;
      }
      setR({
        conversas: recebidas.size,
        semResposta,
        novos: novos.count ?? 0,
        vendas: (ganhos.data ?? []).length,
        receita: (ganhos.data ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0),
        retornos: retornos.count ?? 0,
        orcamentos: orcs.count ?? 0,
      });
      void hoje;
    })();
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const cards = r
    ? [
        { rotulo: "Conversas de pacientes hoje", valor: String(r.conversas), Icone: MessageSquare, href: "/comercial/inbox" },
        { rotulo: "Novos interessados hoje", valor: String(r.novos), Icone: UserPlus, href: "/pacientes" },
        { rotulo: "Vendas fechadas hoje", valor: `${r.vendas} · ${brl(r.receita)}`, Icone: Trophy, href: "/comercial/pipeline" },
      ]
    : [];
  const atencao = r
    ? [
        { n: r.semResposta, texto: "conversa(s) esperando resposta da clínica", Icone: AlertTriangle, href: "/comercial/inbox" },
        { n: r.retornos, texto: "paciente(s) com retorno vencendo em 15 dias", Icone: CalendarClock, href: "/pacientes" },
        { n: r.orcamentos, texto: "orçamento(s) parado(s) há 7 dias ou mais", Icone: Receipt, href: "/pacientes" },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <div className="pb-10">
      <div className="mx-8 pt-8">
        <h1 className="text-3xl font-semibold text-white">{saudacao}{nome ? `, ${nome}` : ""}.</h1>
        <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <MetaDoMes />

      <JornadaPaciente />

      {r && (
        <div className="mx-8 mt-6 bg-panel border border-border rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-[0.12em] text-muted mb-3">Precisa de atenção hoje</h2>
          {atencao.length === 0 ? (
            <p className="text-muted text-sm">Nada pendente agora. Tudo em dia.</p>
          ) : (
            <div className="divide-y divide-border">
              {atencao.map(({ n, texto, Icone, href }) => (
                <Link key={texto} href={href} className="flex items-center gap-3 py-3 text-sm hover:text-white">
                  <Icone size={16} className="text-amber-300 shrink-0" />
                  <span className="text-white font-semibold tabular-nums">{n}</span>
                  <span className="text-muted flex-1">{texto}</span>
                  <ArrowRight size={14} className="text-muted" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
