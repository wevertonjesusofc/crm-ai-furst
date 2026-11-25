"use client";

// Social selling: quem está engajando com a clínica, quem tem cara de comprar
// (análise da IA) e a mensagem pronta para chamar no direct.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, MessageCircle, Copy, ExternalLink, UserPlus, Check, X, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Engajado = {
  id: string;
  usuario: string | null;
  nome: string | null;
  comentarios: number;
  posts: number;
  ultimos: { texto: string; link: string | null; quando: string | null }[];
  ultimo_em: string | null;
  analise: { potencial: "alto" | "medio" | "baixo"; perfil: string; por_que: string; mensagem: string } | null;
  status: "novo" | "abordado" | "virou_paciente" | "descartado";
  contact_id: string | null;
};

const FILTROS = [
  { chave: "todos", rotulo: "Mais engajados" },
  { chave: "alto", rotulo: "Alto potencial" },
  { chave: "abordar", rotulo: "Para abordar" },
  { chave: "abordado", rotulo: "Abordados" },
] as const;

const POT = {
  alto: { rotulo: "Alto potencial", cor: "bg-accent/15 text-accent border-accent/40" },
  medio: { rotulo: "Médio", cor: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
  baixo: { rotulo: "Baixo", cor: "bg-panelmuted text-muted border-border" },
};

export default function SocialSellingPage() {
  const [lista, setLista] = useState<Engajado[] | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("todos");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase
      .from("engajados")
      .select("id, usuario, nome, comentarios, posts, ultimos, ultimo_em, analise, status, contact_id")
      .neq("status", "descartado")
      .order("comentarios", { ascending: false })
      .order("ultimo_em", { ascending: false })
      .limit(120);
    setLista((data as Engajado[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function chamar(acao: "atualizar" | "analisar", ids?: string[]) {
    setOcupado(acao);
    setAviso("");
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch(`/api/social-selling?acao=${acao}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ ids }),
    });
    const d = await resp.json().catch(() => ({}));
    setOcupado(null);
    if (!resp.ok) return setAviso(d.error ?? "Não deu certo.");
    setAviso(acao === "atualizar" ? `Li ${d.posts} posts: ${d.pessoas} pessoas comentaram.` : `Analisei ${d.analisadas}: ${d.altos} com alto potencial.`);
    carregar();
  }

  async function mudar(e: Engajado, status: Engajado["status"]) {
    let contact_id = e.contact_id;
    if (status === "virou_paciente" && !contact_id) {
      const { data } = await supabase
        .from("contacts")
        .insert({ name: e.nome || e.usuario || "Instagram", instagram_usuario: e.usuario, origem_canal: "instagram", origem_detalhe: "Social selling" })
        .select("id")
        .single();
      contact_id = data?.id ?? null;
    }
    await supabase.from("engajados").update({ status, contact_id }).eq("id", e.id);
    carregar();
  }

  async function copiar(e: Engajado) {
    if (!e.analise?.mensagem) return;
    try {
      await navigator.clipboard.writeText(e.analise.mensagem);
      setCopiado(e.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {}
  }

  const filtrados = useMemo(() => {
    const xs = lista ?? [];
    if (filtro === "alto") return xs.filter((e) => e.analise?.potencial === "alto");
    if (filtro === "abordar") return xs.filter((e) => e.status === "novo" && e.analise && e.analise.potencial !== "baixo");
    if (filtro === "abordado") return xs.filter((e) => e.status === "abordado" || e.status === "virou_paciente");
    return xs;
  }, [lista, filtro]);

  const top12 = (lista ?? []).filter((e) => e.status === "novo" && !e.analise).slice(0, 12).map((e) => e.id);
  const altos = (lista ?? []).filter((e) => e.analise?.potencial === "alto").length;

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Social selling</h1>
          <p className="text-muted text-sm mt-0.5">Quem está engajando com a clínica e tem cara de virar paciente. A IA analisa e já sugere a mensagem.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => chamar("atualizar")} disabled={!!ocupado} className="border border-border text-white text-sm px-3 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={13} className={ocupado === "atualizar" ? "animate-spin" : ""} /> Atualizar engajados
          </button>
          <button onClick={() => chamar("analisar", top12)} disabled={!!ocupado || !top12.length} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60">
            <Sparkles size={13} className={ocupado === "analisar" ? "animate-pulse" : ""} /> Analisar os {top12.length || 12} mais engajados
          </button>
        </div>
      </div>
      {aviso && <p className="text-xs text-accent mt-2">{aviso}</p>}

      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-panel border border-border rounded-2xl p-4">
          <div className="text-[11px] text-muted">Pessoas engajando</div>
          <div className="text-2xl text-white font-semibold tabular-nums">{lista?.length ?? "…"}</div>
        </div>
        <div className="bg-panel border border-border rounded-2xl p-4">
          <div className="text-[11px] text-muted">Alto potencial (IA)</div>
          <div className="text-2xl text-accent font-semibold tabular-nums">{altos}</div>
        </div>
        <div className="bg-panel border border-border rounded-2xl p-4">
          <div className="text-[11px] text-muted">Viraram paciente</div>
          <div className="text-2xl text-white font-semibold tabular-nums">{(lista ?? []).filter((e) => e.status === "virou_paciente").length}</div>
        </div>
      </div>

      <div className="flex gap-1.5 mt-6 mb-4">
        {FILTROS.map((f) => (
          <button key={f.chave} onClick={() => setFiltro(f.chave)} className={`text-xs px-3 py-1.5 rounded-full border ${filtro === f.chave ? "bg-accent text-bg border-accent font-medium" : "border-border text-muted hover:text-white"}`}>
            {f.rotulo}
          </button>
        ))}
      </div>

      {lista !== null && lista.length === 0 && (
        <div className="bg-panel border border-border rounded-2xl p-6 text-sm text-muted">
          Ninguém ainda. Conecte a Zernio em <Link href="/conexoes" className="text-accent">Conexões</Link> e clique em Atualizar engajados.
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map((e) => {
          const pot = e.analise ? POT[e.analise.potencial] : null;
          return (
            <div key={e.id} className="bg-panel border border-border rounded-2xl p-4 flex flex-col">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-accent/30 to-esmeralda/30 flex items-center justify-center text-white font-semibold shrink-0">
                  {(e.nome || e.usuario || "?").replace("@", "").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate">{e.nome || `@${e.usuario}`}</div>
                  <div className="text-[11px] text-muted truncate">@{e.usuario}</div>
                </div>
                {pot && <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${pot.cor}`}>{pot.rotulo}</span>}
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-xs text-white">
                <Flame size={13} className="text-accent" />
                Comentou <b className="tabular-nums">{e.comentarios}x</b> em <b className="tabular-nums">{e.posts}</b> post(s)
                {e.ultimo_em && <span className="text-muted">· último {new Date(e.ultimo_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
              </div>

              <div className="mt-2 space-y-1">
                {(e.ultimos ?? []).slice(0, 2).map((c, i) => (
                  <p key={i} className="text-[12px] text-muted italic line-clamp-2">“{c.texto}”</p>
                ))}
              </div>

              {e.analise && (
                <div className="mt-3 rounded-xl bg-panelmuted p-3 space-y-1.5">
                  <p className="text-[12px] text-white"><b>Perfil:</b> {e.analise.perfil}</p>
                  <p className="text-[12px] text-muted">{e.analise.por_que}</p>
                  <div className="rounded-lg bg-bg/60 border border-border p-2.5 text-[12px] text-white">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1 flex items-center gap-1"><MessageCircle size={11} /> Mensagem sugerida</div>
                    {e.analise.mensagem}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                {e.usuario && (
                  <a href={`https://instagram.com/${e.usuario}`} target="_blank" rel="noreferrer" className="text-[11px] border border-border rounded-full px-2.5 py-1 text-muted hover:text-white flex items-center gap-1">
                    <ExternalLink size={11} /> Ver perfil
                  </a>
                )}
                {!e.analise && (
                  <button onClick={() => chamar("analisar", [e.id])} disabled={!!ocupado} className="text-[11px] border border-accent/40 text-accent rounded-full px-2.5 py-1 flex items-center gap-1">
                    <Sparkles size={11} /> Analisar
                  </button>
                )}
                {e.analise?.mensagem && (
                  <button onClick={() => copiar(e)} className="text-[11px] border border-border rounded-full px-2.5 py-1 text-muted hover:text-white flex items-center gap-1">
                    {copiado === e.id ? <Check size={11} /> : <Copy size={11} />} {copiado === e.id ? "Copiada" : "Copiar mensagem"}
                  </button>
                )}
                {e.status === "novo" && (
                  <button onClick={() => mudar(e, "abordado")} className="text-[11px] border border-border rounded-full px-2.5 py-1 text-muted hover:text-white flex items-center gap-1">
                    <Check size={11} /> Abordei
                  </button>
                )}
                {e.status !== "virou_paciente" ? (
                  <button onClick={() => mudar(e, "virou_paciente")} className="text-[11px] bg-accent/15 text-accent rounded-full px-2.5 py-1 flex items-center gap-1">
                    <UserPlus size={11} /> Virou paciente
                  </button>
                ) : (
                  e.contact_id && (
                    <Link href={`/comercial/leads/${e.contact_id}`} className="text-[11px] bg-accent/15 text-accent rounded-full px-2.5 py-1">Abrir ficha</Link>
                  )
                )}
                <button onClick={() => mudar(e, "descartado")} aria-label="Descartar" className="text-[11px] text-muted hover:text-red-300 px-1.5">
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted mt-6">
        O Instagram não informa quem curtiu nem quem visitou o perfil. O engajamento aqui é medido pelos comentários; quem manda direct já aparece no Inbox.
      </p>
    </div>
  );
}
