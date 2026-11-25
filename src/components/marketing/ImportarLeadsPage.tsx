"use client";

import { useState } from "react";
import { Upload, History, FileUp, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CONTACT_FIELDS = [
  { value: "", label: "Ignorar" },
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "company", label: "Empresa" },
];

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const headers = rows[0] ?? [];
  const data = rows.slice(1);
  return { headers, data };
}

function guessField(header: string): string {
  const h = header.toLowerCase();
  if (h.includes("nome") || h.includes("name")) return "name";
  if (h.includes("mail")) return "email";
  if (h.includes("tel") || h.includes("phone") || h.includes("whats")) return "phone";
  if (h.includes("empresa") || h.includes("company")) return "company";
  return "";
}

export default function ImportarLeadsPage() {
  const [tab, setTab] = useState<"nova" | "historico">("nova");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(null);
    const reader = new FileReader();
    reader.onload = () => {
      const { headers: h, data } = parseCsv(String(reader.result));
      setHeaders(h);
      setRows(data);
      setMapping(h.map(guessField));
    };
    reader.readAsText(file);
  }

  async function importar() {
    setImporting(true);
    const nameIdx = mapping.indexOf("name");
    const contacts = rows
      .map((row) => {
        const contact: Record<string, string> = {};
        mapping.forEach((field, i) => {
          if (field) contact[field] = row[i] ?? "";
        });
        return contact;
      })
      .filter((c) => (nameIdx >= 0 ? c.name?.trim() : Object.values(c).some(Boolean)));

    if (contacts.length > 0) {
      await supabase.from("contacts").insert(contacts);
    }
    setImporting(false);
    setDone(contacts.length);
    setHeaders([]);
    setRows([]);
    setFileName(null);
  }

  return (
    <div className="mx-8 pt-8 pb-8">
      <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
        <Upload size={20} className="text-accent" /> Importar Leads
      </h1>
      <p className="text-muted text-sm mb-6">Importe leads de arquivos CSV ou Excel</p>

      <div className="flex gap-1.5 mb-6">
        <button
          onClick={() => setTab("nova")}
          className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${tab === "nova" ? "bg-accent text-bg font-medium" : "text-muted border border-border"}`}
        >
          <Upload size={13} /> Nova Importação
        </button>
        <button
          onClick={() => setTab("historico")}
          className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${tab === "historico" ? "bg-accent text-bg font-medium" : "text-muted border border-border"}`}
        >
          <History size={13} /> Histórico
        </button>
      </div>

      {tab === "historico" ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <History size={26} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">Nenhuma importação registrada ainda</p>
        </div>
      ) : done !== null ? (
        <div className="bg-panel border border-border rounded-lg py-16 text-center">
          <CheckCircle2 size={28} className="text-accent mx-auto mb-3" />
          <p className="text-white font-medium">{done} leads importados com sucesso</p>
          <button onClick={() => setDone(null)} className="text-accent text-sm mt-3">
            Importar outro arquivo
          </button>
        </div>
      ) : headers.length === 0 ? (
        <label className="bg-panel border border-dashed border-border rounded-lg py-16 flex flex-col items-center cursor-pointer hover:border-accent">
          <FileUp size={28} className="text-muted mb-3" />
          <span className="text-white font-medium">Importar leads via CSV</span>
          <span className="text-muted text-sm mt-1">Clique para escolher um arquivo .csv (primeira linha = cabeçalhos)</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-sm font-medium">{fileName}</h3>
              <p className="text-muted text-xs">{rows.length} linhas encontradas — mapeie as colunas abaixo</p>
            </div>
            <button
              onClick={importar}
              disabled={importing}
              className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Importar {rows.length} leads
            </button>
          </div>

          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
            {headers.map((h, i) => (
              <div key={i}>
                <div className="text-[11px] text-muted mb-1 truncate">{h}</div>
                <select
                  value={mapping[i] ?? ""}
                  onChange={(e) => setMapping((m) => m.map((v, idx) => (idx === i ? e.target.value : v)))}
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-white"
                >
                  {CONTACT_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <div className="grid gap-2 px-3 py-2 bg-panelmuted text-[10px] text-muted uppercase" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
              {headers.map((h, i) => (
                <span key={i} className="truncate">
                  {h}
                </span>
              ))}
            </div>
            {rows.slice(0, 5).map((row, ri) => (
              <div key={ri} className="grid gap-2 px-3 py-2 text-xs text-white border-t border-border" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
                {row.map((cell, ci) => (
                  <span key={ci} className="truncate">
                    {cell}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {rows.length > 5 && <p className="text-muted text-xs mt-2">+ {rows.length - 5} linhas...</p>}
        </div>
      )}
    </div>
  );
}
