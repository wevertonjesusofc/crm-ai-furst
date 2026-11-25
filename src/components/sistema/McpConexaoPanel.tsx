"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, KeyRound, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Token = { id: string; nome: string; created_at: string; ultimo_uso_at: string | null };

export default function McpConexaoPanel() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [novo, setNovo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [origem, setOrigem] = useState("");

  async function carregar() {
    const { data } = await supabase.from("mcp_tokens").select("id, nome, created_at, ultimo_uso_at").order("created_at", { ascending: false });
    setTokens((data as Token[]) ?? []);
  }

  useEffect(() => {
    setOrigem(window.location.origin);
    carregar();
  }, []);

  async function gerar() {
    setErro("");
    const { data: s } = await supabase.auth.getSession();
    const resp = await fetch("/api/mcp/tokens", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
      body: JSON.stringify({ nome: "Claude" }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return setErro(data.error ?? "Não foi possível gerar o token.");
    setNovo(data.token);
    carregar();
  }

  async function apagar(id: string) {
    await supabase.from("mcp_tokens").delete().eq("id", id);
    carregar();
  }

  const comando = novo
    ? `claude mcp add --transport http crm-aura ${origem}/api/mcp --header "Authorization: Bearer ${novo}"`
    : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(comando);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div>
      {novo ? (
        <div className="bg-bg border border-accent/40 rounded-md p-3 space-y-2">
          <p className="text-xs text-white">Copie agora: este token aparece só uma vez.</p>
          <pre className="text-[11px] text-accent whitespace-pre-wrap break-all bg-panel rounded p-2 select-all">{comando}</pre>
          <button onClick={copiar} className="flex items-center gap-1.5 text-xs text-muted hover:text-white">
            <Copy size={12} /> {copiado ? "Copiado" : "Copiar comando"}
          </button>
          <p className="text-[11px] text-muted">Cole no terminal do Claude Code. Depois é só conversar: o Claude altera os agentes desta clínica.</p>
        </div>
      ) : (
        <button onClick={gerar} className="w-full bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md flex items-center justify-center gap-1.5">
          Conectar minha IA <ArrowUpRight size={14} />
        </button>
      )}
      {erro && <p className="text-red-400 text-xs mt-2">{erro}</p>}

      {tokens.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] text-muted uppercase tracking-wide">Conexões ativas</div>
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-muted">
              <KeyRound size={12} className="text-accent" />
              <span className="text-white">{t.nome}</span>
              <span>· criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
              <span>· {t.ultimo_uso_at ? `usado em ${new Date(t.ultimo_uso_at).toLocaleDateString("pt-BR")}` : "nunca usado"}</span>
              <button onClick={() => apagar(t.id)} aria-label="Desconectar" className="ml-auto hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
