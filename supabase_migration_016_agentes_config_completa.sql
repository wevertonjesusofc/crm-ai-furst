-- CRM AURA — configuração completa dos Agentes IA (paridade com o
-- editor do CRM AI-First: Prompt, Modelo, Tools, Canais, Regras,
-- Humanização, Notas, Sessões do Playground). A execução real (rodar o
-- prompt, chamar tools, responder no WhatsApp) ainda depende do Agent
-- Runtime — só o CADASTRO/CONFIGURAÇÃO fica real aqui.

-- Geral/Prompt/Modelo: novas colunas em agentes
alter table public.agentes add column if not exists prompt text not null default '';
alter table public.agentes add column if not exists temperatura numeric not null default 0.7;
alter table public.agentes add column if not exists max_tokens integer not null default 4000;
alter table public.agentes add column if not exists sliding_window integer not null default 30;
alter table public.agentes add column if not exists max_tool_iteracoes integer not null default 20;
alter table public.agentes add column if not exists intervalo_min_rotina integer not null default 5;
alter table public.agentes add column if not exists limite_custo_diario numeric not null default 50.00;
alter table public.agentes add column if not exists mostrar_detalhes_tecnicos boolean not null default false;

-- Humanização: novas colunas em agentes
alter table public.agentes add column if not exists humanizacao_ativado boolean not null default true;
alter table public.agentes add column if not exists humanizacao_canais text[] not null default '{whatsapp,telegram,instagram}';
alter table public.agentes add column if not exists debounce_janela integer not null default 8;
alter table public.agentes add column if not exists delay_min_ms integer not null default 2000;
alter table public.agentes add column if not exists delay_max_ms integer not null default 5000;
alter table public.agentes add column if not exists digitando_indicator boolean not null default true;
alter table public.agentes add column if not exists quebrar_resposta boolean not null default true;
alter table public.agentes add column if not exists quebrar_max_chars integer not null default 200;
alter table public.agentes add column if not exists quebrar_delay_min_ms integer not null default 1500;
alter table public.agentes add column if not exists quebrar_delay_max_ms integer not null default 3000;

-- Tools: catálogo de ferramentas por agente + política de execução
create table if not exists public.agente_tools (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id) on delete cascade,
  tool_key text not null,
  tool_label text not null,
  tool_desc text,
  policy text not null default 'sempre' check (policy in ('sempre', 'aprovacao', 'desativada')),
  created_at timestamptz not null default now(),
  unique (agente_id, tool_key)
);

-- Canais: conexões (chat web / telegram / whatsapp / instagram / botão flutuante)
create table if not exists public.agente_canais (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id) on delete cascade,
  tipo text not null check (tipo in ('chat_web', 'telegram', 'whatsapp', 'instagram', 'botao_flutuante')),
  ativo boolean not null default true,
  prioridade integer not null default 100,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (agente_id, tipo)
);

-- Regras: workflow "quando X faz Y"
create table if not exists public.agente_regras (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id) on delete cascade,
  nome text not null default 'Nova regra',
  ativa boolean not null default true,
  evento text not null default 'lead_mensagem',
  palavras_chave text,
  min_mensagens integer,
  acao_tipo text not null default 'notificar_humano',
  grupo_responsavel text,
  mensagem text,
  cooldown_min integer not null default 60,
  max_por_dia integer not null default 1,
  created_at timestamptz not null default now()
);

-- Notas: memória/RAG do agente
create table if not exists public.agente_notas (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id) on delete cascade,
  titulo text not null default 'Sem título',
  conteudo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessões do Playground (histórico de teste, sem execução de IA real ainda)
create table if not exists public.agente_sessoes (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id) on delete cascade,
  canal text not null default 'playground',
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.agente_sessoes(id) on delete cascade,
  direction text not null check (direction in ('enviada', 'recebida')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists agente_tools_agente_id_idx on public.agente_tools (agente_id);
create index if not exists agente_canais_agente_id_idx on public.agente_canais (agente_id);
create index if not exists agente_regras_agente_id_idx on public.agente_regras (agente_id);
create index if not exists agente_notas_agente_id_idx on public.agente_notas (agente_id);
create index if not exists agente_sessoes_agente_id_idx on public.agente_sessoes (agente_id);
create index if not exists agente_mensagens_sessao_id_idx on public.agente_mensagens (sessao_id);

alter table public.agente_tools disable row level security;
alter table public.agente_canais disable row level security;
alter table public.agente_regras disable row level security;
alter table public.agente_notas disable row level security;
alter table public.agente_sessoes disable row level security;
alter table public.agente_mensagens disable row level security;

drop trigger if exists set_updated_at on public.agente_notas;
create trigger set_updated_at
  before update on public.agente_notas
  for each row execute function public.set_updated_at();
