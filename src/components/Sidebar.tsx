"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav, navAvancado } from "@/lib/nav";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const [modulosDesativados, setModulosDesativados] = useState<string[]>([]);
  const [perfil, setPerfil] = useState({ nome: "", cargo: "" });
  const [avancado, setAvancado] = useState(false);

  useEffect(() => {
    supabase
      .from("sistema_config")
      .select("modulos_desativados, perfil_nome, perfil_cargo")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setModulosDesativados(data.modulos_desativados ?? []);
          setPerfil({ nome: data.perfil_nome ?? "", cargo: data.perfil_cargo ?? "" });
        }
      });
  }, [pathname]);

  const visibleNav = nav.filter((section) => section.title === "Sistema" || !modulosDesativados.includes(section.title));

  return (
    <aside className="prontto-menu w-60 shrink-0 h-screen sticky top-0 overflow-y-auto text-sm bg-[linear-gradient(180deg,rgba(15,122,90,.22)_0%,rgba(8,58,46,.55)_45%,rgba(6,42,33,.75)_100%)] backdrop-blur-xl border-r border-accent/10 shadow-[inset_-1px_0_0_rgba(201,169,110,.08)]">
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-accent/10">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg font-serif text-lg font-bold shadow-[0_0_18px_rgba(201,169,110,.45)]">P</div>
        <div>
          <div className="font-semibold text-white leading-none">Prontto AI</div>
          <div className="text-[10px] text-muted tracking-wide">SISTEMA OPERACIONAL</div>
        </div>
      </div>

      <nav className="py-4">
        {visibleNav.map((section, i) => (
          <div
            key={section.title}
            className={`pb-5 mb-5 ${
              i < visibleNav.length - 1 ? "border-b border-border/60" : ""
            }`}
          >
            <div className="px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/90 mb-2">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`prontto-item block mx-2 px-3 py-2.5 rounded-lg text-[13.5px] font-medium border transition-all duration-300 ${
                      active
                        ? "border-accent/40 bg-accent/10 text-white shadow-[0_0_18px_rgba(201,169,110,.18)]"
                        : "border-transparent text-muted hover:text-white hover:border-accent/30 hover:bg-[rgba(201,169,110,.07)] hover:shadow-[0_0_16px_rgba(201,169,110,.16)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="px-4">
          <button
            onClick={() => setAvancado((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/70 hover:text-white py-1"
            aria-expanded={avancado}
          >
            Avançado <span>{avancado ? "−" : "+"}</span>
          </button>
        </div>
        {avancado && (
          <div className="flex flex-col gap-0.5 mt-1">
            {navAvancado.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-[12.5px] border-l-2 ${
                  pathname === item.href ? "border-accent bg-panelmuted text-white" : "border-transparent text-muted hover:text-white hover:bg-panelmuted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-border text-muted">
        {perfil.nome || "Sua conta"}
        <div className="text-[10px] uppercase">{perfil.cargo}</div>
      </div>
    </aside>
  );
}
