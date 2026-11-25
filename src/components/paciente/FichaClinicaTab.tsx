"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Coffee, HeartPulse, Plus, Receipt, ShieldCheck, Syringe, CalendarClock, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MODELOS, ESPECIALIDADES, Especialidade, sugerirRetorno } from "@/lib/anamnese";

type Ficha = {
  data_nascimento: string | null;
  alergias: string | null;
  medicamentos: string | null;
  preferencias: string | null;
  consentimento_lgpd_em: string | null;
  origem_canal: string | null;
  origem_detalhe: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  anuncio_id: string | null;
};
type Procedimento = { id: string; nome: string; realizado_em: string; profissional: string | null; produto_lote: string | null; valor: number; retorno_em: string | null; retorno_status: string };
type Orcamento = { id: string; descricao: string; valor: number; status: string; enviado_em: string };
type Anamnese = { id: string; modelo: string; respostas: Record<string, string>; created_at: string };

const ORIGENS: Record<string, string> = {
  instagram: "Instagram (orgânico)",
  anuncio_meta: "Anúncio Meta",
  anuncio_google: "Anúncio Google",
  google: "Google (orgânico)",
  indicacao: "Indicação",
  formulario: "Formulário do site",
  whatsapp: "WhatsApp direto",
  outro: "Outro",
};
const campo = "w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent";
const hoje = () => new Date().toISOString().slice(0, 10);

