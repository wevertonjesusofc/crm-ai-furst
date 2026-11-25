"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogIn, Home } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Clinica = { id: string; nome: string; status: string; created_at: string };

export default function AdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [uid, setUid] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? "";
      setUid(id);
      const { data: adm } = await supabase.from("plataforma_admins").select("user_id").eq("user_id", id).maybeSingle();
      setAdmin(!!adm);
      if (!adm) return;
      const [{ data: lista }, { data: ctx }] = await Promise.all([
        supabase.from("clinicas").select("id, nome, status, created_at").order("created_at", { ascending: false }),
        supabase.from("admin_contexto").select("clinica_id").eq("user_id", id).maybeSingle(),
      ]);
      setClinicas((lista as Clinica[]) ?? []);
      setAtual(ctx?.clinica_id ?? null);
    })();
  }, []);

  async function entrar(clinicaId: string) {
    await supabase.from("admin_contexto").upsert({ user_id: uid, clinica_id: clinicaId, updated_at: new Date().toISOString() });
    router.push("/inicio");
    router.refresh();
  }

  async function voltarParaMinha() {
    await supabase.from("admin_contexto").delete().eq("user_id", uid);
    router.push("/inicio");
    router.refresh();
  }

  if (admin === null) return <div className="mx-8 pt-8 text-muted text-sm">Carregando…</div>;
  if (!admin) {
    return (
      <div className="mx-8 pt-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-muted text-sm">Esta área é só para administradores da plataforma.</p>
      </div>
    );
  }

  const filtradas = clinicas.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="mx-8 pt-8 pb-8">
      <span className="text-xs text-accent uppercase tracking-wide font-medium">Administração da plataforma</span>
      <div className="flex items-end justify-between gap-4 mt-1 mb-2">
        <h1 className="text-3xl font-semibold text-white">Clínicas desta instalação</h1>
        <a href="/admin/clientes" className="text-xs text-accent border border-accent/40 rounded-md px-3 py-2">Painel de clientes (central)</a>
      </div>
      <p className="text-muted text-sm mb-6 max-w-xl">
        Todas as clínicas que criaram conta. Entre em uma para configurar o sistema dela: agentes, funil, Instagram e WhatsApp.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <input
          id="admin-busca"
          aria-label="Buscar clínica"
          placeholder="Buscar clínica…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-panel border border-border rounded-md px-3 py-2 text-sm text-white w-72 focus:outline-none focus:border-accent"
        />
        <span className="text-muted text-xs">{clinicas.length} clínica(s)</span>
        {atual && (
          <button onClick={voltarParaMinha} className="ml-auto flex items-center gap-1.5 text-xs text-muted hover:text-white border border-border rounded-md px-3 py-2">
            <Home size={13} /> Voltar para a minha clínica
          </button>
        )}
      </div>

      <div className="bg-panel border border-border rounded-lg divide-y divide-border">
        {filtradas.length === 0 && <div className="p-6 text-muted text-sm">Nenhuma clínica encontrada.</div>}
        {filtradas.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-4 py-3">
            <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-medium truncate">{c.nome}</div>
              <div className="text-muted text-xs">
                Criada em {new Date(c.created_at).toLocaleDateString("pt-BR")} · {c.status === "ativa" ? "Ativa" : "Pausada"}
              </div>
            </div>
            {atual === c.id ? (
              <span className="text-xs text-amber-300">Você está nesta clínica</span>
            ) : (
              <button onClick={() => entrar(c.id)} className="flex items-center gap-1.5 bg-accent text-bg text-xs font-medium px-3 py-2 rounded-md">
                <LogIn size={13} /> Entrar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
