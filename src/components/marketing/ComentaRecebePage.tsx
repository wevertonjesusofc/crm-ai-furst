"use client";

// Comenta & Recebe: o post pede "comente PALAVRA" e quem comenta recebe a
// resposta no comentário e a mensagem no direct, na hora.

import { useEffect, useState } from "react";
import { Zap, RefreshCw, Search, Play, Pause, MessageCircle, Reply, Link2, Send, MousePointerClick, ExternalLink, X, Trash2, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Midia = { tipo: string; url: string; capa: string | null };

type Gatilho = {
  id: string;
  palavra: string;
  objetivo: string;
  resposta_publica: string | null;
  mensagem_direct: string;
  botao_titulo: string | null;
  botao_url: string | null;
  ativo: boolean;
  zernio_automation_id: string | null;
  stats: Record<string, number>;
  post_url: string | null;
  legenda: string | null;
  criado_automatico: boolean;
  redes_posts: { thumbnail_url: string | null; visualizacoes: number; comentarios: number; midias: Midia[] | null } | null;
};

const OBJETIVO: Record<string, string> = { call: "Agendar call", material: "Enviar material", formulario: "Formulário", conversa: "Puxar conversa" };
const campo = "w-full bg-bg/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent";

export default function ComentaRecebePage() {
  const [lista, setLista] = useState<Gatilho[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Gatilho | null>(null);

  async function carregar() {
    const { data } = await supabase
      .from("gatilhos")
      .select("id, palavra, objetivo, resposta_publica, mensagem_direct, botao_titulo, botao_url, ativo, zernio_automation_id, stats, post_url, legenda, criado_automatico, redes_posts(thumbnail_url, visualizacoes, comentarios, midias:metricas_brutas->_midias)")
      .order("created_at", { ascending: false });
    setLista(((data as unknown as Gatilho[]) ?? []).filter((g) => !g.stats?.descartado));
  }
  useEffect(() => {
    carregar();
  }, []);

  async function acao(a: string, id?: string) {
    setOcupado(a + (id ?? ""));
    if (id && (a === "ativar" || a === "pausar")) setLista((xs) => (xs ?? []).map((x) => (x.id === id ? { ...x, ativo: a === "ativar" } : x)));
    setAviso(null);
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch(`/api/comenta-recebe?acao=${a}${id ? `&id=${id}` : ""}`, { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const d = await resp.json().catch(() => ({}));
    setOcupado(null);
    setConfirmar(null);
    if (!resp.ok) {
      setAviso({ ok: false, msg: d.error ?? "Não deu certo." });
      return carregar();
    }
    setAviso({
      ok: true,
      msg:
        a === "detectar" ? `Li ${d.postsLidos} posts: ${d.novos} novo(s) com "comente PALAVRA".`
        : a === "sincronizar" ? `Números atualizados. ${d.naZernio} automação(ões) na Zernio.`
        : a === "ativar" ? "Ligada! Quem comentar a palavra já recebe no direct."
        : a === "descartar" ? "Rascunho descartado."
        : "Pausada.",
    });
    carregar();
  }

  async function salvar(g: Gatilho, campos: Partial<Gatilho>) {
    setLista((xs) => (xs ?? []).map((x) => (x.id === g.id ? { ...x, ...campos } : x)));
    const chave = Object.keys(campos)[0] as keyof Gatilho;
    if ((g[chave] ?? "") === (campos[chave] ?? "")) return; // nada mudou
    await supabase.from("gatilhos").update({ ...campos, updated_at: new Date().toISOString() }).eq("id", g.id);
    if (!g.zernio_automation_id) return setAviso({ ok: true, msg: "Rascunho salvo." });
    // Já existe na Zernio: atualiza lá também, inclusive se estiver ligada.
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch(`/api/comenta-recebe?acao=atualizar&id=${g.id}`, { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const d = await resp.json().catch(() => ({}));
    setAviso(resp.ok ? { ok: true, msg: `Salvo. A automação ${g.palavra} já está usando o texto novo.` } : { ok: false, msg: d.error ?? "Não consegui salvar na Zernio." });
  }

  const ativos = (lista ?? []).filter((g) => g.ativo);
  const somar = (k: string) => (lista ?? []).reduce((s, g) => s + Number(g.stats?.[k] ?? 0), 0);

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Comenta &amp; Recebe</h1>
          <p className="text-muted text-sm mt-0.5 max-w-2xl">
            Escreva na legenda <b className="text-white">“comente PALAVRA”</b>. O sistema acha o post sozinho, e quem comentar recebe a resposta no comentário e a mensagem no direct, na hora.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => acao("sincronizar")} disabled={!!ocupado} className="border border-border text-white text-sm px-3 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={13} className={ocupado === "sincronizar" ? "animate-spin" : ""} /> Atualizar números
          </button>
          <button onClick={() => acao("detectar")} disabled={!!ocupado} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60">
            <Search size={13} /> Procurar posts com “comente”
          </button>
        </div>
      </div>
      {aviso && <p className={`text-xs mt-2 ${aviso.ok ? "text-accent" : "text-red-400"}`}>{aviso.msg}</p>}

      <div className="grid grid-cols-4 gap-3 mt-5">
        {[
          ["Automações ligadas", ativos.length],
          ["Directs enviados", somar("dmsSent")],
          ["Cliques no botão", somar("linkClicks")],
          ["Rascunhos para revisar", (lista ?? []).filter((g) => !g.ativo && !g.zernio_automation_id).length],
        ].map(([r, v]) => (
          <div key={r as string} className="bg-panel border border-border rounded-2xl p-4">
            <div className="text-[11px] text-muted">{r}</div>
            <div className="text-2xl text-white font-semibold tabular-nums">{lista ? v : "…"}</div>
          </div>
        ))}
      </div>

      {lista?.length === 0 && <p className="text-muted text-sm mt-6">Nenhuma ainda. Clique em “Procurar posts com comente”.</p>}
      {[
        { titulo: "Ligadas", sub: "respondendo agora", itens: (lista ?? []).filter((g) => g.ativo) },
        { titulo: "Pausadas", sub: "clique em Ligar para voltar", itens: (lista ?? []).filter((g) => !g.ativo && g.zernio_automation_id) },
        { titulo: "Rascunhos", sub: "achados nas legendas, revise antes de ligar", itens: (lista ?? []).filter((g) => !g.ativo && !g.zernio_automation_id) },
      ].filter((sec) => sec.itens.length).map((sec) => (
      <section key={sec.titulo} className="mt-7">
        <h2 className="text-sm font-semibold text-white mb-3">{sec.titulo} <span className="text-muted font-normal">· {sec.itens.length} · {sec.sub}</span></h2>
      <div className="grid grid-cols-2 gap-4">
        {sec.itens.map((g) => {
          const thumb = g.redes_posts?.thumbnail_url;
          return (
            <div key={g.id} className={`bg-panel border rounded-2xl overflow-hidden flex ${g.ativo ? "border-accent/50 shadow-[0_0_24px_rgba(201,169,110,.12)]" : "border-border"}`}>
              <button type="button" onClick={() => setAberto(g)} aria-label={`Ver o post do ${g.palavra}`} className="w-32 shrink-0 bg-panelmuted relative group">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted"><Zap size={22} /></div>
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition text-[11px] text-white bg-black/60 rounded-full px-2.5 py-1 flex items-center gap-1"><Maximize2 size={11} /> Ver post</span>
                </span>
              </button>
              <div className="flex-1 p-4 space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Comente</span>
                    <span className="font-serif text-xl font-bold text-accent tracking-wide">{g.palavra}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${g.ativo ? "bg-accent/15 text-accent" : g.zernio_automation_id ? "bg-panelmuted text-muted" : "bg-sky-500/10 text-sky-300"}`}>
                    {g.ativo ? "Ligada" : g.zernio_automation_id ? "Pausada" : "Rascunho"}
                  </span>
                </div>
                <p className="text-[11px] text-muted line-clamp-1">{g.legenda?.split("\n")[0]}</p>

                <label className="block text-[11px] text-muted" htmlFor={`pub-${g.id}`}><Reply size={11} className="inline mr-1" />Resposta no comentário</label>
                <input id={`pub-${g.id}`} placeholder="Ex.: Fala, meu amigo! Te mandei lá no direct, dá uma olhadinha 😉" defaultValue={g.resposta_publica ?? ""} onBlur={(e) => salvar(g, { resposta_publica: e.target.value })} className={campo} />

                <label className="block text-[11px] text-muted" htmlFor={`dm-${g.id}`}><MessageCircle size={11} className="inline mr-1" />Mensagem no direct (use {"{{first_name}}"})</label>
                <textarea id={`dm-${g.id}`} rows={3} defaultValue={g.mensagem_direct} onBlur={(e) => salvar(g, { mensagem_direct: e.target.value })} className={campo} />

                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <input aria-label="Texto do botão" placeholder="Botão (ex.: Agendar)" defaultValue={g.botao_titulo ?? ""} onBlur={(e) => salvar(g, { botao_titulo: e.target.value })} className={campo} />
                  <input aria-label="Link do botão" placeholder="Link: agenda, formulário ou material" defaultValue={g.botao_url ?? ""} onBlur={(e) => salvar(g, { botao_url: e.target.value })} className={campo} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Send size={11} /> {g.stats?.dmsSent ?? 0} directs</span>
                    <span className="flex items-center gap-1"><MousePointerClick size={11} /> {g.stats?.linkClicks ?? 0} cliques</span>
                    <span className="flex items-center gap-1"><Link2 size={11} /> {OBJETIVO[g.objetivo] ?? g.objetivo}</span>
                  </div>
                  {g.ativo ? (
                    <button onClick={() => acao("pausar", g.id)} disabled={!!ocupado} className="text-xs border border-border rounded-full px-3 py-1.5 text-white flex items-center gap-1"><Pause size={12} /> Pausar</button>
                  ) : g.zernio_automation_id ? (
                    <button onClick={() => acao("ativar", g.id)} disabled={!!ocupado} className="text-xs bg-accent text-bg font-medium rounded-full px-3 py-1.5 flex items-center gap-1"><Play size={12} /> Ligar de novo</button>
                  ) : confirmar === g.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-300">Vai mandar directs de verdade. Ligar?</span>
                      <button onClick={() => acao("ativar", g.id)} disabled={!!ocupado} className="text-xs bg-accent text-bg font-medium rounded-full px-3 py-1.5">Sim, ligar</button>
                      <button onClick={() => setConfirmar(null)} className="text-xs text-muted">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => acao("descartar", g.id)} disabled={!!ocupado} aria-label="Descartar rascunho" title="Descartar" className="text-muted hover:text-red-300 p-1.5"><Trash2 size={13} /></button>
                      <button onClick={() => setConfirmar(g.id)} className="text-xs bg-accent text-bg font-medium rounded-full px-3 py-1.5 flex items-center gap-1"><Play size={12} /> Ligar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </section>
      ))}

      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setAberto(null)}>
          <div className="bg-panel border border-border rounded-2xl overflow-hidden flex max-h-[90vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-[420px] shrink-0 bg-black">
              <VerPost midias={aberto.redes_posts?.midias ?? []} capa={aberto.redes_posts?.thumbnail_url ?? null} />
            </div>
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] text-muted">Comente</div>
                  <div className="font-serif text-3xl font-bold text-accent">{aberto.palavra}</div>
                </div>
                <button onClick={() => setAberto(null)} aria-label="Fechar" className="text-muted hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex gap-4 text-xs text-muted">
                <span>{(aberto.redes_posts?.visualizacoes ?? 0).toLocaleString("pt-BR")} views</span>
                <span>{aberto.redes_posts?.comentarios ?? 0} comentários</span>
                <span>{aberto.stats?.dmsSent ?? 0} directs</span>
              </div>
              <div>
                <div className="text-[11px] text-muted mb-1">Responde no comentário</div>
                <div className="rounded-xl bg-panelmuted p-3 text-sm text-white">{aberto.resposta_publica || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted mb-1">Manda no direct</div>
                <div className="rounded-xl bg-panelmuted p-3 text-sm text-white whitespace-pre-wrap">{aberto.mensagem_direct}</div>
                {aberto.botao_titulo && <div className="mt-2 inline-block text-xs border border-accent/50 text-accent rounded-full px-3 py-1">{aberto.botao_titulo}</div>}
              </div>
              <div>
                <div className="text-[11px] text-muted mb-1">Legenda</div>
                <p className="text-xs text-muted whitespace-pre-wrap">{aberto.legenda}</p>
              </div>
              {aberto.post_url && (
                <a href={aberto.post_url} target="_blank" rel="noreferrer" className="text-[11px] text-muted hover:text-white inline-flex items-center gap-1"><ExternalLink size={11} /> Abrir no Instagram</a>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted mt-6">
        Regras do Instagram: cada comentário recebe um direct só, até 7 dias depois. Para quem não segue a conta, o primeiro direct vai só com texto (o botão aparece depois que a pessoa responde).
      </p>
    </div>
  );
}

/** O post inteiro dentro do sistema: passa as telas do carrossel ou toca o vídeo. */
function VerPost({ midias, capa }: { midias: Midia[]; capa: string | null }) {
  const [i, setI] = useState(0);
  const itens = midias.length ? midias : capa ? [{ tipo: "image", url: capa, capa: null }] : [];
  if (!itens.length) return <div className="h-[60vh] flex items-center justify-center text-muted text-sm">Sem mídia. Clique em Atualizar em Redes sociais.</div>;
  const m = itens[Math.min(i, itens.length - 1)];
  return (
    <div className="relative h-[86vh] flex items-center justify-center">
      {m.tipo === "video" ? (
        <video key={m.url} src={m.url} poster={m.capa ?? undefined} controls autoPlay playsInline className="max-h-full max-w-full" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.url} src={m.url} alt={`Tela ${i + 1}`} className="max-h-full max-w-full object-contain" />
      )}
      {itens.length > 1 && (
        <>
          <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="Tela anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 text-black flex items-center justify-center disabled:opacity-0"><ChevronLeft size={18} /></button>
          <button onClick={() => setI((x) => Math.min(itens.length - 1, x + 1))} disabled={i === itens.length - 1} aria-label="Próxima tela" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 text-black flex items-center justify-center disabled:opacity-0"><ChevronRight size={18} /></button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {itens.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />)}
          </div>
          <span className="absolute top-3 right-3 text-[11px] bg-black/60 text-white rounded-full px-2 py-0.5">{i + 1}/{itens.length}</span>
        </>
      )}
    </div>
  );
}
