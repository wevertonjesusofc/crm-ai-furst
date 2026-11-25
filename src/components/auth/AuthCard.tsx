import VitrineProntto from "./VitrineProntto";

// Entrada da ferramenta: a Prontto no canto esquerdo (marca + formulário) e,
// no resto da tela, a vitrine animada. Sem linha dividindo: o painel da
// esquerda se dissolve em degradê no fundo da vitrine.

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_70%_50%,#0B4A3B_0%,#062A21_55%,#041E18_100%)]">
      {/* vitrine ocupa a tela toda e some suavemente à esquerda */}
      <div
        className="hidden lg:block absolute inset-y-0 right-0 left-[180px]"
        style={{ maskImage: "linear-gradient(to right, rgba(0,0,0,.5) 0%, black 30%)", WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,.5) 0%, black 30%)" }}
      >
        <VitrineProntto />
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-screen w-full lg:w-[460px] px-8 py-10 bg-[linear-gradient(to_right,rgba(6,42,33,.55)_0%,rgba(6,42,33,.25)_70%,rgba(6,42,33,0)_100%)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-bg font-serif text-xl font-bold">P</div>
          <div>
            <div className="font-semibold text-white leading-none">Prontto AI</div>
            <div className="text-[10px] text-muted tracking-[0.18em] mt-1">SISTEMA OPERACIONAL DA CLÍNICA</div>
          </div>
        </div>

        <div className="w-full max-w-sm py-10">
          <h1 className="text-4xl font-semibold text-white mb-1">{titulo}</h1>
          <p className="text-muted text-sm mb-6">{subtitulo}</p>
          <div className="bg-[#0A372C]/45 backdrop-blur-md border border-accent/20 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,.35)]">{children}</div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed max-w-sm">
          Marketing e vendas da clínica num lugar só: de onde vem cada paciente, quem atendeu, o que fechou e quem precisa voltar.
        </p>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full bg-[#062A21]/60 border border-border rounded-md px-3 py-2.5 text-sm text-white placeholder:text-muted/70 focus:outline-none focus:border-accent";
export const labelClass = "block text-xs text-muted mb-1.5";
