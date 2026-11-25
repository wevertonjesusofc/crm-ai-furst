"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthCard, { inputClass, labelClass } from "@/components/auth/AuthCard";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [clinica, setClinica] = useState("");
  const [especialidade, setEspecialidade] = useState("estetica");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (!aceite) return setErro("Para continuar, aceite os termos de uso e o tratamento de dados.");
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { nome: nome.trim(), clinica_nome: clinica.trim(), especialidade },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setEnviando(false);
    if (error) {
      const m = error.message.toLowerCase();
      setErro(
        m.includes("registered")
          ? "Esse e-mail já tem conta. Entre pelo login."
          : m.includes("database error")
            ? "O cadastro desta clínica já foi feito. Para entrar na equipe, peça um convite ao dono da clínica."
            : "Não foi possível criar a conta. Confira os dados e tente de novo."
      );
      return;
    }
    if (data.session) router.replace("/comercial/dashboard");
    else setConfirmar(true);
  }

  if (confirmar) {
    return (
      <AuthCard titulo="Confira seu e-mail" subtitulo="Falta só um passo para ativar a sua clínica.">
        <p className="text-sm text-white">
          Enviamos um link de confirmação para <span className="text-accent">{email}</span>. Clique nele e depois entre com
          seu e-mail e senha. O sistema da clínica já vai estar montado.
        </p>
        <Link href="/login" className="block text-center w-full bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md mt-5">
          Ir para o login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Criar conta da clínica" subtitulo="Em um minuto o sistema comercial da sua clínica fica pronto.">
      <form onSubmit={criar} className="space-y-4">
        <div>
          <label htmlFor="cad-nome" className={labelClass}>Seu nome</label>
          <input id="cad-nome" required autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cad-clinica" className={labelClass}>Nome da clínica</label>
          <input id="cad-clinica" required value={clinica} onChange={(e) => setClinica(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cad-esp" className={labelClass}>Área da clínica</label>
          <select id="cad-esp" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={inputClass}>
            <option value="estetica">Estética</option>
            <option value="clinico">Clínica médica</option>
            <option value="odonto">Odontologia</option>
            <option value="outro">Outra</option>
          </select>
        </div>
        <div>
          <label htmlFor="cad-email" className={labelClass}>E-mail</label>
          <input id="cad-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cad-senha" className={labelClass}>Senha (mínimo 8 caracteres)</label>
          <input id="cad-senha" type="password" required minLength={8} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputClass} />
        </div>
        <label htmlFor="cad-aceite" className="flex items-start gap-2 text-xs text-muted">
          <input id="cad-aceite" type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5" />
          <span>
            Li e aceito os termos de uso. A clínica é a dona dos dados dos pacientes, e a equipe da plataforma pode acessar a
            conta para configurar e dar suporte, conforme a LGPD.
          </span>
        </label>
        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        <button type="submit" disabled={enviando}
          className="w-full bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-md disabled:opacity-60">
          {enviando ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <p className="text-muted text-xs mt-4 text-center">
        Já tem conta? <Link href="/login" className="text-accent">Entrar</Link>
      </p>
    </AuthCard>
  );
}
