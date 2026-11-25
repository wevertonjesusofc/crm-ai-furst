"use client";

// Lista de pacientes. Clicou, abre a ficha (ficha clínica, anamnese, retornos e orçamentos).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, HeartPulse, CalendarClock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Paciente = {
  id: string;
  name: string;
  whatsapp: string | null;
  origem_canal: string | null;
  alergias: string | null;
  created_at: string;
};

const ORIGEM: Record<string, string> = {
  instagram: "Instagram",
  anuncio_meta: "Anúncio Meta",
  anuncio_google: "Anúncio Google",
  google: "Google",
  indicacao: "Indicação",
  formulario: "Site",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export default function PacientesPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Paciente[] | null>(null);
  const [retornos, setRetornos] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoZap, setNovoZap] = useState("");
  const [abrirNovo, setAbrirNovo] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: ret }] = await Promise.all([
        supabase.from("contacts").select("id, name, whatsapp, origem_canal, alergias, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("procedimentos_realizados").select("contact_id, retorno_em").eq("retorno_status", "pendente").not("retorno_em", "is", null).order("retorno_em"),
      ]);
      setLista((data as Paciente[]) ?? []);
      const m: Record<string, string> = {};
      for (const r of ret ?? []) if (!m[r.contact_id]) m[r.contact_id] = r.retorno_em as string;
      setRetornos(m);
    })();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    const { data } = await supabase
      .from("contacts")
      .insert({ name: novoNome.trim(), whatsapp: novoZap.replace(/\D/g, "") || null })
      .select("id")
      .single();
    if (data) router.push(`/comercial/leads/${data.id}`);
  }

  const termo = busca.trim().toLowerCase();
  const filtrados = (lista ?? []).filter((p) => !termo || p.name.toLowerCase().includes(termo) || (p.whatsapp ?? "").includes(termo.replace(/\D/g, "") || "§"));
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-8 pt-8 pb-10">
      <div className="flex items-end justify-between gap-4 mb-2">
        <h1 className="text-3xl font-semibold text-white">Pacientes</h1>
        <button onClick={() => setAbrirNovo((v) => !v)} className="flex items-center gap-1.5 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md">
          <UserPlus size={14} /> Novo paciente
        </button>
      </div>
      <p className="text-muted text-sm mb-5">Clique no paciente para abrir a ficha: alergias, preferências, anamnese, procedimentos, retornos e orçamentos.</p>

      {abrirNovo && (
        <form onSubmit={criar} className="bg-panel border border-border rounded-lg p-4 mb-4 flex gap-2">
          <input id="novo-nome" aria-label="Nome do paciente" placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white" />
          <input id="novo-zap" aria-label="WhatsApp" placeholder="WhatsApp" value={novoZap} onChange={(e) => setNovoZap(e.target.value)} className="w-48 bg-bg border border-border rounded px-3 py-2 text-sm text-white" />
          <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 rounded-md">Criar e abrir ficha</button>
        </form>
      )}

      <div className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input id="busca-paciente" aria-label="Buscar paciente" placeholder="Buscar por nome ou WhatsApp" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-panel border border-border rounded-md pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
      </div>

      <div className="bg-panel border border-border rounded-lg divide-y divide-border">
        {lista === null && <div className="p-6 text-muted text-sm">Carregando…</div>}
        {lista && filtrados.length === 0 && (
          <div className="p-6 text-muted text-sm">{lista.length === 0 ? "Nenhum paciente ainda. Os que chegarem pelo WhatsApp, Instagram ou site entram aqui sozinhos." : "Ninguém com esse nome ou número."}</div>
        )}
        {filtrados.map((p) => {
          const ret = retornos[p.id];
          return (
            <Link key={p.id} href={`/comercial/leads/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-panelmuted">
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted">{p.whatsapp ?? "sem WhatsApp"} · {p.origem_canal ? ORIGEM[p.origem_canal] ?? p.origem_canal : "origem não informada"}</div>
              </div>
              {p.alergias && (
                <span className="text-[11px] text-red-300 flex items-center gap-1"><HeartPulse size={12} /> Alergia</span>
              )}
              {ret && (
                <span className={`text-[11px] flex items-center gap-1 ${ret < hoje ? "text-red-300" : "text-amber-300"}`}>
                  <CalendarClock size={12} /> Retorno {new Date(ret + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
