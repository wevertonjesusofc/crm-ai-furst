"use client";

import { useEffect, useState, useCallback } from "react";
import { Video, Sparkles, CheckCircle2, Clock, Plus, X, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Reuniao = { id: string; titulo: string; data: string; hora: string | null; duracao_min: number; link: string | null; notas: string | null; status: string };

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReunioesPage() {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titulo: "", data: fmt(new Date()), hora: "19:00", duracao: "60", link: "", notas: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("reunioes").select("*").order("data", { ascending: false });
    setReunioes((data as Reuniao[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function criar() {
    if (!form.titulo.trim()) return;
    await supabase.from("reunioes").insert({
      titulo: form.titulo.trim(),
      data: form.data,
      hora: form.hora,
      duracao_min: Number(form.duracao) || 60,
      link: form.link.trim() || null,
      notas: form.notas.trim() || null,
    });
    setShowNew(false);
    setForm({ titulo: "", data: fmt(new Date()), hora: "19:00", duracao: "60", link: "", notas: "" });
    load();
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reuniões do Time</h1>
          <p className="text-muted text-sm mt-0.5">Grave, transcreva e extraia tarefas das reuniões</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={14} /> Nova Reunião
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-blue-950/40 text-blue-400 flex items-center justify-center">
            <Video size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">{reunioes.length}</div>
            <div className="text-xs text-muted">Total de reuniões</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-purple-950/40 text-purple-400 flex items-center justify-center">
            <Sparkles size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">0</div>
            <div className="text-xs text-muted">Processadas com IA</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">0</div>
            <div className="text-xs text-muted">Com tarefas extraídas</div>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-orange-950/40 text-orange-400 flex items-center justify-center">
            <Clock size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-white leading-none">0</div>
            <div className="text-xs text-muted">Aguardando processamento</div>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Reuniões Recentes</h3>
        {reunioes.length === 0 ? (
          <div className="py-10 text-center">
            <Video size={26} className="text-muted mx-auto mb-2" />
            <p className="text-muted text-sm mb-3">Nenhuma reunião ainda</p>
            <button onClick={() => setShowNew(true)} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
              + Criar primeira reunião
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reunioes.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-white text-sm font-medium">{r.titulo}</div>
                  <div className="text-muted text-xs">
                    {r.data} {r.hora && `· ${r.hora}`} · {r.duracao_min}min
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer" className="text-accent text-xs flex items-center gap-1">
                      Link <ExternalLink size={11} />
                    </a>
                  )}
                  <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[440px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Video size={16} className="text-accent" /> Nova Reunião do Time
              </h3>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="text-[11px] text-muted">Título *</label>
            <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Daily, Planning Sprint..." autoFocus className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3" />

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-muted">Hora</label>
                <input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-muted">Duração (min)</label>
                <input type="number" value={form.duracao} onChange={(e) => setForm((f) => ({ ...f, duracao: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
              </div>
            </div>

            <label className="text-[11px] text-muted">Link da reunião</label>
            <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://meet.google.com/..." className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3" />

            <label className="text-[11px] text-muted">Notas / Pauta</label>
            <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Tópicos da reunião, pauta..." rows={3} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none" />

            <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs rounded-md px-3 py-2.5 flex items-start gap-2 mb-4">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>Gravação, transcrição e extração de tarefas por IA ainda não conectadas — ver checklist de integrações pendentes.</span>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button onClick={criar} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                Criar Reunião
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
