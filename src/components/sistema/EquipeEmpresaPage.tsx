"use client";

// Equipe e empresa: o dono cadastra os dados da clínica, convida o time
// (e-mail para entrar no sistema + WhatsApp de cada um) e tira acesso.

import { useEffect, useState } from "react";
import { Building2, Users, UserPlus, Trash2, Crown, Mail, Phone, Check, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pessoa = { email: string; nome: string; cargo: string | null; papel: "dono" | "equipe"; whatsapp: string | null; desde: string; sou_eu: boolean; status: "ativo" | "convidado" };
type Empresa = Record<string, string | null>;

const CAMPOS_EMPRESA: { chave: string; rotulo: string; dica?: string; largo?: boolean }[] = [
  { chave: "nome", rotulo: "Nome da clínica" },
  { chave: "razao_social", rotulo: "Razão social" },
  { chave: "cnpj", rotulo: "CNPJ" },
  { chave: "whatsapp", rotulo: "WhatsApp da clínica", dica: "O número que atende os pacientes" },
  { chave: "telefone", rotulo: "Telefone fixo" },
  { chave: "email_contato", rotulo: "E-mail de contato" },
  { chave: "instagram", rotulo: "Instagram", dica: "@daclinica" },
  { chave: "site", rotulo: "Site" },
  { chave: "endereco", rotulo: "Endereço", largo: true },
  { chave: "cidade", rotulo: "Cidade / UF" },
];

const campo = "w-full bg-bg/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent disabled:opacity-60";

async function api(caminho: string, corpo?: unknown) {
  const { data: s } = await supabase.auth.getSession();
  const r = await fetch(caminho, {
    method: corpo === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Não deu certo.");
  return d;
}

export default function EquipeEmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [equipe, setEquipe] = useState<Pessoa[] | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [novo, setNovo] = useState({ nome: "", email: "", cargo: "", whatsapp: "", papel: "equipe" });
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    const [{ data: c }, eq] = await Promise.all([supabase.from("clinicas").select("*").limit(1).maybeSingle(), api("/api/equipe").catch((e) => ({ erro: e.message }))]);
    setEmpresa((c as Empresa) ?? {});
    if ("erro" in eq) {
      setEquipe([]);
      setAviso({ ok: false, msg: eq.erro });
    } else {
      setEquipe(eq.equipe);
      setPodeEditar(eq.podeEditar);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvarEmpresa(chave: string, valor: string) {
    if (!empresa?.id || (empresa[chave] ?? "") === valor) return;
    setEmpresa({ ...empresa, [chave]: valor });
    const { error } = await supabase.from("clinicas").update({ [chave]: valor || null }).eq("id", empresa.id);
    setAviso(error ? { ok: false, msg: /column/.test(error.message) ? "Falta rodar a supabase_migration_031_equipe_e_empresa.sql no Supabase." : error.message } : { ok: true, msg: "Dados da empresa salvos." });
  }

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    try {
      await api("/api/equipe?acao=convidar", novo);
      setAviso({ ok: true, msg: `${novo.nome || novo.email} convidado(a). Mande o link de cadastro para a pessoa entrar com esse e-mail.` });
      setNovo({ nome: "", email: "", cargo: "", whatsapp: "", papel: "equipe" });
      carregar();
    } catch (err) {
      setAviso({ ok: false, msg: (err as Error).message });
    }
    setEnviando(false);
  }

  async function remover(p: Pessoa) {
    if (!confirm(`Tirar o acesso de ${p.nome} (${p.email})? A pessoa não entra mais no sistema.`)) return;
    try {
      await api("/api/equipe?acao=remover", { email: p.email });
      setAviso({ ok: true, msg: `Acesso de ${p.nome} removido.` });
      carregar();
    } catch (err) {
      setAviso({ ok: false, msg: (err as Error).message });
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/cadastro`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  }

  return (
    <div className="mx-8 pt-8 pb-10 max-w-5xl">
      <h1 className="text-2xl font-semibold text-white">Equipe e empresa</h1>
      <p className="text-muted text-sm mt-0.5">Os dados da clínica, quem entra no sistema e o WhatsApp de cada pessoa do time.</p>
      {aviso && <p className={`text-xs mt-2 ${aviso.ok ? "text-accent" : "text-red-400"}`}>{aviso.msg}</p>}
      {!podeEditar && equipe && <p className="text-xs text-amber-300 mt-2">Só o dono da clínica pode alterar. Você está vendo.</p>}

      {/* Empresa */}
      <section className="bg-panel border border-border rounded-2xl p-5 mt-6">
        <h2 className="text-white font-semibold flex items-center gap-2"><Building2 size={16} className="text-accent" /> Empresa</h2>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {CAMPOS_EMPRESA.map((f) => (
            <label key={f.chave} className={`block ${f.largo ? "col-span-2" : ""}`}>
              <span className="text-[11px] text-muted">{f.rotulo}</span>
              <input
                key={`${f.chave}-${empresa?.id ?? ""}`}
                disabled={!podeEditar || !empresa}
                defaultValue={(empresa?.[f.chave] as string) ?? ""}
                placeholder={f.dica}
                onBlur={(e) => salvarEmpresa(f.chave, e.target.value.trim())}
                className={campo}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Equipe */}
      <section className="bg-panel border border-border rounded-2xl p-5 mt-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-white font-semibold flex items-center gap-2"><Users size={16} className="text-accent" /> Equipe {equipe ? <span className="text-muted font-normal text-sm">· {equipe.length}</span> : null}</h2>
          <button onClick={copiarLink} className="text-xs border border-border rounded-full px-3 py-1.5 text-muted hover:text-white flex items-center gap-1.5">
            {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? "Link copiado" : "Copiar link de cadastro"}
          </button>
        </div>

        <div className="mt-4 divide-y divide-border">
          {equipe === null && <p className="text-sm text-muted py-3">Carregando…</p>}
          {equipe?.map((p) => (
            <div key={p.email} className="py-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/30 to-esmeralda/30 flex items-center justify-center text-white font-semibold shrink-0">
                {p.nome.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white flex items-center gap-2">
                  {p.nome} {p.sou_eu && <span className="text-[10px] text-muted">(você)</span>}
                  {p.papel === "dono" && <span className="text-[10px] text-accent flex items-center gap-0.5"><Crown size={10} /> Dono</span>}
                </div>
                <div className="text-[11px] text-muted flex gap-3 flex-wrap">
                  {p.cargo && <span>{p.cargo}</span>}
                  <span className="flex items-center gap-1"><Mail size={10} /> {p.email}</span>
                  {p.whatsapp && <span className="flex items-center gap-1"><Phone size={10} /> {p.whatsapp}</span>}
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${p.status === "ativo" ? "bg-accent/15 text-accent" : "bg-sky-500/10 text-sky-300"}`}>
                {p.status === "ativo" ? "No sistema" : "Convite enviado"}
              </span>
              {podeEditar && !p.sou_eu && (
                <button onClick={() => remover(p)} aria-label={`Tirar acesso de ${p.nome}`} title="Tirar acesso" className="text-muted hover:text-red-300 p-1.5"><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>

        {podeEditar && (
          <form onSubmit={convidar} className="mt-4 rounded-xl bg-panelmuted p-4">
            <div className="text-sm text-white font-medium flex items-center gap-2 mb-3"><UserPlus size={14} className="text-accent" /> Convidar pessoa</div>
            <div className="grid grid-cols-2 gap-3">
              <input required aria-label="Nome" placeholder="Nome (ex.: Bruna)" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className={campo} />
              <input required type="email" aria-label="E-mail" placeholder="E-mail que ela vai usar para entrar" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} className={campo} />
              <input aria-label="Cargo" placeholder="Cargo (ex.: Recepção, Comercial)" value={novo.cargo} onChange={(e) => setNovo({ ...novo, cargo: e.target.value })} className={campo} />
              <input aria-label="WhatsApp" placeholder="WhatsApp com DDD (ex.: 11 99999-0000)" value={novo.whatsapp} onChange={(e) => setNovo({ ...novo, whatsapp: e.target.value })} className={campo} />
            </div>
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <label className="text-xs text-muted flex items-center gap-2">
                Acesso:
                <select aria-label="Tipo de acesso" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })} className="bg-bg border border-border rounded-lg px-2 py-1 text-white text-xs">
                  <option value="equipe">Equipe (usa o sistema)</option>
                  <option value="dono">Sócio / dono (também mexe em conexões e equipe)</option>
                </select>
              </label>
              <button disabled={enviando} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-full disabled:opacity-60">{enviando ? "Convidando…" : "Convidar"}</button>
            </div>
            <p className="text-[11px] text-muted mt-3">
              A pessoa entra em <b className="text-white">/cadastro</b> com esse e-mail. Ela também aparece no Organograma, e o WhatsApp dela é o que o Gerente reconhece.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
