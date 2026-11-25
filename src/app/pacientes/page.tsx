"use client";

// Pacientes em cards: rosto (inicial), de onde veio, etapa no funil, alergia e retorno.
// Clicou, abre a ficha (ficha clínica, anamnese, retornos e orçamentos).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, HeartPulse, CalendarClock, Instagram, MessageCircle, Megaphone, Users, Globe, Search as Google } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/meta";

type Paciente = {
  id: string;
  name: string;
  whatsapp: string | null;
  instagram_usuario: string | null;
  origem_canal: string | null;
  alergias: string | null;
  created_at: string;
};

const ORIGEM: Record<string, { rotulo: string; Icone: typeof Instagram; cor: string }> = {
  instagram: { rotulo: "Instagram", Icone: Instagram, cor: "text-pink-300 bg-pink-500/10" },
  anuncio_meta: { rotulo: "Anúncio Meta", Icone: Megaphone, cor: "text-sky-300 bg-sky-500/10" },
  anuncio_google: { rotulo: "Anúncio Google", Icone: Google, cor: "text-amber-300 bg-amber-500/10" },
  google: { rotulo: "Google", Icone: Google, cor: "text-amber-300 bg-amber-500/10" },
  indicacao: { rotulo: "Indicação", Icone: Users, cor: "text-violet-300 bg-violet-500/10" },
  formulario: { rotulo: "Site", Icone: Globe, cor: "text-teal-300 bg-teal-500/10" },
  whatsapp: { rotulo: "WhatsApp", Icone: MessageCircle, cor: "text-emerald-300 bg-emerald-500/10" },
};

const FILTROS = ["Todos", "Com retorno", "Com alergia", "Instagram", "Anúncios", "Indicação"] as const;

export default function PacientesPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Paciente[] | null>(null);
  const [retornos, setRetornos] = useState<Record<string, string>>({});
  const [vendas, setVendas] = useState<Record<string, { etapa: string; valor: number }>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todos");
  const [novoNome, setNovoNome] = useState("");
  const [novoZap, setNovoZap] = useState("");
  const [abrirNovo, setAbrirNovo] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: ret }, { data: deals }, { data: stages }] = await Promise.all([
        supabase.from("contacts").select("id, name, whatsapp, instagram_usuario, origem_canal, alergias, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("procedimentos_realizados").select("contact_id, retorno_em").eq("retorno_status", "pendente").not("retorno_em", "is", null).order("retorno_em"),
        supabase.from("deals").select("contact_id, stage_id, value, created_at").order("created_at", { ascending: false }),
        supabase.from("pipeline_stages").select("id, name"),
      ]);
      setLista((data as Paciente[]) ?? []);
      const m: Record<string, string> = {};
      for (const r of ret ?? []) if (!m[r.contact_id]) m[r.contact_id] = r.retorno_em as string;
      setRetornos(m);
      const nomes = new Map((stages ?? []).map((s) => [s.id, s.name as string]));
      const v: Record<string, { etapa: string; valor: number }> = {};
      for (const d of deals ?? []) if (!v[d.contact_id]) v[d.contact_id] = { etapa: nomes.get(d.stage_id) ?? "", valor: Number(d.value ?? 0) };
      setVendas(v);
    })();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    const { data } = await supabase.from("contacts").insert({ name: novoNome.trim(), whatsapp: novoZap.replace(/\D/g, "") || null }).select("id").single();
    if (data) router.push(`/comercial/leads/${data.id}`);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (lista ?? []).filter((p) => {
      if (t && !p.name.toLowerCase().includes(t) && !(p.whatsapp ?? "").includes(t.replace(/\D/g, "") || "§") && !(p.instagram_usuario ?? "").toLowerCase().includes(t)) return false;
      if (filtro === "Com retorno") return !!retornos[p.id];
      if (filtro === "Com alergia") return !!p.alergias;
      if (filtro === "Instagram") return p.origem_canal === "instagram";
      if (filtro === "Anúncios") return p.origem_canal?.startsWith("anuncio");
      if (filtro === "Indicação") return p.origem_canal === "indicacao";
      return true;
    });
  }, [lista, busca, filtro, retornos]);

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pacientes</h1>
          <p className="text-muted text-sm">{lista ? `${lista.length} pacientes` : "…"} · clique para abrir a ficha clínica</p>
        </div>
        <button onClick={() => setAbrirNovo((v) => !v)} className="flex items-center gap-1.5 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md">
          <UserPlus size={14} /> Novo paciente
        </button>
      </div>

      {abrirNovo && (
        <form onSubmit={criar} className="bg-panel border border-border rounded-xl p-4 mt-4 flex gap-2">
          <input id="novo-nome" aria-label="Nome do paciente" placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white" />
          <input id="novo-zap" aria-label="WhatsApp" placeholder="WhatsApp" value={novoZap} onChange={(e) => setNovoZap(e.target.value)} className="w-48 bg-bg border border-border rounded px-3 py-2 text-sm text-white" />
          <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 rounded-md">Criar e abrir ficha</button>
        </form>
      )}

      <div className="flex items-center gap-3 mt-5 mb-5 flex-wrap">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id="busca-paciente" aria-label="Buscar paciente" placeholder="Nome, WhatsApp ou @" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-panel border border-border rounded-full pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`text-xs px-3 py-1.5 rounded-full border ${filtro === f ? "bg-accent text-bg border-accent font-medium" : "border-border text-muted hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {lista === null && <p className="text-muted text-sm">Carregando…</p>}
      {lista && filtrados.length === 0 && <p className="text-muted text-sm">Ninguém aqui ainda.</p>}

      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
        {filtrados.map((p) => {
          const o = p.origem_canal ? ORIGEM[p.origem_canal] : null;
          const ret = retornos[p.id];
          const v = vendas[p.id];
          const nome = p.name.startsWith("@") || !p.instagram_usuario ? p.name : p.name;
          return (
            <Link key={p.id} href={`/comercial/leads/${p.id}`} className="group bg-panel border border-border rounded-2xl p-4 hover:border-accent/60 hover:-translate-y-0.5 transition">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 text-white flex items-center justify-center font-semibold shrink-0">
                  {nome.replace("@", "").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-white font-medium truncate group-hover:text-accent">{nome}</div>
                  <div className="text-[11px] text-muted truncate">
                    {p.instagram_usuario ? `@${p.instagram_usuario}` : p.whatsapp ?? "sem contato"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {o && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${o.cor}`}>
                    <o.Icone size={11} /> {o.rotulo}
                  </span>
                )}
                {p.alergias && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 text-red-300 bg-red-500/10">
                    <HeartPulse size={11} /> Alergia
                  </span>
                )}
                {ret && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${ret < hoje ? "text-red-300 bg-red-500/10" : "text-amber-300 bg-amber-500/10"}`}>
                    <CalendarClock size={11} /> Retorno {new Date(ret + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
                <span className="text-muted truncate">{v?.etapa || "Sem oportunidade"}</span>
                {v && v.valor > 0 && <span className="text-white font-medium tabular-nums">{brl(v.valor)}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
