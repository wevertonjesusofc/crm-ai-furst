"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Mic,
  Plus,
  X,
  Search,
  User,
  Pencil,
  DollarSign,
  Wrench,
  Meh,
  Zap,
  Info,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Categoria = "call_sdr" | "call_closer" | "reuniao" | "objecoes" | "fechamento" | "discovery" | "outro";
type Dificuldade = "iniciante" | "intermediario" | "avancado" | null;
type Resultado = "positivo" | "negativo" | "neutro" | null;

type Caso = {
  id: string;
  titulo: string;
  categoria: Categoria;
  dificuldade: Dificuldade;
  resultado: Resultado;
  tags: string[];
  observacoes: string | null;
  created_at: string;
};

const CATEGORIA_LABEL: Record<Categoria, string> = {
  call_sdr: "Call SDR",
  call_closer: "Call Closer",
  reuniao: "Reunião",
  objecoes: "Objeções",
  fechamento: "Fechamento",
  discovery: "Discovery",
  outro: "Outro",
};

const CHIP_FILTERS: { label: string; value: "todos" | Categoria }[] = [
  { label: "Todos", value: "todos" },
  { label: "SDR", value: "call_sdr" },
  { label: "Closer", value: "call_closer" },
  { label: "Reunião", value: "reuniao" },
  { label: "Objeções", value: "objecoes" },
  { label: "Fechamento", value: "fechamento" },
  { label: "Discovery", value: "discovery" },
];

const PERSONAS = [
  {
    nome: "Roberto Mendes",
    cargo: "CEO",
    empresa: "TechNova",
    desc: "Pragmático, cético, quer dados e cases concretos. Já foi enganado por fornecedores antes.",
    Icon: Meh,
    color: "text-amber-400 bg-amber-950/40",
  },
  {
    nome: "Ana Oliveira",
    cargo: "CFO",
    empresa: "Grupo Fênix",
    desc: "Focada em ROI e números. Compara preços, pede planilha, quer projeção de retorno.",
    Icon: DollarSign,
    color: "text-emerald-400 bg-emerald-950/40",
  },
  {
    nome: "Carlos Lima",
    cargo: "CTO",
    empresa: "DataFlow Systems",
    desc: "Técnico, conhece concorrentes. Faz perguntas profundas sobre integração e segurança.",
    Icon: Wrench,
    color: "text-slate-300 bg-slate-800/60",
  },
  {
    nome: "Mariana Santos",
    cargo: "Head de RH",
    empresa: "Wellness Corp",
    desc: "Simpática mas indecisa. Sempre precisa 'falar com alguém' antes de decidir.",
    Icon: User,
    color: "text-pink-400 bg-pink-950/40",
  },
  {
    nome: "Pedro Almeida",
    cargo: "Fundador",
    empresa: "RápidoTech",
    desc: "Impaciente, tem 10 minutos. Quer saber: o que faz, quanto custa, e se resolve agora.",
    Icon: Zap,
    color: "text-orange-400 bg-orange-950/40",
  },
];

const CENARIOS = [
  { id: "discovery", label: "Discovery", Icon: Info },
  { id: "proposta", label: "Proposta", Icon: DollarSign },
  { id: "fechamento", label: "Fechamento", Icon: Zap },
  { id: "objecoes", label: "Objeções", Icon: ShieldAlert },
];

const VOZES = [
  { id: "ash", nome: "Ash", desc: "Masculina · Grave, confiante" },
  { id: "ballad", nome: "Ballad", desc: "Masculina · Calma, suave" },
  { id: "coral", nome: "Coral", desc: "Feminina · Clara, profissional" },
  { id: "sage", nome: "Sage", desc: "Feminina · Madura, assertiva" },
  { id: "verse", nome: "Verse", desc: "Masculina · Jovem, dinâmica" },
];

