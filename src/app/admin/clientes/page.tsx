"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, KeyRound, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  responsavel: string | null;
  dominio: string | null;
  url_sistema: string;
  supabase_projeto: string | null;
  vercel_projeto: string | null;
  gestao: "aura" | "cliente";
  status: "implantacao" | "ativo" | "pausado" | "transferido";
  observacoes: string | null;
};

const STATUS: Record<Cliente["status"], string> = {
  implantacao: "Em implantação",
  ativo: "Ativo",
  pausado: "Pausado",
  transferido: "Transferido ao cliente",
};
const vazio = { nome: "", responsavel: "", dominio: "", url_sistema: "", supabase_projeto: "", vercel_projeto: "" };
const input = "w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent";

export default function ClientesHubPage() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [uid, setUid] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [abrirForm, setAbrirForm] = useState(false);
  const [tokenPara, setTokenPara] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [aviso, setAviso] = useState("");

  async function carregar(id: string) {
    const [{ data }, { data: a }] = await Promise.all([
      supabase.from("clientes_hub").select("*").order("nome"),
      supabase.from("cliente_ativo").select("cliente_id").eq("user_id", id).maybeSingle(),
    ]);
    setClientes((data as Cliente[]) ?? []);
    setAtivo(a?.cliente_id ?? null);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? "";
      setUid(id);
      const { data: adm } = await supabase.from("plataforma_admins").select("user_id").eq("user_id", id).maybeSingle();
      setAdmin(!!adm);
      if (adm) carregar(id);
    })();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("clientes_hub").insert({
      nome: form.nome.trim(),
      responsavel: form.responsavel.trim() || null,
      dominio: form.dominio.trim() || null,
      url_sistema: form.url_sistema.trim(),
      supabase_projeto: form.supabase_projeto.trim() || null,
      vercel_projeto: form.vercel_projeto.trim() || null,
    });
    if (error) return setAviso(error.message);
    setForm(vazio);
    setAbrirForm(false);
    carregar(uid);
  }

  async function usar(c: Cliente) {
    await supabase.from("cliente_ativo").upsert({ user_id: uid, cliente_id: c.id, updated_at: new Date().toISOString() });
    setAtivo(c.id);
    setAviso(`Conta ativa no Claude: ${c.nome}. No próximo pedido o Claude avisa que você trocou.`);
  }

  async function mudar(c: Cliente, campo: "gestao" | "status", valor: string) {
    await supabase.from("clientes_hub").update({ [campo]: valor }).eq("id", c.id);
    carregar(uid);
  }

  async function salvarToken(e: React.FormEvent) {
    e.preventDefault();
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/hub/token", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ clienteId: tokenPara, token }),
    });
    const data = await resp.json().catch(() => ({}));
    setAviso(resp.ok ? "Token salvo. O Claude já consegue trabalhar nessa clínica." : data.error ?? "Não foi possível salvar.");
    if (resp.ok) {
      setToken("");
      setTokenPara(null);
    }
  }

  if (admin === null) return <div className="mx-8 pt-8 text-muted text-sm">Carregando…</div>;
  if (!admin) return <div className="mx-8 pt-8 text-muted text-sm">Esta área é só para administradores da plataforma.</div>;

  return (
    <div className="mx-8 pt-8 pb-10">
      <span className="text-xs text-accent uppercase tracking-wide font-medium">Central da Aura</span>
      <div className="flex items-end justify-between gap-4 mt-1 mb-2">
        <h1 className="text-3xl font-semibold text-white">Clientes</h1>
        <button onClick={() => setAbrirForm((v) => !v)} className="flex items-center gap-1.5 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md">
          <Plus size={14} /> Novo cliente
        </button>
      </div>
      <p className="text-muted text-sm mb-6 max-w-2xl">
        Cada clínica tem o próprio sistema, o próprio banco e o próprio domínio. Clique em <b className="text-white">Usar no Claude</b> para
        trabalhar naquela conta: o Claude avisa a troca e passa a mexer só nela.
      </p>

      {aviso && <div className="mb-4 text-xs text-accent bg-accent/10 border border-accent/30 rounded-md px-3 py-2">{aviso}</div>}

      {abrirForm && (
        <form onSubmit={criar} className="bg-panel border border-border rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          {(
            [
              ["nome", "Nome da clínica", true],
              ["responsavel", "Responsável", false],
              ["url_sistema", "Endereço do sistema (https://…)", true],
              ["dominio", "Domínio", false],
              ["supabase_projeto", "Projeto no Supabase", false],
              ["vercel_projeto", "Projeto no Vercel", false],
            ] as [keyof typeof vazio, string, boolean][]
          ).map(([k, label, req]) => (
            <div key={k}>
              <label htmlFor={`cli-${k}`} className="block text-xs text-muted mb-1">{label}</label>
              <input id={`cli-${k}`} required={req} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={input} />
            </div>
          ))}
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">Salvar cliente</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {clientes.length === 0 && (
          <div className="bg-panel border border-border rounded-lg p-6 text-muted text-sm">
            Nenhum cliente ainda. Cadastre a primeira clínica com o endereço do sistema dela.
          </div>
        )}
        {clientes.map((c) => (
          <div key={c.id} className={`bg-panel border rounded-lg p-4 ${ativo === c.id ? "border-accent" : "border-border"}`}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{c.nome}</span>
                  {ativo === c.id && <span className="text-[10px] uppercase tracking-wide bg-accent text-bg px-2 py-0.5 rounded">Ativo no Claude</span>}
                  <span className="text-[11px] text-muted">{STATUS[c.status]}</span>
                </div>
                <div className="text-xs text-muted mt-0.5 break-all">
                  {c.url_sistema}
                  {c.responsavel ? ` · ${c.responsavel}` : ""}
                  {c.supabase_projeto ? ` · Supabase: ${c.supabase_projeto}` : ""}
                  {c.vercel_projeto ? ` · Vercel: ${c.vercel_projeto}` : ""}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                  <label className="flex items-center gap-1.5 text-muted" htmlFor={`gestao-${c.id}`}>
                    Hospedagem:
                    <select id={`gestao-${c.id}`} value={c.gestao} onChange={(e) => mudar(c, "gestao", e.target.value)} className="bg-bg border border-border rounded px-2 py-1 text-white">
                      <option value="aura">Aura cuida (na mensalidade)</option>
                      <option value="cliente">Cliente assumiu (ele paga)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-muted" htmlFor={`status-${c.id}`}>
                    Status:
                    <select id={`status-${c.id}`} value={c.status} onChange={(e) => mudar(c, "status", e.target.value)} className="bg-bg border border-border rounded px-2 py-1 text-white">
                      {Object.entries(STATUS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => usar(c)}
                  disabled={c.status === "transferido"}
                  className="flex items-center gap-1.5 bg-accent text-bg text-xs font-medium px-3 py-2 rounded-md disabled:opacity-40"
                >
                  <Sparkles size={13} /> Usar no Claude
                </button>
                <a href={c.url_sistema} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted hover:text-white border border-border rounded-md px-3 py-2">
                  <ExternalLink size={13} /> Abrir sistema
                </a>
                <button onClick={() => setTokenPara(c.id)} className="flex items-center gap-1.5 text-xs text-muted hover:text-white border border-border rounded-md px-3 py-2">
                  <KeyRound size={13} /> Token do MCP
                </button>
              </div>
            </div>
            {tokenPara === c.id && (
              <form onSubmit={salvarToken} className="mt-3 flex gap-2">
                <input
                  id={`token-${c.id}`}
                  aria-label="Token do MCP da clínica"
                  placeholder="Cole o token aura_… gerado em Sistema › Conectar IA no sistema da clínica"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={input}
                />
                <button type="submit" className="bg-accent text-bg text-xs font-medium px-3 rounded-md">Salvar</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <p className="text-muted text-xs mt-6">
        Para conectar o Claude à central, gere um token em <Link href="/sistema/conectar-ia" className="text-accent">Sistema › Conectar IA</Link> e
        troque o final do endereço de <code>/api/mcp</code> para <code>/api/mcp/central</code>.
      </p>
    </div>
  );
}