export default function FichaClinicaTab({ contactId }: { contactId: string }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [especialidade, setEspecialidade] = useState<Especialidade>("estetica");
  const [procs, setProcs] = useState<Procedimento[]>([]);
  const [orcs, setOrcs] = useState<Orcamento[]>([]);
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [anuncioNome, setAnuncioNome] = useState<string | null>(null);
  const [novoProc, setNovoProc] = useState({ nome: "", realizado_em: hoje(), profissional: "", produto_lote: "", valor: "", retorno_em: "" });
  const [novoOrc, setNovoOrc] = useState({ descricao: "", valor: "" });
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [abrirAnamnese, setAbrirAnamnese] = useState(false);

  async function carregar() {
    const [{ data: c }, { data: clinica }, { data: p }, { data: o }, { data: a }] = await Promise.all([
      supabase
        .from("contacts")
        .select("data_nascimento, alergias, medicamentos, preferencias, consentimento_lgpd_em, origem_canal, origem_detalhe, utm_source, utm_campaign, anuncio_id")
        .eq("id", contactId)
        .maybeSingle(),
      supabase.rpc("current_clinica_id").then(async ({ data: id }) => supabase.from("clinicas").select("especialidade").eq("id", id).maybeSingle()),
      supabase.from("procedimentos_realizados").select("*").eq("contact_id", contactId).order("realizado_em", { ascending: false }),
      supabase.from("orcamentos").select("id, descricao, valor, status, enviado_em").eq("contact_id", contactId).order("enviado_em", { ascending: false }),
      supabase.from("anamneses").select("id, modelo, respostas, created_at").eq("contact_id", contactId).order("created_at", { ascending: false }),
    ]);
    setFicha((c as Ficha) ?? null);
    if (clinica?.especialidade) setEspecialidade(clinica.especialidade as Especialidade);
    setProcs((p as Procedimento[]) ?? []);
    setOrcs((o as Orcamento[]) ?? []);
    setAnamneses((a as Anamnese[]) ?? []);
    if (c?.anuncio_id) {
      const { data: an } = await supabase.from("anuncios").select("nome").eq("id", c.anuncio_id).maybeSingle();
      setAnuncioNome(an?.nome ?? null);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function salvarCampo(k: keyof Ficha, v: string | null) {
    setFicha((f) => (f ? { ...f, [k]: v } : f));
    await supabase.from("contacts").update({ [k]: v || null }).eq("id", contactId);
  }

  async function registrarConsentimento() {
    const agora = new Date().toISOString();
    await salvarCampo("consentimento_lgpd_em", agora);
  }

  async function addProc(e: React.FormEvent) {
    e.preventDefault();
    if (!novoProc.nome.trim()) return;
    const retorno = novoProc.retorno_em || sugerirRetorno(novoProc.nome, novoProc.realizado_em);
    await supabase.from("procedimentos_realizados").insert({
      contact_id: contactId,
      nome: novoProc.nome.trim(),
      realizado_em: novoProc.realizado_em,
      profissional: novoProc.profissional.trim() || null,
      produto_lote: novoProc.produto_lote.trim() || null,
      valor: Number(novoProc.valor.replace(",", ".")) || 0,
      retorno_em: retorno,
    });
    setNovoProc({ nome: "", realizado_em: hoje(), profissional: "", produto_lote: "", valor: "", retorno_em: "" });
    carregar();
  }

  async function mudarRetorno(id: string, status: string) {
    await supabase.from("procedimentos_realizados").update({ retorno_status: status }).eq("id", id);
    carregar();
  }

  async function addOrc(e: React.FormEvent) {
    e.preventDefault();
    if (!novoOrc.descricao.trim()) return;
    await supabase.from("orcamentos").insert({ contact_id: contactId, descricao: novoOrc.descricao.trim(), valor: Number(novoOrc.valor.replace(",", ".")) || 0 });
    setNovoOrc({ descricao: "", valor: "" });
    carregar();
  }

  async function mudarOrc(id: string, status: string) {
    await supabase.from("orcamentos").update({ status, respondido_em: status === "pendente" ? null : new Date().toISOString() }).eq("id", id);
    carregar();
  }

  async function salvarAnamnese(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("anamneses").insert({ contact_id: contactId, modelo: especialidade, respostas });
    if (respostas.alergias && !ficha?.alergias) await salvarCampo("alergias", respostas.alergias);
    if (respostas.medicamentos && !ficha?.medicamentos) await salvarCampo("medicamentos", respostas.medicamentos);
    setRespostas({});
    setAbrirAnamnese(false);
    carregar();
  }

  if (!ficha) return <div className="bg-panel border border-border rounded-lg p-4 text-muted text-sm">Carregando ficha…</div>;

  const perguntas = MODELOS[especialidade];
  const dinheiro = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      {/* Alertas e preferências */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-medium flex items-center gap-1.5"><HeartPulse size={15} className="text-red-400" /> Atenção clínica</h3>
          <div>
            <label htmlFor="f-alergias" className="text-[11px] text-muted">Alergias</label>
            <input id="f-alergias" defaultValue={ficha.alergias ?? ""} onBlur={(e) => salvarCampo("alergias", e.target.value)} className={campo} placeholder="Nenhuma informada" />
          </div>
          <div>
            <label htmlFor="f-medicamentos" className="text-[11px] text-muted">Medicamentos em uso</label>
            <input id="f-medicamentos" defaultValue={ficha.medicamentos ?? ""} onBlur={(e) => salvarCampo("medicamentos", e.target.value)} className={campo} />
          </div>
          <div>
            <label htmlFor="f-nasc" className="text-[11px] text-muted">Data de nascimento</label>
            <input id="f-nasc" type="date" defaultValue={ficha.data_nascimento ?? ""} onBlur={(e) => salvarCampo("data_nascimento", e.target.value)} className={campo} />
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-medium flex items-center gap-1.5"><Coffee size={15} className="text-amber-300" /> Preferências e experiência</h3>
          <textarea
            id="f-pref"
            aria-label="Preferências do paciente"
            defaultValue={ficha.preferencias ?? ""}
            onBlur={(e) => salvarCampo("preferencias", e.target.value)}
            rows={4}
            className={campo}
            placeholder="Ex.: prefere café sem açúcar, gosta de horário cedo, tem medo de agulha, gosta de conversar"
          />
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck size={14} className={ficha.consentimento_lgpd_em ? "text-accent" : "text-muted"} />
            {ficha.consentimento_lgpd_em ? (
              <span className="text-muted">Consentimento LGPD registrado em {new Date(ficha.consentimento_lgpd_em).toLocaleDateString("pt-BR")}</span>
            ) : (
              <button onClick={registrarConsentimento} className="text-accent">Registrar consentimento LGPD do paciente</button>
            )}
          </div>
        </div>
      </div>

      {/* Origem */}
      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white font-medium flex items-center gap-1.5 mb-3"><Target size={15} className="text-accent" /> De onde veio</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="f-origem" className="text-[11px] text-muted">Canal</label>
            <select id="f-origem" value={ficha.origem_canal ?? ""} onChange={(e) => salvarCampo("origem_canal", e.target.value)} className={campo}>
              <option value="">Não informado</option>
              {Object.entries(ORIGENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="f-origem-det" className="text-[11px] text-muted">Detalhe (post, quem indicou, campanha)</label>
            <input id="f-origem-det" defaultValue={ficha.origem_detalhe ?? ""} onBlur={(e) => salvarCampo("origem_detalhe", e.target.value)} className={campo} />
          </div>
        </div>
        {(anuncioNome || ficha.utm_campaign) && (
          <p className="text-xs text-muted mt-2">
            {anuncioNome && <>Anúncio: <span className="text-white">{anuncioNome}</span> · </>}
            {ficha.utm_source && <>UTM: {ficha.utm_source}{ficha.utm_campaign ? ` / ${ficha.utm_campaign}` : ""}</>}
          </p>
        )}
      </div>

      {/* Procedimentos e retornos */}
      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white font-medium flex items-center gap-1.5 mb-3"><Syringe size={15} className="text-accent" /> Procedimentos e retornos</h3>
        <form onSubmit={addProc} className="grid grid-cols-6 gap-2 mb-4">
          <input aria-label="Procedimento" placeholder="Procedimento" value={novoProc.nome} onChange={(e) => setNovoProc({ ...novoProc, nome: e.target.value })} className={`${campo} col-span-2`} />
          <input aria-label="Data" type="date" value={novoProc.realizado_em} onChange={(e) => setNovoProc({ ...novoProc, realizado_em: e.target.value })} className={campo} />
          <input aria-label="Produto e lote" placeholder="Produto / lote" value={novoProc.produto_lote} onChange={(e) => setNovoProc({ ...novoProc, produto_lote: e.target.value })} className={campo} />
          <input aria-label="Valor" placeholder="Valor" value={novoProc.valor} onChange={(e) => setNovoProc({ ...novoProc, valor: e.target.value })} className={campo} />
          <button type="submit" className="bg-accent text-bg text-xs font-medium rounded-md flex items-center justify-center gap-1"><Plus size={13} /> Registrar</button>
          <input aria-label="Profissional" placeholder="Profissional" value={novoProc.profissional} onChange={(e) => setNovoProc({ ...novoProc, profissional: e.target.value })} className={`${campo} col-span-2`} />
          <label className="col-span-4 flex items-center gap-2 text-[11px] text-muted" htmlFor="f-retorno">
            Retorno em
            <input id="f-retorno" type="date" value={novoProc.retorno_em} onChange={(e) => setNovoProc({ ...novoProc, retorno_em: e.target.value })} className={`${campo} w-44`} />
            <span>(vazio = sugerido automaticamente pelo procedimento)</span>
          </label>
        </form>
        {procs.length === 0 ? (
          <p className="text-muted text-sm">Nenhum procedimento registrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {procs.map((p) => {
              const vencido = p.retorno_em && p.retorno_status === "pendente" && p.retorno_em < hoje();
              return (
                <div key={p.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white">{p.nome} <span className="text-muted text-xs">· {new Date(p.realizado_em + "T12:00:00").toLocaleDateString("pt-BR")}{p.profissional ? ` · ${p.profissional}` : ""}{p.produto_lote ? ` · ${p.produto_lote}` : ""}</span></div>
                    {p.retorno_em && (
                      <div className={`text-xs flex items-center gap-1 ${vencido ? "text-red-400" : "text-muted"}`}>
                        <CalendarClock size={12} /> Retorno {new Date(p.retorno_em + "T12:00:00").toLocaleDateString("pt-BR")}{vencido ? " · atrasado" : ""}
                      </div>
                    )}
                  </div>
                  <span className="text-muted text-xs tabular-nums">{dinheiro(p.valor)}</span>
                  {p.retorno_em && (
                    <select aria-label="Situação do retorno" value={p.retorno_status} onChange={(e) => mudarRetorno(p.id, e.target.value)} className="bg-bg border border-border rounded px-2 py-1 text-xs text-white">
                      <option value="pendente">Retorno pendente</option>
                      <option value="agendado">Agendado</option>
                      <option value="feito">Feito</option>
                      <option value="nao_vai">Não vai voltar</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Orçamentos */}
      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white font-medium flex items-center gap-1.5 mb-3"><Receipt size={15} className="text-accent" /> Orçamentos</h3>
        <form onSubmit={addOrc} className="flex gap-2 mb-3">
          <input aria-label="Descrição do orçamento" placeholder="Ex.: harmonização completa, 3 sessões" value={novoOrc.descricao} onChange={(e) => setNovoOrc({ ...novoOrc, descricao: e.target.value })} className={campo} />
          <input aria-label="Valor do orçamento" placeholder="Valor" value={novoOrc.valor} onChange={(e) => setNovoOrc({ ...novoOrc, valor: e.target.value })} className={`${campo} w-32`} />
          <button type="submit" className="bg-accent text-bg text-xs font-medium px-3 rounded-md">Adicionar</button>
        </form>
        {orcs.length === 0 ? (
          <p className="text-muted text-sm">Nenhum orçamento.</p>
        ) : (
          orcs.map((o) => {
            const dias = Math.floor((Date.now() - new Date(o.enviado_em).getTime()) / 86400000);
            return (
              <div key={o.id} className="flex items-center gap-3 py-2 text-sm border-t border-border first:border-t-0">
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{o.descricao}</div>
                  <div className={`text-xs ${o.status === "pendente" && dias >= 7 ? "text-amber-300" : "text-muted"}`}>
                    Enviado há {dias} dia(s){o.status === "pendente" && dias >= 7 ? " · entra no Giro de 30 dias" : ""}
                  </div>
                </div>
                <span className="text-muted text-xs tabular-nums">{dinheiro(o.valor)}</span>
                <select aria-label="Situação do orçamento" value={o.status} onChange={(e) => mudarOrc(o.id, e.target.value)} className="bg-bg border border-border rounded px-2 py-1 text-xs text-white">
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="recusado">Recusado</option>
                </select>
              </div>
            );
          })
        )}
      </div>

      {/* Anamnese */}
      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium flex items-center gap-1.5"><ClipboardList size={15} className="text-accent" /> Anamnese · {ESPECIALIDADES[especialidade]}</h3>
          <button onClick={() => setAbrirAnamnese((v) => !v)} className="text-xs text-accent">{abrirAnamnese ? "Fechar" : "Nova anamnese"}</button>
        </div>
        {abrirAnamnese && (
          <form onSubmit={salvarAnamnese} className="space-y-3 mb-4">
            {perguntas.map((q) => (
              <div key={q.id}>
                <label htmlFor={`an-${q.id}`} className="text-xs text-muted">{q.texto}</label>
                {q.tipo === "sim_nao" ? (
                  <select id={`an-${q.id}`} value={respostas[q.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [q.id]: e.target.value })} className={campo}>
                    <option value="">—</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : q.tipo === "longo" ? (
                  <textarea id={`an-${q.id}`} rows={2} value={respostas[q.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [q.id]: e.target.value })} className={campo} />
                ) : (
                  <input id={`an-${q.id}`} value={respostas[q.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [q.id]: e.target.value })} className={campo} />
                )}
              </div>
            ))}
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">Salvar anamnese</button>
            <p className="text-[11px] text-muted">Ficha de relacionamento e triagem. Não substitui o prontuário médico oficial.</p>
          </form>
        )}
        {anamneses.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma anamnese preenchida.</p>
        ) : (
          anamneses.map((a) => (
            <details key={a.id} className="border-t border-border py-2 first:border-t-0">
              <summary className="text-sm text-white cursor-pointer">
                {ESPECIALIDADES[(a.modelo as Especialidade) ?? "outro"] ?? a.modelo} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </summary>
              <div className="mt-2 space-y-1">
                {(MODELOS[(a.modelo as Especialidade)] ?? []).filter((q) => a.respostas[q.id]).map((q) => (
                  <div key={q.id} className="text-xs"><span className="text-muted">{q.texto}</span> <span className="text-white">{a.respostas[q.id]}</span></div>
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