function BibliotecaTab() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [chipFilter, setChipFilter] = useState<"todos" | Categoria>("todos");
  const [resultadoFilter, setResultadoFilter] = useState<"todos" | Resultado>("todos");
  const [dificuldadeFilter, setDificuldadeFilter] = useState<"todas" | Dificuldade>("todas");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "call_sdr" as Categoria,
    dificuldade: "" as string,
    resultado: "" as string,
    tag: "",
    tags: [] as string[],
    observacoes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("treinamento_casos").select("*").order("created_at", { ascending: false });
    setCasos((data as Caso[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCaso() {
    if (!form.titulo.trim()) return;
    await supabase.from("treinamento_casos").insert({
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      dificuldade: form.dificuldade || null,
      resultado: form.resultado || null,
      tags: form.tags,
      observacoes: form.observacoes.trim() || null,
    });
    setForm({ titulo: "", categoria: "call_sdr", dificuldade: "", resultado: "", tag: "", tags: [], observacoes: "" });
    setShowModal(false);
    load();
  }

  const filtered = casos.filter((c) => {
    if (chipFilter !== "todos" && c.categoria !== chipFilter) return false;
    if (resultadoFilter !== "todos" && c.resultado !== resultadoFilter) return false;
    if (dificuldadeFilter !== "todas" && c.dificuldade !== dificuldadeFilter) return false;
    if (search.trim() && !c.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {CHIP_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setChipFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-md border ${
                chipFilter === f.value ? "bg-accent text-bg border-accent font-medium" : "text-muted border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-panel border border-border rounded-md pl-7 pr-2 py-1.5 text-xs text-white w-40"
            />
          </div>
          <select
            value={resultadoFilter ?? "todos"}
            onChange={(e) => setResultadoFilter(e.target.value as "todos" | Resultado)}
            className="bg-panel border border-border rounded-md px-2 py-1.5 text-xs text-white"
          >
            <option value="todos">Todos</option>
            <option value="positivo">Positivo</option>
            <option value="negativo">Negativo</option>
            <option value="neutro">Neutro</option>
          </select>
          <select
            value={dificuldadeFilter ?? "todas"}
            onChange={(e) => setDificuldadeFilter(e.target.value as "todas" | Dificuldade)}
            className="bg-panel border border-border rounded-md px-2 py-1.5 text-xs text-white"
          >
            <option value="todas">Todas</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-3" />
          <p className="text-white font-medium">Nenhum caso de treinamento</p>
          <p className="text-muted text-sm mt-1">Salve chamadas e reuniões como material de treinamento para o time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] bg-panelmuted text-muted rounded-full px-2 py-0.5">
                  {CATEGORIA_LABEL[c.categoria]}
                </span>
                {c.resultado && (
                  <span
                    className={`text-[11px] rounded-full px-2 py-0.5 ${
                      c.resultado === "positivo"
                        ? "bg-emerald-950/40 text-emerald-400"
                        : c.resultado === "negativo"
                        ? "bg-red-950/40 text-red-400"
                        : "bg-amber-950/40 text-amber-400"
                    }`}
                  >
                    {c.resultado}
                  </span>
                )}
              </div>
              <h4 className="text-white text-sm font-medium mb-1">{c.titulo}</h4>
              {c.observacoes && <p className="text-muted text-xs mb-2">{c.observacoes}</p>}
              <div className="flex gap-1 flex-wrap">
                {c.dificuldade && (
                  <span className="text-[10px] text-muted border border-border rounded-full px-2 py-0.5">
                    {c.dificuldade}
                  </span>
                )}
                {c.tags.map((t) => (
                  <span key={t} className="text-[10px] text-accent border border-accent/30 rounded-full px-2 py-0.5">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 bg-accent text-bg text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5"
      >
        <Plus size={14} /> Novo Caso
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg p-5 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <BookOpen size={16} className="text-accent" /> Salvar para Treinamento
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="text-[11px] text-muted">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              autoFocus
              className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-white mt-1 mb-3"
            />

            <label className="text-[11px] text-muted">Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as Categoria }))}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-3"
            >
              {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-muted">Dificuldade</label>
                <select
                  value={form.dificuldade}
                  onChange={(e) => setForm((f) => ({ ...f, dificuldade: e.target.value }))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                >
                  <option value="">Selecionar</option>
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted">Resultado</label>
                <select
                  value={form.resultado}
                  onChange={(e) => setForm((f) => ({ ...f, resultado: e.target.value }))}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
                >
                  <option value="">Selecionar</option>
                  <option value="positivo">Positivo</option>
                  <option value="negativo">Negativo</option>
                  <option value="neutro">Neutro</option>
                </select>
              </div>
            </div>

            <label className="text-[11px] text-muted">Tags</label>
            <div className="flex gap-2 mt-1 mb-3">
              <input
                value={form.tag}
                onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                placeholder="Adicionar tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.tag.trim()) {
                    setForm((f) => ({ ...f, tags: [...f.tags, f.tag.trim()], tag: "" }));
                  }
                }}
                className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => form.tag.trim() && setForm((f) => ({ ...f, tags: [...f.tags, f.tag.trim()], tag: "" }))}
                className="bg-panelmuted border border-border rounded px-3 text-white"
              >
                <Plus size={14} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-3">
                {form.tags.map((t, i) => (
                  <span key={i} className="text-[11px] text-accent border border-accent/30 rounded-full px-2 py-0.5">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <label className="text-[11px] text-muted">Observações do Gestor</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="O que há de relevante neste caso para treinamento?"
              rows={3}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 mb-4 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="text-muted text-sm px-3 py-1.5">
                Cancelar
              </button>
              <button onClick={createCaso} className="bg-accent text-bg text-sm font-medium px-4 py-1.5 rounded-md">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleplayTab() {
  const [mode, setMode] = useState<"pronta" | "criar">("pronta");
  const [selectedPersona, setSelectedPersona] = useState(0);
  const [cenario, setCenario] = useState("discovery");
  const [voz, setVoz] = useState("ash");
  const [customNome, setCustomNome] = useState("");
  const [customCargo, setCustomCargo] = useState("");
  const [customEmpresa, setCustomEmpresa] = useState("");
  const [customBriefing, setCustomBriefing] = useState("");

  async function iniciarRoleplay() {
    if (mode === "criar") {
      if (!customNome.trim() || !customBriefing.trim()) return;
      await supabase.from("treinamento_personas").insert({
        nome: customNome.trim(),
        cargo: customCargo.trim() || null,
        empresa: customEmpresa.trim() || null,
        briefing: customBriefing.trim(),
      });
    }
    alert(
      "O Simulador de Call por voz ainda não está conectado nesta versão do CRM AURA — ele depende de uma integração de IA de voz em tempo real (a referência usa a Realtime API da OpenAI com essas mesmas vozes). A configuração de persona/cenário/voz já fica salva; a chamada de voz em si é o próximo passo quando conectarmos essa API."
    );
  }

  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center gap-1.5 text-xs bg-panelmuted text-accent rounded-full px-3 py-1 mb-3">
        <Mic size={12} /> Roleplay por Voz
      </span>
      <h2 className="text-white text-2xl font-semibold mb-1">Simulador de Call</h2>
      <p className="text-muted text-sm mb-5">Treine suas vendas com IA. Escolha um perfil de cliente ou crie o seu.</p>

      <div className="flex justify-center gap-2 mb-5">
        <button
          onClick={() => setMode("pronta")}
          className={`text-sm px-3 py-2 rounded-md flex items-center gap-1.5 border ${
            mode === "pronta" ? "bg-accent text-bg border-accent font-medium" : "text-muted border-border"
          }`}
        >
          <User size={14} /> Persona pronta
        </button>
        <button
          onClick={() => setMode("criar")}
          className={`text-sm px-3 py-2 rounded-md flex items-center gap-1.5 border ${
            mode === "criar" ? "bg-accent text-bg border-accent font-medium" : "text-muted border-border"
          }`}
        >
          <Pencil size={14} /> Criar persona
        </button>
      </div>

      {mode === "pronta" ? (
        <div className="grid grid-cols-3 gap-3 mb-6 text-left">
          {PERSONAS.map((p, i) => (
            <button
              key={p.nome}
              onClick={() => setSelectedPersona(i)}
              className={`bg-panel border rounded-lg p-4 ${
                selectedPersona === i ? "border-accent" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${p.color}`}>
                  <p.Icon size={15} />
                </span>
                <div>
                  <div className="text-white text-sm font-medium">{p.nome}</div>
                  <div className="text-muted text-[11px]">
                    {p.cargo} — {p.empresa}
                  </div>
                </div>
              </div>
              <p className="text-muted text-xs">{p.desc}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-left mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted">Nome do cliente *</label>
              <input
                value={customNome}
                onChange={(e) => setCustomNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Cargo</label>
              <input
                value={customCargo}
                onChange={(e) => setCustomCargo(e.target.value)}
                placeholder="Ex: CEO"
                className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted">Empresa</label>
            <input
              value={customEmpresa}
              onChange={(e) => setCustomEmpresa(e.target.value)}
              placeholder="Ex: TechCorp"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted">Briefing do cliente * (personalidade, objeções, situação)</label>
            <textarea
              value={customBriefing}
              onChange={(e) => setCustomBriefing(e.target.value)}
              placeholder="Descreva o perfil: como ele se comporta, quais objeções traz, o que já sabe sobre o produto, qual a situação da empresa dele..."
              rows={3}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1 resize-none"
            />
          </div>
        </div>
      )}

      <p className="text-white text-sm font-medium mb-2">Cenário da call</p>
      <div className="flex justify-center gap-2 mb-5">
        {CENARIOS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCenario(c.id)}
            className={`text-sm px-3 py-2 rounded-md flex items-center gap-1.5 border ${
              cenario === c.id ? "text-accent border-accent" : "text-muted border-border"
            }`}
          >
            <c.Icon size={14} /> {c.label}
          </button>
        ))}
      </div>

      <p className="text-white text-sm font-medium mb-2">Voz do cliente</p>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {VOZES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVoz(v.id)}
            className={`rounded-md py-3 border text-center ${
              voz === v.id ? "border-accent" : "border-border"
            }`}
          >
            <div className="text-white text-sm font-medium">{v.nome}</div>
            <div className="text-muted text-[10px] mt-0.5">{v.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={iniciarRoleplay}
        className="bg-accent text-bg font-medium px-5 py-3 rounded-md flex items-center gap-2 mx-auto"
      >
        <Mic size={16} /> Iniciar Roleplay
      </button>
      <p className="text-muted text-xs mt-4">Permita acesso ao microfone quando solicitado</p>
      <p className="text-muted text-xs">Use fones de ouvido para melhor experiência</p>
    </div>
  );
}

export default function TreinamentoPage() {
  const [tab, setTab] = useState<"biblioteca" | "roleplay">("biblioteca");

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen size={22} className="text-accent" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Treinamento Comercial</h1>
          <p className="text-muted text-sm">Biblioteca de casos reais e simulador de calls</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-border mb-6">
        <button
          onClick={() => setTab("biblioteca")}
          className={`pb-3 text-sm flex items-center gap-1.5 ${
            tab === "biblioteca" ? "text-accent border-b-2 border-accent font-medium" : "text-muted"
          }`}
        >
          <BookOpen size={14} /> Biblioteca
        </button>
        <button
          onClick={() => setTab("roleplay")}
          className={`pb-3 text-sm flex items-center gap-1.5 ${
            tab === "roleplay" ? "text-accent border-b-2 border-accent font-medium" : "text-muted"
          }`}
        >
          <Mic size={14} /> Roleplay{" "}
          <span className="text-[9px] bg-accent/20 text-accent rounded px-1.5 py-0.5">NOVO</span>
        </button>
      </div>

      {tab === "biblioteca" ? <BibliotecaTab /> : <RoleplayTab />}
    </div>
  );
}
