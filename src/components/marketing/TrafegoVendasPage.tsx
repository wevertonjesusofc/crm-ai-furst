"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Eye, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/meta";

type Linha = {
  anuncio_id: string;
  plataforma: string;
  nome: string;
  campanha: string | null;
  gasto: number;
  cliques: number;
  conversas_plataforma: number;
  pacientes: number;
  vendas: number;
  receita: number;
  custo_por_venda: number | null;
  retorno_por_real: number | null;
};

// Regra simples e explicável para o dono:
// - Escalar: trouxe venda e cada R$ 1 voltou R$ 3 ou mais.
// - Cortar: já gastou R$ 300 ou mais e não trouxe nenhuma venda.
// - Observar: o resto (pouco dado ainda).
export function recomendacao(l: Pick<Linha, "gasto" | "vendas" | "retorno_por_real">) {
  if (l.vendas > 0 && (l.retorno_por_real ?? 0) >= 3) return { rotulo: "Escalar", cor: "text-accent bg-accent/15", icone: TrendingUp };
  if (l.gasto >= 300 && l.vendas === 0) return { rotulo: "Cortar ou trocar o criativo", cor: "text-red-300 bg-red-500/15", icone: TrendingDown };
  return { rotulo: "Observar", cor: "text-amber-300 bg-amber-500/15", icone: Eye };
}

export default function TrafegoVendasPage() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [chave, setChave] = useState("");
  const [aviso, setAviso] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [origem, setOrigem] = useState("");

  async function carregar() {
    const { data } = await supabase.from("desempenho_anuncios").select("*").order("gasto", { ascending: false });
    setLinhas((data as Linha[]) ?? []);
  }

  useEffect(() => {
    setOrigem(window.location.origin);
    carregar();
    supabase.rpc("current_clinica_id").then(async ({ data: id }) => {
      const { data } = await supabase.from("clinicas").select("chave_entrada_leads").eq("id", id).maybeSingle();
      setChave(data?.chave_entrada_leads ?? "");
    });
  }, []);

  async function sincronizarMeta() {
    setSincronizando(true);
    setAviso("");
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/trafego/meta", { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const data = await resp.json().catch(() => ({}));
    setSincronizando(false);
    setAviso(resp.ok ? `Meta sincronizada: ${data.anuncios} anúncio(s), ${data.dias} registro(s) diários.` : data.error ?? "Não foi possível sincronizar.");
    if (resp.ok) carregar();
  }

  const total = (linhas ?? []).reduce(
    (a, l) => ({ gasto: a.gasto + Number(l.gasto), vendas: a.vendas + l.vendas, receita: a.receita + Number(l.receita), pacientes: a.pacientes + l.pacientes }),
    { gasto: 0, vendas: 0, receita: 0, pacientes: 0 }
  );

  const exemplo = `curl -X POST ${origem}/api/rastreio/lead \\
  -H "content-type: application/json" -H "x-chave-clinica: ${chave || "lead_..."}" \\
  -d '{"nome":"Maria","whatsapp":"5562999999999","anuncio":{"plataforma":"meta","id":"ID_DO_ANUNCIO","nome":"Vídeo botox 1"},"mensagem":"Oi, quanto custa o botox?"}'`;

  return (
    <div className="mx-8 pt-8 pb-10">
      <span className="text-xs text-accent uppercase tracking-wide font-medium">Marketing</span>
      <div className="flex items-end justify-between gap-4 mt-1 mb-2">
        <h1 className="text-3xl font-semibold text-white">Tráfego e vendas</h1>
        <button onClick={sincronizarMeta} disabled={sincronizando} className="flex items-center gap-1.5 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md disabled:opacity-60">
          <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} /> Sincronizar Meta Ads
        </button>
      </div>
      <p className="text-muted text-sm mb-6 max-w-2xl">Quanto cada anúncio gastou, quantos pacientes trouxe e quanto virou venda. O que dá retorno, escala. O que só gasta, corta.</p>
      {aviso && <div className="mb-4 text-xs text-accent bg-accent/10 border border-accent/30 rounded-md px-3 py-2">{aviso}</div>}

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          ["Investido", brl(total.gasto)],
          ["Pacientes vindos de anúncio", String(total.pacientes)],
          ["Vendas", String(total.vendas)],
          ["Retorno por R$ 1", total.gasto > 0 ? `R$ ${(total.receita / total.gasto).toFixed(2)}` : "—"],
        ].map(([r, v]) => (
          <div key={r} className="bg-panel border border-border rounded-lg p-4">
            <div className="text-[11px] text-muted">{r}</div>
            <div className="text-xl text-white font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted uppercase tracking-wide border-b border-border">
              <th className="px-4 py-3">Anúncio</th>
              <th className="px-3 py-3 text-right">Gasto</th>
              <th className="px-3 py-3 text-right">Conversas</th>
              <th className="px-3 py-3 text-right">Pacientes</th>
              <th className="px-3 py-3 text-right">Vendas</th>
              <th className="px-3 py-3 text-right">Receita</th>
              <th className="px-3 py-3 text-right">Custo por venda</th>
              <th className="px-3 py-3">O que fazer</th>
            </tr>
          </thead>
          <tbody>
            {linhas === null && <tr><td colSpan={8} className="px-4 py-6 text-muted">Carregando…</td></tr>}
            {linhas?.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-muted">Nenhum anúncio ainda. Sincronize a Meta ou mande leads com o id do anúncio pela entrada abaixo.</td></tr>
            )}
            {linhas?.map((l) => {
              const r = recomendacao(l);
              const Icone = r.icone;
              return (
                <tr key={l.anuncio_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-white">{l.nome}</div>
                    <div className="text-[11px] text-muted">{l.plataforma === "meta" ? "Meta" : l.plataforma === "google" ? "Google" : "Outro"}{l.campanha ? ` · ${l.campanha}` : ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{brl(l.gasto)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.conversas_plataforma}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.pacientes}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.vendas}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{brl(l.receita)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.custo_por_venda ? brl(l.custo_por_venda) : "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded ${r.cor}`}><Icone size={12} /> {r.rotulo}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted mt-2">Escalar: trouxe venda e cada R$ 1 voltou R$ 3 ou mais. Cortar: gastou R$ 300 ou mais sem venda. Venda conta quando a oportunidade do paciente é marcada como ganha.</p>

      <div className="mt-8 bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white font-medium mb-1">Entrada de leads com origem</h3>
        <p className="text-muted text-xs mb-3">
          Formulário do site, webhook do WhatsApp (anúncio de clique para WhatsApp manda o id do anúncio), Zernio, Make ou n8n mandam o lead para cá.
          O paciente entra no funil já marcado com a origem e o anúncio.
        </p>
        <pre className="text-[11px] text-accent whitespace-pre-wrap break-all bg-bg rounded p-3">{exemplo}</pre>
        <button
          onClick={() => navigator.clipboard?.writeText(exemplo).catch(() => {})}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted hover:text-white"
        >
          <Copy size={12} /> Copiar exemplo
        </button>
        <p className="text-[11px] text-muted mt-2">A chave é desta clínica. Não publique em lugar aberto.</p>
      </div>
    </div>
  );
}
