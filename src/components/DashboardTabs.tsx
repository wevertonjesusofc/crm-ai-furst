"use client";

import { useState } from "react";
import {
  Calendar,
  MessageSquare,
  DollarSign,
  Target,
  Trophy,
  BarChart3,
  Phone,
  UserPlus,
  Radar,
  Bot,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  CircleCheck,
  Clock,
  CreditCard,
  ClipboardList,
  Crown,
  AlertTriangle,
  Users,
} from "lucide-react";

type StageRow = { id: string; name: string; position: number; count: number; value: number };

type Props = {
  contactsCount: number;
  stages: StageRow[];
  openCount: number;
  openValue: number;
  ganhoCount: number;
  ganhoValue: number;
  perdidoCount: number;
  ticketMedio: number;
};

function fmtMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

const RANGE_OPTS = ["Hoje", "Essa semana", "Este mês", "Mês passado"];

function StatCard({
  label,
  value,
  sub,
  icon,
  from,
  to,
  progress,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  from: string;
  to: string;
  progress?: number;
  badge?: string;
}) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${from} ${to} text-white relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm opacity-90">{label}</span>
        <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">{icon}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-80 mt-1">{sub}</div>}
      {progress !== undefined && (
        <div className="h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-white/70 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {badge && (
        <span className="absolute top-3 right-3 text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{badge}</span>
      )}
    </div>
  );
}

