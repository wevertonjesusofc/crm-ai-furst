"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, XCircle, KeyRound, Copy, ListChecks } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { INTEGRACOES } from "@/lib/integracoes/catalogo";

type Estado = {
  config: Record<string, string>;
  segredos_preenchidos: string[];
  status: "desconectado" | "conectado" | "erro";
  ultimo_teste_at: string | null;
  ultimo_teste_msg: string | null;
};

const campoCls = "w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent";

export default function IntegracaoPanel({ tipo }: { tipo: string }) {
  const def = INTEGRACOES[tipo];
  const [estado, setEstado] = useState<Estado | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [segredos, setSegredos] = useState<Record<string, string>>({});
  const [trocando, setTrocando] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [origem, setOrigem] = useState("");

  async function carregar() {
    const { data } = await supabase.from("integracoes").select("config, segredos_preenchidos, status, ultimo_teste_at, ultimo_teste_msg").eq("tipo", tipo).maybeSingle();
    const e: Estado = (data as Estado) ?? { config: {}, segredos_preenchidos: [], status: "desconectado", ultimo_teste_at: null, ultimo_teste_msg: null };
    setEstado(e);
    setConfig(e.config ?? {});
    setSegredos({});
    setTrocando({});
  }

  useEffect(() => {
    setOrigem(window.location.origin);
    setAviso(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  async function salvar(testar: boolean) {
    setSalvando(true);
    setAviso(null);
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/integracoes", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ tipo, config, segredos, testar }),
    });
    const data = await resp.json().catch(() => ({}));
    setSalvando(false);
    if (!resp.ok) return setAviso({ ok: false, msg: data.error ?? "Não foi possível salvar." });
    setAviso({ ok: data.status !== "erro", msg: data.msg ?? "Salvo." });
    carregar();
  }

  async function apagar(nome: string) {
    const { data: s } = await supabase.auth.getSession();
    await fetch("/api/integracoes", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ tipo, config, apagar: [nome] }),
    });
    carregar();
  }

  if (!def) return null;
  if (!estado) return <div className="text-muted text-sm">Carregando…</div>;

  const Status = estado.status === "conectado" ? CheckCircle2 : estado.status === "erro" ? XCircle : CircleDashed;
  const corStatus = estado.status === "conectado" ? "text-accent" : estado.status === "erro" ? "text-red-400" : "text-muted";
  const rotuloStatus = estado.status === "conectado" ? "Conectado" : estado.status === "erro" ? "Com erro" : "Não conectado";
  const webhook = def.webhook ? `${origem}${def.webhook}` : "";

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-white text-lg font-medium">{def.titulo}</h2>
        <span className={`flex items-center gap-1.5 text-xs shrink-0 ${corStatus}`}>
          <Status size={14} /> {rotuloStatus}
        </span>
      </div>
      <p className="text-muted text-sm mb-5">{def.descricao}</p>

      <div className="bg-panel border border-border rounded-lg p-4 space-y-4">
        {def.campos.map((c) => {
          const id = `int-${tipo}-${c.nome}`;
          if (c.segredo) {
            const salvo = estado.segredos_preenchidos.includes(c.nome);
            const editar = !salvo || trocando[c.nome];
            return (
              <div key={c.nome}>
                <label htmlFor={id} className="text-xs text-muted flex items-center gap-1.5">
                  <KeyRound size={12} /> {c.rotulo}
                </label>
                {editar ? (
                  <input
                    id={id}
                    type="password"
                    autoComplete="off"
                    placeholder={c.placeholder ?? "Cole aqui"}
                    value={segredos[c.nome] ?? ""}
                    onChange={(e) => setSegredos({ ...segredos, [c.nome]: e.target.value })}
                    className={`${campoCls} mt-1`}
                  />
                ) : (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-muted">•••••••• salvo</span>
                    <button onClick={() => setTrocando({ ...trocando, [c.nome]: true })} className="text-xs text-accent">Trocar</button>
                    <button onClick={() => apagar(c.nome)} className="text-xs text-red-400">Apagar</button>
                  </div>
                )}
                {c.dica && <p className="text-[11px] text-muted mt-1">{c.dica}</p>}
              </div>
            );
          }
          return (
            <div key={c.nome}>
              <label htmlFor={id} className="text-xs text-muted">{c.rotulo}</label>
              {c.opcoes ? (
                <select id={id} value={config[c.nome] ?? ""} onChange={(e) => setConfig({ ...config, [c.nome]: e.target.value })} className={`${campoCls} mt-1`}>
                  {c.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              ) : (
                <input id={id} placeholder={c.placeholder} value={config[c.nome] ?? ""} onChange={(e) => setConfig({ ...config, [c.nome]: e.target.value })} className={`${campoCls} mt-1`} />
              )}
              {c.dica && <p className="text-[11px] text-muted mt-1">{c.dica}</p>}
            </div>
          );
        })}

        {webhook && (
          <div>
            <div className="text-xs text-muted">Endereço do webhook (cole na Meta)</div>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-bg border border-border rounded px-3 py-2 text-xs text-accent break-all select-all">{webhook}</code>
              <button onClick={() => navigator.clipboard?.writeText(webhook).catch(() => {})} aria-label="Copiar endereço" className="text-muted hover:text-white">
                <Copy size={14} />
              </button>
            </div>
            {webhook.includes("localhost") && <p className="text-[11px] text-amber-300 mt-1">Funciona só depois que o sistema estiver no ar com o domínio. A Meta não acessa o localhost.</p>}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => salvar(false)} disabled={salvando} className="bg-panelmuted border border-border text-white text-sm px-4 py-2 rounded-md disabled:opacity-60">
            Salvar
          </button>
          {def.testavel && (
            <button onClick={() => salvar(true)} disabled={salvando} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md disabled:opacity-60">
              {salvando ? "Testando…" : "Salvar e testar conexão"}
            </button>
          )}
        </div>
        {aviso && <p className={`text-xs ${aviso.ok ? "text-accent" : "text-red-400"}`}>{aviso.msg}</p>}
        {!aviso && estado.ultimo_teste_msg && (
          <p className="text-[11px] text-muted">
            Último teste {estado.ultimo_teste_at ? `em ${new Date(estado.ultimo_teste_at).toLocaleString("pt-BR")}` : ""}: {estado.ultimo_teste_msg}
          </p>
        )}
      </div>

      <div className="mt-4 bg-panel border border-border rounded-lg p-4">
        <div className="text-white text-sm font-medium flex items-center gap-1.5 mb-2"><ListChecks size={14} className="text-accent" /> Onde conseguir cada dado</div>
        <ol className="list-decimal pl-5 space-y-1 text-xs text-muted">
          {def.comoConseguir.map((p) => <li key={p}>{p}</li>)}
        </ol>
        <p className="text-[11px] text-muted mt-3">As chaves ficam guardadas só no servidor. Depois de salvas, nem esta tela mostra o valor de novo.</p>
      </div>
    </div>
  );
}
