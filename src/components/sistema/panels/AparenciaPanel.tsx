"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AparenciaPanel() {
  const [tema, setTema] = useState<"claro" | "escuro">("escuro");

  useEffect(() => {
    supabase
      .from("sistema_config")
      .select("tema")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => data && setTema(data.tema));
  }, []);

  async function escolher(t: "claro" | "escuro") {
    setTema(t);
    await supabase.from("sistema_config").update({ tema: t }).eq("id", "default");
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Aparência</h2>
      <p className="text-muted text-sm mb-4">Escolha entre tema claro ou escuro.</p>

      <div className="bg-panel border border-border rounded-lg p-5">
        <h3 className="text-white text-sm font-medium mb-3">Tema da interface</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => escolher("claro")}
            className={`text-left border rounded-lg p-4 flex items-center gap-3 ${tema === "claro" ? "border-accent" : "border-border"}`}
          >
            <span className="w-9 h-9 rounded-full bg-panelmuted flex items-center justify-center text-muted">
              <Sun size={16} />
            </span>
            <div>
              <div className="text-white text-sm font-medium">Claro</div>
              <div className="text-muted text-xs">Fundo branco, texto escuro</div>
            </div>
          </button>
          <button
            onClick={() => escolher("escuro")}
            className={`text-left border rounded-lg p-4 flex items-center gap-3 ${tema === "escuro" ? "border-accent" : "border-border"}`}
          >
            <span className="w-9 h-9 rounded-full bg-panelmuted flex items-center justify-center text-accent">
              <Moon size={16} />
            </span>
            <div>
              <div className="text-white text-sm font-medium">Escuro</div>
              <div className="text-muted text-xs">Fundo escuro, texto claro</div>
            </div>
          </button>
        </div>
        {tema === "claro" && (
          <p className="text-amber-300 text-xs mt-3">
            O tema claro ainda não foi implementado visualmente em todo o app — só a preferência é salva por
            enquanto.
          </p>
        )}
      </div>
    </div>
  );
}