function Panel({
  title,
  icon,
  right,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-panel border border-border rounded-lg p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function GeralTab({ contactsCount, stages, openValue, ticketMedio, openCount }: Props) {
  const metaMes = 0;
  const faturado = 0;
  const totalDeals = stages.reduce((s, st) => s + st.count, 0) || 1;

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Faturado"
          value={fmtMoney(faturado)}
          sub="0 vendas"
          icon={<DollarSign size={16} />}
          from="from-emerald-600"
          to="to-emerald-500"
          progress={0}
        />
        <StatCard
          label="Meta do Mês"
          value={fmtMoney(metaMes)}
          sub="Não definida"
          icon={<Target size={16} />}
          from="from-blue-600"
          to="to-blue-500"
          progress={0}
        />
        <StatCard
          label="Falta"
          value={fmtMoney(Math.max(metaMes - faturado, 0))}
          sub="-"
          icon={<Trophy size={16} />}
          from="from-orange-600"
          to="to-orange-500"
        />
        <StatCard
          label="Ticket Médio"
          value={fmtMoney(ticketMedio)}
          sub={`${openCount} vendas no período`}
          icon={<BarChart3 size={16} />}
          from="from-purple-600"
          to="to-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel
          title="Projeção do Mês"
          icon={<Radar size={16} className="text-accent" />}
          right={
            <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
              <CircleCheck size={10} /> On Track
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted flex items-center gap-1 mb-1">
                <TrendingUp size={12} /> Velocidade
              </div>
              <div className="text-white font-medium">
                {fmtMoney(0)}
                <span className="text-muted text-xs font-normal">/dia útil</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted flex items-center gap-1 mb-1">
                <Target size={12} /> Projeção
              </div>
              <div className="text-white font-medium">{fmtMoney(0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted flex items-center gap-1 mb-1">
                <ClipboardList size={12} /> Pipeline Ponderado
              </div>
              <div className="text-white font-medium">{fmtMoney(openValue)}</div>
              <div className="text-[11px] text-muted">{openCount} deals · 0% prob</div>
            </div>
            <div>
              <div className="text-xs text-muted flex items-center gap-1 mb-1">
                <Clock size={12} /> Ciclo Médio
              </div>
              <div className="text-white font-medium">
                0 <span className="text-muted text-xs font-normal">dias</span>
              </div>
              <div className="text-[11px] text-muted">criação → fechamento</div>
            </div>
          </div>
        </Panel>

        <Panel title="Funil Pipeline" icon={<BarChart3 size={16} className="text-accent" />}>
          <div className="space-y-2.5">
            {stages.length === 0 && <p className="text-muted text-sm">Nenhum estágio configurado ainda.</p>}
            {stages.map((s, i) => {
              const pct = totalDeals > 0 ? Math.round((s.count / totalDeals) * 100) : 0;
              const colors = [
                "bg-blue-500",
                "bg-purple-500",
                "bg-teal-500",
                "bg-amber-500",
                "bg-red-500",
                "bg-emerald-500",
                "bg-orange-500",
                "bg-green-500",
                "bg-rose-500",
              ];
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">{s.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-white font-medium">{s.count}</span>
                      <span className="text-muted">{i === 0 ? "" : `${pct}%`}</span>
                      <span className="text-muted">{fmtMoney(s.value)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-panelmuted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[i % colors.length]}`}
                      style={{ width: `${Math.max(pct, s.count > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Semáforo do Time" icon={<Users size={16} className="text-accent" />}>
          <div className="flex items-center gap-3 text-sm py-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-muted text-xs">0v · {fmtMoney(0)} · 0 calls · 0%</span>
          </div>
        </Panel>

        <Panel
          title="Leads sem Ação"
          icon={<AlertTriangle size={16} className="text-accent" />}
          right={<span className="text-white text-sm font-medium">0</span>}
        >
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-red-400">● &gt; 72h (Crítico)</span>
              <span className="text-white">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">● &gt; 48h (Alerta)</span>
              <span className="text-white">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">● &gt; 24h</span>
              <span className="text-white">0</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Ranking de Vendedores" icon={<Crown size={16} className="text-accent" />}>
        <div className="flex items-center justify-between text-sm py-1">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
              1
            </span>
            <span className="w-7 h-7 rounded-full bg-panelmuted text-white text-xs flex items-center justify-center">
              WJ
            </span>
            <div>
              <div className="text-white text-sm">weverton jesus</div>
              <div className="text-muted text-[11px]">0v · 0%</div>
            </div>
          </div>
          <span className="text-white font-medium">{fmtMoney(0)}</span>
        </div>
        <div className="text-muted text-xs mt-2">{contactsCount} pacientes cadastrados no total</div>
      </Panel>
    </div>
  );
}

function VendasTab({ ticketMedio, openCount }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard
          label="Faturado"
          value={fmtMoney(0)}
          sub="0 vendas"
          icon={<DollarSign size={16} />}
          from="from-emerald-600"
          to="to-emerald-500"
        />
        <StatCard
          label="Ticket Médio"
          value={fmtMoney(ticketMedio)}
          sub="0 vendas"
          icon={<CreditCard size={16} />}
          from="from-blue-600"
          to="to-blue-500"
        />
      </div>

      <div className="bg-panel border border-border rounded-lg p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-white flex items-center gap-2">
          <TrendingUp size={14} className="text-accent" /> 0 deals ganhos
        </span>
        <div className="flex-1 mx-4 h-1.5 bg-panelmuted rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: "100%" }} />
        </div>
        <span className="text-white font-medium">{fmtMoney(0)}</span>
      </div>

      <Panel
        title="Raio-X de Reuniões"
        icon={<BarChart3 size={16} className="text-accent" />}
        right={
          <div className="flex items-center gap-2">
            <button className="text-muted hover:text-white">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-muted">14 set — 20 set</span>
            <button className="text-muted hover:text-white">
              <ChevronRight size={14} />
            </button>
            <span className="text-xs bg-panelmuted border border-border rounded px-2 py-1 text-white flex items-center gap-1">
              Eu <ChevronDown size={12} />
            </span>
          </div>
        }
        className="mb-4"
      >
        <div className="text-center py-8 text-muted text-sm">Nenhuma reunião na semana</div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Atividades Hoje" icon={<CircleCheck size={16} className="text-accent" />}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <Phone size={12} /> Ligações
              </span>
              <span className="text-white">0/15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <MessageSquare size={12} /> Follow-ups
              </span>
              <span className="text-white">0/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <Calendar size={12} /> Reuniões
              </span>
              <span className="text-white">0/3</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-xs">
              <span className="text-muted">Leads contatados</span>
              <span className="text-white">NaN</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Mensagens enviadas</span>
              <span className="text-white">23</span>
            </div>
          </div>
        </Panel>

        <Panel
          title="Follow-ups Pendentes"
          icon={<Clock size={16} className="text-accent" />}
          right={<span className="text-white text-sm font-medium">0</span>}
        >
          <div className="text-center py-8 text-muted text-sm">Nenhum pendente</div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Formas de Pagamento" icon={<CreditCard size={16} className="text-accent" />}>
          <div className="text-center py-8 text-muted text-sm">Sem vendas no período</div>
        </Panel>
        <Panel title="Oportunidades em Aberto" icon={<ClipboardList size={16} className="text-accent" />}>
          <div className="text-center py-8 text-muted text-sm">{openCount} deals em aberto</div>
        </Panel>
      </div>

      <Panel title="Ranking de Vendedores" icon={<Crown size={16} className="text-accent" />}>
        <div className="flex items-center justify-between text-sm py-1">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
              1
            </span>
            <span className="w-7 h-7 rounded-full bg-panelmuted text-white text-xs flex items-center justify-center">
              WJ
            </span>
            <span className="text-white text-sm">weverton jesus</span>
          </div>
          <span className="text-white font-medium">{fmtMoney(0)}</span>
        </div>
      </Panel>
    </div>
  );
}

function PreVendasTab({ contactsCount }: Props) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-4 mb-4">
        <StatCard
          label="Reuniões Marcadas"
          value="0"
          sub="meta: 4/dia"
          icon={<Calendar size={16} />}
          from="from-blue-600"
          to="to-blue-500"
          progress={0}
        />
        <StatCard
          label="Ligações"
          value="0"
          sub="0 atendidas"
          icon={<Phone size={16} />}
          from="from-purple-600"
          to="to-purple-500"
        />
        <StatCard
          label="Leads Novos"
          value={String(contactsCount)}
          sub="criados no período"
          icon={<UserPlus size={16} />}
          from="from-teal-600"
          to="to-teal-500"
        />
        <StatCard
          label="Follow-ups"
          value="0"
          sub="meta: 10/dia"
          icon={<Radar size={16} />}
          from="from-orange-600"
          to="to-orange-500"
          badge="Mês"
        />
        <StatCard
          label="Msgs Enviadas"
          value="23"
          sub="meta: 20/dia"
          icon={<MessageSquare size={16} />}
          from="from-emerald-600"
          to="to-emerald-500"
        />
        <StatCard
          label="Agendados IA"
          value="0"
          sub="pela assistente"
          icon={<Bot size={16} />}
          from="from-rose-600"
          to="to-rose-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Atividades Hoje" icon={<Zap size={16} className="text-accent" />}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <Phone size={12} /> Ligações
              </span>
              <span className="text-white">0/30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <Calendar size={12} /> Reuniões agendadas
              </span>
              <span className="text-white">0/4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1">
                <Radar size={12} /> Follow-ups
              </span>
              <span className="text-white">0/10</span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted flex items-center gap-1">
                  <MessageSquare size={12} /> Mensagens enviadas
                </span>
                <span className="text-white">23/20</span>
              </div>
              <div className="h-1.5 bg-panelmuted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-xs">
              <span className="text-muted">Leads contatados</span>
              <span className="text-white">NaN</span>
              <span className="text-muted">Calls conectadas</span>
              <span className="text-white">NaN</span>
            </div>
          </div>
        </Panel>

        <Panel
          title="Reuniões"
          icon={<Calendar size={16} className="text-accent" />}
          right={
            <span className="text-[10px] bg-panelmuted text-muted px-2 py-0.5 rounded-full">No-show: 0%</span>
          }
        >
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Marcadas", color: "text-purple-400" },
              { label: "Agendadas", color: "text-blue-400" },
              { label: "Realizadas", color: "text-emerald-400" },
              { label: "No-show", color: "text-red-400" },
            ].map((b) => (
              <div key={b.label} className="bg-panelmuted rounded-md py-3">
                <div className={`text-lg font-semibold ${b.color}`}>0</div>
                <div className="text-[10px] text-muted">{b.label}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Agendamentos por Pessoa" icon={<Calendar size={16} className="text-accent" />}>
          <div className="text-center py-10 text-muted text-sm">Sem agendamentos</div>
        </Panel>
        <Panel
          title="Leads por Origem"
          icon={<Users size={16} className="text-accent" />}
          right={<span className="text-[10px] bg-panelmuted text-muted px-2 py-0.5 rounded-full">{contactsCount} total</span>}
        >
          <div className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Direto / Orgânico</span>
              <span className="text-white">{contactsCount > 0 ? "100%" : "0%"}</span>
            </div>
            <div className="h-1.5 bg-panelmuted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: contactsCount > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function DashboardTabs(props: Props) {
  const [tab, setTab] = useState<"geral" | "vendas" | "prevendas">("prevendas");
  const [range, setRange] = useState("Essa semana");

  return (
    <div className="mx-8 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard Comercial</h1>
          <p className="text-muted text-sm mt-0.5">14 set — 19 set 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-panel border border-border rounded-md overflow-hidden">
            {RANGE_OPTS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-3 py-1.5 ${
                  range === r ? "bg-panelmuted text-white font-medium" : "text-muted hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="text-muted hover:text-white bg-panel border border-border rounded-md p-2">
            <Calendar size={14} />
          </button>
          <button className="text-muted hover:text-white bg-panel border border-border rounded-md p-2">
            <MessageSquare size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-panel border border-border rounded-lg p-1 w-fit">
        {[
          { id: "geral", label: "Geral", Icon: BarChart3 },
          { id: "vendas", label: "Vendas", Icon: TrendingUp },
          { id: "prevendas", label: "Pré-Vendas", Icon: Phone },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
              tab === t.id ? "bg-accent text-bg font-medium" : "text-muted"
            }`}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && <GeralTab {...props} />}
      {tab === "vendas" && <VendasTab {...props} />}
      {tab === "prevendas" && <PreVendasTab {...props} />}
    </div>
  );
}
