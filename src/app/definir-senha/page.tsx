"use client";

// Quem foi convidado pela equipe cai aqui pelo link do e-mail: o Supabase já
// abre a sessão pelo link, e a pessoa só escolhe a senha para entrar.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthCard, { inputClass, labelClass } from "@/components/auth/AuthCard";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const ler = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setNome((data.user?.user_metadata?.nome as string) ?? "");
      setPronto(true);
    };
    ler();
    const { data: sub } = supabase.auth.onAuthStateChange(() => ler());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    setErro("");
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha, data: { nome: nome.trim() } });
    setEnviando(false);
    if (error) return setErro(error.message);
    router.replace("/inicio");
  }

  if (pronto && !email)
    return (
      <AuthCard titulo="Link expirado" subtitulo="Esse convite já foi usado ou venceu.">
        <p className="text-sm text-muted">Peça para o dono da clínica mandar o convite de novo em Sistema › Equipe e empresa.</p>
      </AuthCard>
    );

  return (
    <AuthCard titulo="Aceitar convite" subtitulo="Você foi convidado(a) para a equipe da clínica. Crie sua senha para entrar.">
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className={labelClass}>E-mail</label>
          <input value={email ?? "…"} disabled className={`${inputClass} opacity-70`} />
        </div>
        <div>
          <label htmlFor="ds-nome" className={labelClass}>Seu nome</label>
          <input id="ds-nome" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ds-senha" className={labelClass}>Crie uma senha</label>
          <div className="relative">
            <input id="ds-senha" type={mostrar ? "text" : "password"} required autoComplete="new-password" value={senha}
              onChange={(e) => setSenha(e.target.value)} className={`${inputClass} pr-10`} />
            <button type="button" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? "Esconder senha" : "Mostrar senha"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white">
              {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        <button type="submit" disabled={enviando || !email} className="w-full bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md disabled:opacity-60">
          {enviando ? "Salvando…" : "Aceitar e entrar"}
        </button>
      </form>
    </AuthCard>
  );
}
