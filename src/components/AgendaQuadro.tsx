"use client";

// Agenda em quadro: cada coluna é uma situação da consulta. Arraste o card para mudar.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "agendada" | "confirmada" | "realizada" | "faltou" | "cancelada";
type Consulta = { id: string; contact_id: string | null; paciente_nome: string; procedimento: string | null; data: string; hora: string | null; status: Status };

const COLUNAS: { status: Status; titulo: string; cor: string }[] = [
  { status: "agendada", titulo: "Agendado", cor: "bg-sky-400" },
  { status: "confirmada", titulo: "Confirmado", cor: "bg-accent" },
  { status: "realizada", titulo: "Realizado", cor: "bg-violet-400" },
  { status: "faltou", titulo: "Faltou", cor: "bg-amber-400" },
  { status: "cancelada", titulo: "Cancelado", cor: "bg-red-400" },
];

const dataBR = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

export default function AgendaQuadro() {
  const [itens, setItens] = useState<Consulta[] | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);

  useEffect(() => {
    supabase
      .from("consultas")
      .select("id, contact_id, paciente_nome, procedimento, data, hora, status")
      .order("data")
      .order("hora")
      .then(({ data }) => setItens((data as Consulta[]) ?? []));
  }, []);

  async function mover(id: string, status: Status) {
    setItens((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, status } : c)));
    await supabase.from("consultas").update({ status }).eq("id", id);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-5 gap-3">
      {COLUNAS.map((col) => {
        const lista = (itens ?? []).filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              if (sobre !== col.status) setSobre(col.status);
            }}
            onDragLeave={() => setSobre((v) => (v === col.status ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || arrastando;
              setSobre(null);
              setArrastando(null);
              if (id) mover(id, col.status);
            }}
            className={`rounded-xl border p-2 min-h-[320px] transition-colors ${sobre === col.status ? "border-accent bg-accent/5" : "border-border bg-panel"}`}
          >
            <div className="flex items-center justify-between px-1.5 py-1 mb-1">
              <span className="flex items-center gap-2 text-sm text-white font-medium">
                <span className={`w-2 h-2 rounded-full ${col.cor}`} /> {col.titulo}
              </span>
              <span className="text-xs text-muted tabular-nums">{lista.length}</span>
            </div>
            <div className="space-y-2">
              {itens === null && <p className="text-xs text-muted px-1.5">Carregando…</p>}
              {lista.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", c.id);
                    setArrastando(c.id);
                  }}
                  onDragEnd={() => setArrastando(null)}
                  className={`bg-panelmuted border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-accent/50 ${arrastando === c.id ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.paciente_nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      {c.contact_id ? (
                        <Link href={`/comercial/leads/${c.contact_id}`} className="text-sm text-white font-medium truncate block hover:text-accent">
                          {c.paciente_nome}
                        </Link>
                      ) : (
                        <span className="text-sm text-white font-medium truncate block">{c.paciente_nome}</span>
                      )}
                      <span className="text-[11px] text-muted truncate block">{c.procedimento || "Consulta"}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 mt-2 text-[11px] ${c.data === hoje ? "text-accent" : "text-muted"}`}>
                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {c.data === hoje ? "Hoje" : dataBR(c.data)}</span>
                    {c.hora && <span className="flex items-center gap-1"><Clock size={11} /> {c.hora}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
