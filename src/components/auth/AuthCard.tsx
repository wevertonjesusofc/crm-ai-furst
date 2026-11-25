import VitrineProntto from "./VitrineProntto";

// Entrada da ferramenta: a Prontto no canto esquerdo (marca + formulário) e,
// no resto da tela, a vitrine animada mostrando o que o sistema faz.

export default function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[440px_1fr]">
      <div className="flex flex-col justify-between px-8 py-10 border-r border-border bg-[#083A2E]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-bg font-serif text-xl font-bold">P</div>
          <div>
            <div className="font-semibold text-white leading-none">Prontto AI</div>
            <div className="text-[10px] text-muted tracking-[0.18em] mt-1">SISTEMA OPERACIONAL DA CLÍNICA</div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto py-10">
          <h1 className="text-4xl font-semibold text-white mb-1">{titulo}</h1>
          <p className="text-muted text-sm mb-6">{subtitulo}</p>
          <div className="bg-panel border border-border rounded-2xl p-5">{children}</div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          Marketing e vendas da clínica num lugar só: de onde vem cada paciente, quem atendeu, o que fechou e quem precisa voltar.
        </p>
      </div>

      <div className="hidden lg:block relative min-h-screen">
        <VitrineProntto />
      </div>
    </div>
  );
}

export const inputClass =
  "w-full bg-bg border border-border rounded-md px-3 py-2.5 text-sm text-white placeholder:text-muted/70 focus:outline-none focus:border-accent";
export const labelClass = "block text-xs text-muted mb-1.5";
