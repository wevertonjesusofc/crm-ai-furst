"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  LayoutGrid,
  User,
  Palette,
  Calendar,
  Radio,
  KeyRound,
  MessageSquare,
  Phone,
  Mail,
  Send,
  GitBranch,
  Sparkles,
  Package,
  FileText,
  BookOpen,
  Percent,
  Instagram,
  Bot,
  GraduationCap,
  Users,
  Bell,
  ClipboardCheck,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { nav } from "@/lib/nav";
import AparenciaPanel from "./panels/AparenciaPanel";
import PipelinePanel from "./panels/PipelinePanel";
import TemplatesIAPanel from "./panels/TemplatesIAPanel";
import ProdutosPanel from "./panels/ProdutosPanel";
import MateriaisVendaPanel from "./panels/MateriaisVendaPanel";
import PlaybooksPanel from "./panels/PlaybooksPanel";
import ComissoesPanel from "./panels/ComissoesPanel";
import MembrosTimePanel from "./panels/MembrosTimePanel";
import RegrasAlertaPanel from "./panels/RegrasAlertaPanel";
import AutomacoesLinkPanel from "./panels/AutomacoesLinkPanel";
import TreinamentoEquipePanel from "./panels/TreinamentoEquipePanel";

const CUSTOM_PANELS: Record<string, React.ComponentType> = {
  aparencia: AparenciaPanel,
  "pipeline-config": PipelinePanel,
  "templates-ia": TemplatesIAPanel,
  produtos: ProdutosPanel,
  "materiais-venda": MateriaisVendaPanel,
  playbooks: PlaybooksPanel,
  comissoes: ComissoesPanel,
  membros: MembrosTimePanel,
  "regras-alerta": RegrasAlertaPanel,
  "automacoes-config": AutomacoesLinkPanel,
  "treinamento-config": TreinamentoEquipePanel,
};

type Config = {
  modulos_desativados: string[];
  perfil_nome: string;
  perfil_cargo: string;
  perfil_email: string | null;
  perfil_time: string;
};

const MODULO_DESC: Record<string, string> = {
  Comercial: "Pipeline de vendas, leads, deals, propostas e todo o funil comercial. Inclui Cockpit, Inbox, agenda e treinamento.",
  Prospecção: "Descoberta de leads com IA (busca + diagnóstico).",
  "Agentes IA": "Cadastro e organograma dos seus agentes de IA.",
  Marketing: "Canais de entrada, páginas, formulários, campanhas e automações de marketing.",
  Gestão: "Tarefas da equipe e reuniões do time.",
  "Meu Espaço": "Conexão do seu WhatsApp pessoal.",
};

const CATEGORIES: { title: string; items: { key: string; label: string; Icon: typeof Settings }[] }[] = [
  {
    title: "Geral",
    items: [
      { key: "modulos", label: "Módulos", Icon: LayoutGrid },
      { key: "perfil", label: "Meu Perfil", Icon: User },
      { key: "aparencia", label: "Aparência", Icon: Palette },
      { key: "google-calendar", label: "Google Calendar", Icon: Calendar },
    ],
  },
  {
    title: "Integrações",
    items: [
      { key: "redes-sociais", label: "Redes sociais", Icon: Radio },
      { key: "chaves-api", label: "Chaves de API", Icon: KeyRound },
      { key: "whatsapp-uazapi", label: "WhatsApp (UAZAPI)", Icon: MessageSquare },
      { key: "whatsapp-oficial", label: "WhatsApp Oficial (Cloud)", Icon: MessageSquare },
      { key: "telefonia", label: "Telefonia (VoIP)", Icon: Phone },
      { key: "email-marketing", label: "Email Marketing", Icon: Mail },
      { key: "meta-ads", label: "Meta Ads / Lead Ads", Icon: Send },
    ],
  },
  {
    title: "Comercial",
    items: [
      { key: "pipeline-config", label: "Pipeline", Icon: GitBranch },
      { key: "templates-ia", label: "Templates de IA", Icon: Sparkles },
      { key: "produtos", label: "Produtos", Icon: Package },
      { key: "materiais-venda", label: "Materiais de Venda", Icon: FileText },
      { key: "playbooks", label: "Playbooks", Icon: BookOpen },
      { key: "comissoes", label: "Comissões", Icon: Percent },
      { key: "automacoes-config", label: "Automações", Icon: GitBranch },
      { key: "social-selling", label: "Social Selling", Icon: Instagram },
    ],
  },
  {
    title: "IA & Bots",
    items: [
      { key: "agente-vendas", label: "Agente de Vendas", Icon: Bot },
      { key: "coach-vendas", label: "Coach de Vendas", Icon: GraduationCap },
    ],
  },
  {
    title: "Equipe",
    items: [
      { key: "membros", label: "Membros do Time", Icon: Users },
      { key: "treinamento-config", label: "Treinamento", Icon: GraduationCap },
    ],
  },
  {
    title: "Notificações",
    items: [
      { key: "regras-alerta", label: "Regras de Alerta", Icon: Bell },
      { key: "bot-tarefas", label: "Bot de Tarefas", Icon: ClipboardCheck },
    ],
  },
];

