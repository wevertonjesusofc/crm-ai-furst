"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthCard, { inputClass, labelClass } from "@/components/auth/AuthCard";

// Login com "lembrar de mim": guarda só o e-mail neste aparelho.
// A senha quem salva é o próprio navegador (o campo está marcado para isso).
const CHAVE_EMAIL = "prontto:email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_EMAIL);
      if (salvo) setEmail(salvo);
    } catch {}
  }, []);

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
    try {
      if (lembrar) localStorage.setItem(CHAVE_EMAIL, email.trim());
      else localStorage.removeItem(CHAVE_EMAIL);
    } catch {}
    router.replace("/inicio");
  }

  return (
    <AuthCard titulo="Entrar" subtitulo="Acesse o sistema operacional da sua clínica.">
      <form onSubmit={entrar} className="space-y-4" method="post" action="#">
        <div>
          <label htmlFor="login-email" className={labelClass}>E-mail</label>
          <input id="login-email" name="email" type="email" required autoComplete="username email" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="login-senha" className={labelClass}>Senha</label>
          <div className="relative">
            <input id="login-senha" name="password" type={mostrar ? "text" : "password"} required autoComplete="current-password" value={senha}
              onChange={(e) => setSenha(e.target.value)} className={`${inputClass} pr-10`} />
            <button type="button" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? "Esconder senha" : "Mostrar senha"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white">
              {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <label htmlFor="login-lembrar" className="flex items-center gap-2 text-xs text-muted select-none">
          <input id="login-lembrar" type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="accent-[#C9A96E]" />
          Lembrar de mim neste aparelho
        </label>
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
