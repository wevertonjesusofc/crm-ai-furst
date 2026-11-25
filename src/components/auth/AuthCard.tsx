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
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-bg font-bold">A</div>
          <div>
            <div className="font-semibold text-white leading-none">CRM AURA</div>
            <div className="text-[10px] text-muted tracking-wide">SISTEMA COMERCIAL · AI FIRST</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1">{titulo}</h1>
        <p className="text-muted text-sm mb-6">{subtitulo}</p>
        <div className="bg-panel border border-border rounded-lg p-5">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full bg-bg border border-border rounded-md px-3 py-2.5 text-sm text-white placeholder:text-muted/70 focus:outline-none focus:border-accent";
export const labelClass = "block text-xs text-muted mb-1.5";
