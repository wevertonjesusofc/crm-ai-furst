"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthCard, { inputClass, labelClass } from "@/components/auth/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setErro(
        error.message.toLowerCase().includes("confirm")
          ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
          : "E-mail ou senha incorretos."
      );
      return;
    }
    router.replace("/comercial/dashboard");
  }

  return (
    <AuthCard titulo="Entrar" subtitulo="Acesse o sistema comercial da sua clínica.">
      <form onSubmit={entrar} className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>E-mail</label>
          <input id="login-email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="login-senha" className={labelClass}>Senha</label>
          <input id="login-senha" type="password" required autoComplete="current-password" value={senha}
            onChange={(e) => setSenha(e.target.value)} className={inputClass} />
        </div>
        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        <button type="submit" disabled={enviando}
          className="w-full bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md disabled:opacity-60">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-muted text-xs mt-4 text-center">
        Ainda não tem conta? <Link href="/cadastro" className="text-accent">Criar conta da clínica</Link>
      </p>
    </AuthCard>
  );
}
