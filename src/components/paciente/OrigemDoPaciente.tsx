"use client";

// De onde o paciente veio, em detalhe, e o caminho dele até aqui.
// Esquerda: canal, o post/anúncio que trouxe ou QUEM INDICOU (para dar bônus).
// Direita: linha do tempo do primeiro contato ao fechamento e retorno.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Instagram, Megaphone, Users, MessageCircle, Globe, Search, Gift, Eye, Heart, MessageSquare, CalendarCheck, Trophy, XCircle, Syringe, Sparkles, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/meta";

type Contato = {
  id: string;
  name: string;
  created_at: string;
  origem_canal: string | null;
  origem_detalhe: string | null;
  anuncio_id: string | null;
  indicado_por_id: string | null;
  origem_post_id: string | null;
  primeira_resposta_em: string | null;
  utm_campaign: string | null;
};
type Post = { id: string; legenda: string | null; thumbnail_url: string | null; url: string | null; visualizacoes: number; alcance: number; curtidas: number; comentarios: number; publicado_em: string | null };
type Evento = { quando: string; titulo: string; detalhe?: string; Icone: typeof Eye; cor: string };

const CANAL: Record<string, { rotulo: string; Icone: typeof Eye }> = {
  instagram: { rotulo: "Instagram", Icone: Instagram },
  anuncio_meta: { rotulo: "Anúncio no Instagram/Facebook", Icone: Megaphone },
  anuncio_google: { rotulo: "Anúncio no Google", Icone: Search },
  google: { rotulo: "Google", Icone: Search },
  indicacao: { rotulo: "Indicação", Icone: Users },
  formulario: { rotulo: "Site", Icone: Globe },
  whatsapp: { rotulo: "WhatsApp direto", Icone: MessageCircle },
};
const curto = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} mi` : n >= 1000 ? `${(n / 1000).toFixed(1)} mil` : String(n));
const dataHora = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function OrigemDoPaciente({ contactId }: { contactId: string }) {
  const [c, setC] = useState<Contato | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [anuncio, setAnuncio] = useState<{ nome: string; campanha: string | null } | null>(null);
  const [indicador, setIndicador] = useState<{ id: string; name: string } | null>(null);
  const [indicados, setIndicados] = useState<{ id: string; name: string }[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [escolherPost, setEscolherPost] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [buscaIndicador, setBuscaIndicador] = useState("");
  const [opcoesIndicador, setOpcoesIndicador] = useState<{ id: string; name: string }[]>([]);

  async function carregar() {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, created_at, origem_canal, origem_detalhe, anuncio_id, indicado_por_id, origem_post_id, primeira_resposta_em, utm_campaign")
      .eq("id", contactId)
      .maybeSingle();
    const ct = data as Contato | null;
    setC(ct);
    if (!ct) return;

    const [p, an, ind, filhos, msgs, cons, deals, procs, ativ] = await Promise.all([
      ct.origem_post_id ? supabase.from("redes_posts").select("id, legenda, thumbnail_url, url, visualizacoes, alcance, curtidas, comentarios, publicado_em").eq("id", ct.origem_post_id).maybeSingle() : Promise.resolve({ data: null }),
      ct.anuncio_id ? supabase.from("anuncios").select("nome, campanha").eq("id", ct.anuncio_id).maybeSingle() : Promise.resolve({ data: null }),
      ct.indicado_por_id ? supabase.from("contacts").select("id, name").eq("id", ct.indicado_por_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("contacts").select("id, name").eq("indicado_por_id", contactId),
      supabase.from("conversas").select("channel, mensagens(direction, created_at)").eq("contact_id", contactId),
      supabase.from("consultas").select("procedimento, data, hora, status, created_at").eq("contact_id", contactId),
      supabase.from("deals").select("title, value, status, motivo_perda, updated_at, created_at").eq("contact_id", contactId),
      supabase.from("procedimentos_realizados").select("nome, realizado_em, valor").eq("contact_id", contactId),
      supabase.from("activities").select("description, created_at").eq("contact_id", contactId).ilike("description", "%detectada%"),
    ]);
    setPost((p.data as Post) ?? null);
    setAnuncio((an.data as { nome: string; campanha: string | null }) ?? null);
    setIndicador((ind.data as { id: string; name: string }) ?? null);
    setIndicados((filhos.data as { id: string; name: string }[]) ?? []);

    const ev: Evento[] = [];
    const canal = ct.origem_canal ? CANAL[ct.origem_canal]?.rotulo ?? ct.origem_canal : "origem não informada";
    ev.push({ quando: ct.created_at, titulo: `Chegou pelo ${canal}`, detalhe: ct.origem_detalhe ?? undefined, Icone: UserPlus, cor: "text-sky-300" });
    for (const cv of (msgs.data ?? []) as { channel: string; mensagens: { direction: string; created_at: string }[] }[]) {
      const ordenadas = [...(cv.mensagens ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const primeiraDele = ordenadas.find((m) => m.direction === "recebida");
      const primeiraNossa = ordenadas.find((m) => m.direction === "enviada");
      if (primeiraDele) ev.push({ quando: primeiraDele.created_at, titulo: `Mandou a primeira mensagem (${cv.channel})`, Icone: MessageSquare, cor: "text-muted" });
      if (primeiraNossa)
        ev.push({
          quando: primeiraNossa.created_at,
          titulo: primeiraDele && primeiraNossa.created_at < primeiraDele.created_at ? "A clínica chamou primeiro (social selling)" : "A clínica respondeu",
          detalhe: primeiraDele && primeiraNossa.created_at > primeiraDele.created_at ? `em ${Math.max(1, Math.round((+new Date(primeiraNossa.created_at) - +new Date(primeiraDele.created_at)) / 60000))} min` : undefined,
          Icone: Sparkles,
          cor: "text-accent",
        });
    }
    for (const x of (cons.data ?? []) as { procedimento: string | null; data: string; hora: string | null; status: string; created_at: string }[]) {
      ev.push({ quando: x.created_at, titulo: `Agendou ${x.procedimento ?? "consulta"}`, detalhe: `${new Date(x.data + "T12:00:00").toLocaleDateString("pt-BR")}${x.hora ? ` às ${x.hora}` : ""} · ${x.status}`, Icone: CalendarCheck, cor: "text-violet-300" });
    }
    for (const d of (deals.data ?? []) as { title: string; value: number; status: string; motivo_perda: string | null; updated_at: string }[]) {
      if (d.status === "won") ev.push({ quando: d.updated_at, titulo: `Fechou: ${d.title}`, detalhe: brl(Number(d.value)), Icone: Trophy, cor: "text-accent" });
      if (d.status === "lost") ev.push({ quando: d.updated_at, titulo: "Não fechou", detalhe: d.motivo_perda ?? undefined, Icone: XCircle, cor: "text-red-300" });
    }
    for (const x of (procs.data ?? []) as { nome: string; realizado_em: string; valor: number }[]) {
      ev.push({ quando: x.realizado_em + "T12:00:00", titulo: `Fez ${x.nome}`, detalhe: Number(x.valor) ? brl(Number(x.valor)) : undefined, Icone: Syringe, cor: "text-emerald-300" });
    }
    for (const a of (ativ.data ?? []) as { description: string; created_at: string }[]) {
      ev.push({ quando: a.created_at, titulo: "Venda registrada sozinha pela IA", detalhe: a.description, Icone: Sparkles, cor: "text-accent" });
    }
    setEventos(ev.sort((a, b) => a.quando.localeCompare(b.quando)));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function abrirPosts() {
    setEscolherPost(true);
    const { data } = await supabase.from("redes_posts").select("id, legenda, thumbnail_url, url, visualizacoes, alcance, curtidas, comentarios, publicado_em").order("publicado_em", { ascending: false }).limit(24);
    setPosts((data as Post[]) ?? []);
  }
  async function escolher(p: Post) {
    await supabase.from("contacts").update({ origem_post_id: p.id }).eq("id", contactId);
    setEscolherPost(false);
    carregar();
  }
  async function buscar(t: string) {
    setBuscaIndicador(t);
    if (t.trim().length < 2) return setOpcoesIndicador([]);
    const { data } = await supabase.from("contacts").select("id, name").ilike("name", `%${t.trim()}%`).neq("id", contactId).limit(6);
    setOpcoesIndicador((data as { id: string; name: string }[]) ?? []);
  }
  async function definirIndicador(id: string) {
    await supabase.from("contacts").update({ indicado_por_id: id, origem_canal: c?.origem_canal ?? "indicacao" }).eq("id", contactId);
    setBuscaIndicador("");
    setOpcoesIndicador([]);
    carregar();
  }

  if (!c) return null;
  const canal = c.origem_canal ? CANAL[c.origem_canal] : null;
  const Ic = canal?.Icone ?? Globe;
  const ehRede = c.origem_canal === "instagram" || c.origem_canal === "anuncio_meta";

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {/* De onde veio */}
      <div className="bg-panel border border-border rounded-2xl p-5">
        <div className="text-xs uppercase tracking-[0.12em] text-muted mb-3">De onde veio</div>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-esmeralda/40 text-accent flex items-center justify-center"><Ic size={18} /></span>
          <div>
            <div className="text-white font-medium">{canal?.rotulo ?? "Origem não informada"}</div>
            <div className="text-xs text-muted">{[c.origem_detalhe, anuncio ? `Anúncio: ${anuncio.nome}` : null, c.utm_campaign ? `Campanha: ${c.utm_campaign}` : null].filter(Boolean).join(" · ") || "Sem detalhe"}</div>
          </div>
        </div>

        {/* Indicação: quem indicou */}
        <div className="mt-4 rounded-xl bg-panelmuted p-3">
          <div className="text-xs text-muted flex items-center gap-1.5 mb-1.5"><Gift size={12} /> Quem indicou</div>
          {indicador ? (
            <Link href={`/comercial/leads/${indicador.id}`} className="text-white font-medium hover:text-accent">{indicador.name}</Link>
          ) : (
            <div className="relative">
              <input
                id="busca-indicador"
                aria-label="Quem indicou este paciente"
                placeholder="Digite o nome de quem indicou"
                value={buscaIndicador}
                onChange={(e) => buscar(e.target.value)}
                className="w-full bg-bg border border-border rounded-md px-3 py-1.5 text-sm text-white"
              />
              {opcoesIndicador.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-panel border border-border rounded-md overflow-hidden">
                  {opcoesIndicador.map((o) => (
                    <button key={o.id} onClick={() => definirIndicador(o.id)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-panelmuted">{o.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {indicados.length > 0 && (
            <div className="text-xs text-accent mt-2">
              Este paciente já indicou {indicados.length}: {indicados.map((i) => i.name).join(", ")}. Merece um bônus.
            </div>
          )}
        </div>

        {/* Post/vídeo que trouxe */}
        {(ehRede || post) && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted">Post ou vídeo que trouxe</div>
              <button onClick={abrirPosts} className="text-xs text-accent">{post ? "Trocar" : "Escolher o post"}</button>
            </div>
            {post ? (
              <a href={post.url ?? "#"} target="_blank" rel="noreferrer" className="flex gap-3 rounded-xl bg-panelmuted p-2 hover:ring-1 hover:ring-accent/50">
                {post.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.thumbnail_url} alt="" className="w-20 h-24 object-cover rounded-lg" />
                ) : (
                  <div className="w-20 h-24 rounded-lg bg-bg" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white line-clamp-2">{post.legenda?.split("\n")[0] ?? "(sem legenda)"}</p>
                  <div className="flex gap-3 mt-2 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Eye size={11} /> {curto(post.visualizacoes || post.alcance)}</span>
                    <span className="flex items-center gap-1"><Heart size={11} /> {curto(post.curtidas)}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {curto(post.comentarios)}</span>
                  </div>
                </div>
              </a>
            ) : (
              <p className="text-xs text-muted">Ainda não sabemos qual post. Escolha para o sistema mostrar quais conteúdos trazem paciente.</p>
            )}
            {escolherPost && (
              <div className="grid grid-cols-4 gap-2 mt-3 max-h-72 overflow-y-auto">
                {posts.map((p) => (
                  <button key={p.id} onClick={() => escolher(p)} className="text-left rounded-lg overflow-hidden bg-panelmuted hover:ring-2 hover:ring-accent">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt="" className="w-full aspect-[4/5] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-bg" />
                    )}
                    <div className="p-1.5 text-[10px] text-muted line-clamp-2">{p.legenda?.split("\n")[0]}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caminho até aqui */}
      <div className="bg-panel border border-border rounded-2xl p-5">
        <div className="text-xs uppercase tracking-[0.12em] text-muted mb-3">Caminho até aqui</div>
        <ol className="relative border-l border-border ml-3 space-y-4">
          {eventos.map((e, i) => (
            <li key={i} className="ml-5">
              <span className={`absolute -left-3 w-6 h-6 rounded-full bg-panelmuted border border-border flex items-center justify-center ${e.cor}`}>
                <e.Icone size={12} />
              </span>
              <div className="text-sm text-white">{e.titulo}</div>
              <div className="text-[11px] text-muted">
                {dataHora(e.quando)}
                {e.detalhe ? ` · ${e.detalhe}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
