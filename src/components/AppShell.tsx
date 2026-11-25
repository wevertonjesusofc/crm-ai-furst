"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, ArrowLeftRight } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

const PUBLICAS = ["/login", "/cadastro"];

type Contexto = { clinicaNome: string; admin: boolean; entradoComoAdmin: boolean };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const [estado, setEstado] = useState<"carregando" | "logado" | "deslogado">("carregando");
  const [ctx, setCtx] = useState<Contexto | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEstado(data.session ? "logado" : "deslogado"));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEstado(session ? "logado" : "deslogado");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (estado === "deslogado" && !publica) router.replace("/login");
    if (estado === "logado" && publica) router.replace("/inicio");
  }, [estado, publica, router]);

  useEffect(() => {
    if (estado !== "logado") return;
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      const [{ data: clinicaId }, { data: adminRow }, { data: contexto }] = await Promise.all([
        supabase.rpc("current_clinica_id"),
        supabase.from("plataforma_admins").select("user_id").eq("user_id", uid ?? "").maybeSingle(),
        supabase.from("admin_contexto").select("clinica_id").eq("user_id", uid ?? "").maybeSingle(),
      ]);
      let clinicaNome = "";
      if (clinicaId) {
        const { data } = await supabase.from("clinicas").select("nome").eq("id", clinicaId).maybeSingle();
        clinicaNome = data?.nome ?? "";
      }
      setCtx({ clinicaNome, admin: !!adminRow, entradoComoAdmin: !!contexto });
    })();
  }, [estado, pathname]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (publica) return <main className="min-h-screen">{children}</main>;
  if (estado !== "logado") {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Carregando…</div>;
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_15%_0%,rgba(15,122,90,.35),transparent_45%),radial-gradient(ellipse_at_90%_100%,rgba(201,169,110,.08),transparent_40%)]">
      <Sidebar />
      <main className="flex-1 min-w-0 min-h-screen">
        <div className="flex items-center justify-between gap-3 px-8 py-2.5 border-b border-border bg-panel/60 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {ctx?.entradoComoAdmin && (
              <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded uppercase tracking-wide text-[10px] font-semibold">
                Modo administrador
              </span>
            )}
            <span className="text-white font-medium truncate">{ctx?.clinicaNome || "Sua clínica"}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {ctx?.admin && (
              <Link href="/admin" className="flex items-center gap-1.5 text-muted hover:text-white">
                {ctx.entradoComoAdmin ? <ArrowLeftRight size={13} /> : <Shield size={13} />}
                {ctx.entradoComoAdmin ? "Trocar de clínica" : "Clínicas"}
              </Link>
            )}
            <button onClick={sair} className="flex items-center gap-1.5 text-muted hover:text-white">
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
