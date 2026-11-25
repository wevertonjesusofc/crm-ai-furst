"use client";

// Comenta & Recebe: o post pede "comente PALAVRA" e quem comenta recebe a
// resposta no comentário e a mensagem no direct, na hora.

import { useEffect, useState } from "react";
import { Zap, RefreshCw, Search, Play, Pause, MessageCircle, Reply, Link2, Send, MousePointerClick, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  redes_posts: { thumbnail_url: string | null; visualizacoes: number; comentarios: number } | null;
};

const OBJETIVO: Record<string, string> = { call: "Agendar call", material: "Enviar material", formulario: "Formulário", conversa: "Puxar conversa" };
const campo = "w-full bg-bg/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent";

export default function ComentaRecebePage() {
  const [lista, setLista] = useState<Gatilho[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase
      .from("gatilhos")
      .select("id, palavra, objetivo, resposta_publica, mensagem_direct, botao_titulo, botao_url, ativo, zernio_automation_id, stats, post_url, legenda, criado_automatico, redes_posts(thumbnail_url, visualizacoes, comentarios)")
      .order("ativo", { ascending: false })
      .order("created_at", { ascending: false });
    setLista((data as unknown as Gatilho[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, []);

  async function acao(a: string, id?: string) {
    setOcupado(a + (id ?? ""));
    setAviso(null);
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch(`/api/comenta-recebe?acao=${a}${id ? `&id=${id}` : ""}`, { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const d = await resp.json().catch(() => ({}));
    setOcupado(null);
    setConfirmar(null);
    if (!resp.ok) return setAviso({ ok: false, msg: d.error ?? "Não deu certo." });
    setAviso({
      ok: true,
      msg:
        a === "detectar" ? `Li ${d.postsLidos} posts: ${d.novos} novo(s) com "comente PALAVRA".`
        : a === "sincronizar" ? `Números atualizados. ${d.naZernio} automação(ões) na Zernio.`
        : a === "ativar" ? "Ligada! Quem comentar a palavra já recebe no direct."
        : "Pausada.",
    });
    carregar();
  }

  async function salvar(g: Gatilho, campos: Partial<Gatilho>) {
    setLista((xs) => (xs ?? []).map((x) => (x.id === g.id ? { ...x, ...campos } : x)));
    await supabase.from("gatilhos").update({ ...campos, updated_at: new Date().toISOString() }).eq("id", g.id);
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

      <div className="grid grid-cols-2 gap-4 mt-6">
        {lista?.length === 0 && <p className="text-muted text-sm">Nenhuma ainda. Clique em “Procurar posts com comente”.</p>}
        {(lista ?? []).map((g) => {
          const thumb = g.redes_posts?.thumbnail_url;
          return (
            <div key={g.id} className={`bg-panel border rounded-2xl overflow-hidden flex ${g.ativo ? "border-accent/50 shadow-[0_0_24px_rgba(201,169,110,.12)]" : "border-border"}`}>
              <div className="w-32 shrink-0 bg-panelmuted relative">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted"><Zap size={22} /></div>
                )}
                {g.post_url && (
                  <a href={g.post_url} target="_blank" rel="noreferrer" className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
                    <ExternalLink size={10} /> post
                  </a>
                )}
              </div>
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
                <input id={`pub-${g.id}`} disabled={g.ativo} defaultValue={g.resposta_publica ?? ""} onBlur={(e) => salvar(g, { resposta_publica: e.target.value })} className={campo} />

                <label className="block text-[11px] text-muted" htmlFor={`dm-${g.id}`}><MessageCircle size={11} className="inline mr-1" />Mensagem no direct (use {"{{first_name}}"})</label>
                <textarea id={`dm-${g.id}`} disabled={g.ativo} rows={3} defaultValue={g.mensagem_direct} onBlur={(e) => salvar(g, { mensagem_direct: e.target.value })} className={campo} />

                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <input aria-label="Texto do botão" disabled={g.ativo} placeholder="Botão (ex.: Agendar)" defaultValue={g.botao_titulo ?? ""} onBlur={(e) => salvar(g, { botao_titulo: e.target.value })} className={campo} />
                  <input aria-label="Link do botão" disabled={g.ativo} placeholder="Link: agenda, formulário ou material" defaultValue={g.botao_url ?? ""} onBlur={(e) => salvar(g, { botao_url: e.target.value })} className={campo} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Send size={11} /> {g.stats?.dmsSent ?? 0} directs</span>
                    <span className="flex items-center gap-1"><MousePointerClick size={11} /> {g.stats?.linkClicks ?? 0} cliques</span>
                    <span className="flex items-center gap-1"><Link2 size={11} /> {OBJETIVO[g.objetivo] ?? g.objetivo}</span>
                  </div>
                  {g.ativo ? (
                    <button onClick={() => acao("pausar", g.id)} disabled={!!ocupado} className="text-xs border border-border rounded-full px-3 py-1.5 text-white flex items-center gap-1"><Pause size={12} /> Pausar</button>
                  ) : confirmar === g.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-300">Vai mandar directs de verdade. Ligar?</span>
                      <button onClick={() => acao("ativar", g.id)} disabled={!!ocupado} className="text-xs bg-accent text-bg font-medium rounded-full px-3 py-1.5">Sim, ligar</button>
                      <button onClick={() => setConfirmar(null)} className="text-xs text-muted">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmar(g.id)} className="text-xs bg-accent text-bg font-medium rounded-full px-3 py-1.5 flex items-center gap-1"><Play size={12} /> Ligar</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted mt-6">
        Regras do Instagram: cada comentário recebe um direct só, até 7 dias depois. Para quem não segue a conta, o primeiro direct vai só com texto (o botão aparece depois que a pessoa responde).
      </p>
    </div>
  );
}