const TOGGLEABLE_SECTIONS = nav.filter((s) => s.title !== "Sistema").map((s) => s.title);

export default function ConfiguracoesPage() {
  const [selected, setSelected] = useState("modulos");
  const [config, setConfig] = useState<Config | null>(null);
  const [perfilForm, setPerfilForm] = useState({ nome: "", cargo: "", email: "", time: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("sistema_config").select("*").eq("id", "default").maybeSingle();
    if (data) {
      setConfig(data as Config);
      setPerfilForm({
        nome: data.perfil_nome ?? "",
        cargo: data.perfil_cargo ?? "",
        email: data.perfil_email ?? "",
        time: data.perfil_time ?? "",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleModulo(title: string) {
    if (!config) return;
    const desativados = config.modulos_desativados.includes(title)
      ? config.modulos_desativados.filter((m) => m !== title)
      : [...config.modulos_desativados, title];
    setConfig({ ...config, modulos_desativados: desativados });
    await supabase.from("sistema_config").update({ modulos_desativados: desativados }).eq("id", "default");
  }

  async function salvarPerfil() {
    await supabase
      .from("sistema_config")
      .update({
        perfil_nome: perfilForm.nome,
        perfil_cargo: perfilForm.cargo,
        perfil_email: perfilForm.email,
        perfil_time: perfilForm.time,
      })
      .eq("id", "default");
    load();
  }

  const activeLabel = CATEGORIES.flatMap((c) => c.items).find((i) => i.key === selected)?.label ?? "";

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={20} className="text-accent" />
        <h1 className="text-xl font-semibold text-white">Configurações</h1>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-6">
        <div>
          {CATEGORIES.map((cat) => (
            <div key={cat.title} className="mb-5">
              <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5">{cat.title}</div>
              <div className="space-y-0.5">
                {cat.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelected(item.key)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm flex items-center gap-2 ${
                      selected === item.key ? "bg-panelmuted text-white" : "text-muted hover:text-white"
                    }`}
                  >
                    <item.Icon size={13} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          {selected === "modulos" && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">Módulos</h2>
              <p className="text-muted text-sm mb-4">Escolha quais módulos do CRM ficam ativos. Desative o que não usa para simplificar o menu.</p>

              <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2 mb-5">
                <Lightbulb size={16} className="shrink-0 mt-0.5" />
                <span>Módulos desativados ficam ocultos no menu lateral. Você pode reativar a qualquer momento sem perder dados.</span>
              </div>

              <div className="space-y-3">
                {TOGGLEABLE_SECTIONS.map((title) => {
                  const ativo = !config?.modulos_desativados.includes(title);
                  return (
                    <div key={title} className="bg-panel border border-border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{title}</div>
                        <p className="text-muted text-xs mt-0.5">{MODULO_DESC[title]}</p>
                      </div>
                      <button
                        onClick={() => toggleModulo(title)}
                        className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${ativo ? "bg-accent" : "bg-panelmuted border border-border"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${ativo ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selected === "perfil" && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">Meu Perfil</h2>
              <p className="text-muted text-sm mb-4">Seu nome, email e time. Essas informações aparecem nos relatórios e atividades do CRM.</p>

              <div className="bg-panel border border-border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-lg">
                    {perfilForm.nome.charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <div className="text-white font-medium">{perfilForm.nome}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      <span className="text-[10px] bg-panelmuted text-muted rounded px-1.5 py-0.5">{perfilForm.cargo}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[11px] text-muted">Nome</label>
                    <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Cargo/Função</label>
                    <input value={perfilForm.cargo} onChange={(e) => setPerfilForm((f) => ({ ...f, cargo: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Email</label>
                    <input value={perfilForm.email} onChange={(e) => setPerfilForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted">Time</label>
                    <input value={perfilForm.time} onChange={(e) => setPerfilForm((f) => ({ ...f, time: e.target.value }))} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-white mt-1" />
                  </div>
                </div>
                <button onClick={salvarPerfil} className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
                  Salvar
                </button>
              </div>
            </div>
          )}

          {selected !== "modulos" && selected !== "perfil" && CUSTOM_PANELS[selected] && (() => {
            const Panel = CUSTOM_PANELS[selected];
            return <Panel />;
          })()}

          {selected !== "modulos" && selected !== "perfil" && !CUSTOM_PANELS[selected] && (
            <div>
              <h2 className="text-white text-lg font-medium mb-4">{activeLabel}</h2>
              <div className="bg-panel border border-border rounded-lg py-14 text-center">
                <Settings size={26} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">Ainda não configurado nesta versão do CRM AURA.</p>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm rounded-md px-4 py-3 flex items-start gap-2 mt-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Fica registrado no checklist de integrações pendentes — essa tela existe pra não esquecer que ela precisa ser configurada quando chegar a hora.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
