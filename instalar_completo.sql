-- CRM AURA — instalação completa num projeto Supabase VAZIO.

-- ================= supabase_migration_001_init_crm.sql =================
-- CRM AURA — schema inicial (MVP, uso solo, sem RLS ainda)
create extension if not exists pgcrypto;

-- 1. Contatos
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  phone text,
  email text,
  company text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Estágios do funil (editáveis, com ordem)
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null,
  created_at timestamptz not null default now()
);

-- 3. Oportunidades (deals)
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  title text not null,
  value numeric(12,2) default 0,
  status text not null default 'open' check (status in ('open','won','lost')),
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Atividades (histórico de interações)
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  type text not null check (type in ('call','whatsapp','email','meeting','note')),
  description text,
  created_at timestamptz not null default now()
);

-- 5. Tarefas / follow-ups
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Índices
create index on public.deals (contact_id);
create index on public.deals (stage_id);
create index on public.activities (contact_id);
create index on public.activities (deal_id);
create index on public.tasks (contact_id);
create index on public.tasks (deal_id);
create index on public.tasks (due_date) where done = false;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger trg_deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

-- Estágios padrão do funil
insert into public.pipeline_stages (name, position) values
  ('Novo Lead', 1),
  ('Contato Feito', 2),
  ('Proposta Enviada', 3),
  ('Negociação', 4),
  ('Ganho', 5),
  ('Perdido', 6);

-- ================= supabase_migration_002_disable_rls_mvp.sql =================
-- CRM AURA — libera leitura/escrita nas tabelas do app pra chave pública (anon)
-- Fase MVP sem login ainda. Quando tivermos autenticação de verdade, substituímos
-- isso por políticas de RLS de verdade (cada usuário só vê seus próprios dados).
-- Não mexe nas tabelas leads / lead_atividades (do Waldir) — só as 5 do CRM AURA.

alter table public.contacts disable row level security;
alter table public.pipeline_stages disable row level security;
alter table public.deals disable row level security;
alter table public.activities disable row level security;
alter table public.tasks disable row level security;

-- ================= supabase_migration_003_pipeline_stages_e_rls.sql =================
-- CRM AURA — corrige os estágios do pipeline pra bater com os 9
-- do CRM AI-First, e garante que a RLS continua liberada (MVP,
-- sem login ainda). Seguro rodar mesmo se já rodou o 002 antes.

alter table public.contacts disable row level security;
alter table public.pipeline_stages disable row level security;
alter table public.deals disable row level security;
alter table public.activities disable row level security;
alter table public.tasks disable row level security;

-- limpa os estágios antigos (não tem deal usando ainda, é seguro)
delete from public.pipeline_stages;

insert into public.pipeline_stages (name, position) values
  ('Novo Lead', 1),
  ('Tentando Contato', 2),
  ('Em Qualificação', 3),
  ('Reunião Agendada', 4),
  ('No-show', 5),
  ('Reunião Realizada', 6),
  ('Em Fechamento', 7),
  ('Ganho', 8),
  ('Perdido', 9);

-- ================= supabase_migration_005_consultas.sql =================
-- CRM AURA — tabela de Consultas (módulo específico de clínica de
-- saúde, sem equivalente no CRM AI-First). Guarda o histórico de
-- atendimentos: paciente, procedimento, data/hora, status.

create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  paciente_nome text not null,
  procedimento text,
  data date not null,
  hora text,
  status text not null default 'agendada'
    check (status in ('agendada', 'confirmada', 'realizada', 'faltou', 'cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultas_data_idx on public.consultas (data);
create index if not exists consultas_contact_id_idx on public.consultas (contact_id);

alter table public.consultas disable row level security;

drop trigger if exists set_updated_at on public.consultas;
create trigger set_updated_at
  before update on public.consultas
  for each row execute function public.set_updated_at();

-- ================= supabase_migration_006_lead_detail.sql =================
-- CRM AURA — colunas extras em contacts pra suportar a Lead Detail
-- Page (qualificação e favoritar). company/notes já existiam.

alter table public.contacts add column if not exists funcionarios text;
alter table public.contacts add column if not exists faturamento text;
alter table public.contacts add column if not exists desafios text;
alter table public.contacts add column if not exists starred boolean not null default false;

-- ================= supabase_migration_007_pos_vendas.sql =================
-- CRM AURA — módulo Pós-Vendas (acompanhamento de recuperação e
-- satisfação do paciente após um procedimento). Módulo específico da
-- área de saúde, sem equivalente no CRM AI-First.

create table if not exists public.pos_venda (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  procedimento text,
  data_procedimento date not null default current_date,
  dias_recuperacao integer not null default 30,
  ultimo_checkin_at timestamptz,
  follow_ups_realizados integer not null default 0,
  satisfacao text not null default 'nao_avaliado'
    check (satisfacao in ('nao_avaliado', 'insatisfeito', 'neutro', 'satisfeito')),
  status text not null default 'em_recuperacao'
    check (status in ('em_recuperacao', 'recuperado', 'enviado_pipeline')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_venda_contact_id_idx on public.pos_venda (contact_id);

alter table public.pos_venda disable row level security;

drop trigger if exists set_updated_at on public.pos_venda;
create trigger set_updated_at
  before update on public.pos_venda
  for each row execute function public.set_updated_at();

-- ================= supabase_migration_008_inbox.sql =================
-- CRM AURA — Inbox (conversas + mensagens). Preparado pra quando o
-- WhatsApp/Instagram de verdade conectar (um webhook passaria a
-- inserir em `mensagens` normalmente); por enquanto as mensagens são
-- só as que a gente manda/registra manualmente pela interface.

create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'instagram')),
  status text not null default 'aberta' check (status in ('aberta', 'concluida')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contact_id, channel)
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  direction text not null check (direction in ('enviada', 'recebida')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists mensagens_conversa_id_idx on public.mensagens (conversa_id);
create index if not exists conversas_contact_id_idx on public.conversas (contact_id);

alter table public.conversas disable row level security;
alter table public.mensagens disable row level security;

-- ================= supabase_migration_009_treinamento.sql =================
-- CRM AURA — Treinamento Comercial: biblioteca de casos +
-- personas customizadas pro simulador de roleplay.

create table if not exists public.treinamento_casos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'call_sdr'
    check (categoria in ('call_sdr', 'call_closer', 'reuniao', 'objecoes', 'fechamento', 'discovery', 'outro')),
  dificuldade text check (dificuldade in ('iniciante', 'intermediario', 'avancado')),
  resultado text check (resultado in ('positivo', 'negativo', 'neutro')),
  tags text[] not null default '{}',
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.treinamento_personas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  empresa text,
  briefing text not null,
  created_at timestamptz not null default now()
);

alter table public.treinamento_casos disable row level security;
alter table public.treinamento_personas disable row level security;

-- ================= supabase_migration_010_agentes.sql =================
-- CRM AURA — roster de Agentes IA (dados de cadastro/organograma).
-- A execução de verdade (prompt, tools, roteamento de canal) depende
-- de um Agent Runtime que ainda não existe — ver checklist de
-- integrações pendentes.

create table if not exists public.agentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  emoji text not null default '🤖',
  cor text not null default 'orange',
  proposito text,
  tier text not null default 'specialist' check (tier in ('ceo', 'manager', 'specialist')),
  reportar_a_id uuid references public.agentes(id) on delete set null,
  responsavel text,
  provider text not null default 'anthropic_api',
  model text not null default 'claude-sonnet-4-6',
  ativo boolean not null default true,
  versao integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agentes disable row level security;

drop trigger if exists set_updated_at on public.agentes;
create trigger set_updated_at
  before update on public.agentes
  for each row execute function public.set_updated_at();

-- ================= supabase_migration_011_marketing.sql =================
-- CRM AURA — Marketing: canais de entrada, páginas rastreadas e
-- formulários de captação. As partes que dependem de integração
-- externa (email marketing, redes sociais, Meta Lead Ads) não têm
-- tabela própria ainda — ver checklist de integrações pendentes.

create table if not exists public.canais_entrada (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'pagina_externa' check (tipo in ('pagina_externa', 'whatsapp')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.paginas_marketing (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null,
  visitas integer not null default 0,
  leads integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.formularios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  campos jsonb not null default '["nome","email","telefone"]',
  cor_destaque text not null default '#22c55e',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  respostas integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.canais_entrada disable row level security;
alter table public.paginas_marketing disable row level security;
alter table public.formularios disable row level security;

-- ================= supabase_migration_012_campanhas_automacoes.sql =================
-- CRM AURA — Campanhas, Automações e Templates de Email (registro de
-- dados/configuração). O disparo de verdade (email/WhatsApp em massa)
-- e a execução de automações dependem de integrações externas — ver
-- checklist de integrações pendentes. Templates de WhatsApp não têm
-- tabela própria: são 100% geridos pela Meta (aprovação oficial),
-- não dá pra criar localmente.

create table if not exists public.campanhas_email (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  assunto text,
  remetente_nome text,
  remetente_email text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada')),
  enviados integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.campanhas_whatsapp (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'concluida')),
  leads_contactados integer not null default 0,
  responderam integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.automacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  gatilho text not null default 'lead_criado',
  ativo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.templates_email (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  assunto text,
  corpo text not null default '',
  categoria text not null default 'Geral',
  created_at timestamptz not null default now()
);

alter table public.campanhas_email disable row level security;
alter table public.campanhas_whatsapp disable row level security;
alter table public.automacoes disable row level security;
alter table public.templates_email disable row level security;

-- ================= supabase_migration_013_gestao.sql =================
-- CRM AURA — Gestão: tarefas ganham tipo/hora (pra Gestão de Tarefas
-- funcionar igual à referência) + tabela de reuniões do time.

alter table public.tasks add column if not exists tipo text not null default 'tarefa'
  check (tipo in ('ligacao', 'reuniao', 'tarefa', 'email'));
alter table public.tasks add column if not exists hora text;

create table if not exists public.reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  hora text,
  duracao_min integer not null default 60,
  link text,
  notas text,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'cancelada')),
  created_at timestamptz not null default now()
);

alter table public.reunioes disable row level security;

-- ================= supabase_migration_014_sistema.sql =================
-- CRM AURA — Sistema: config singleton (módulos ativos + perfil do
-- usuário). Sem tabela de múltiplos usuários ainda (MVP sem login).

create table if not exists public.sistema_config (
  id text primary key default 'default',
  modulos_desativados text[] not null default '{}',
  perfil_nome text not null default 'weverton jesus',
  perfil_cargo text not null default 'admin',
  perfil_email text,
  perfil_time text not null default 'admin',
  updated_at timestamptz not null default now()
);

insert into public.sistema_config (id) values ('default')
  on conflict (id) do nothing;

alter table public.sistema_config disable row level security;

drop trigger if exists set_updated_at on public.sistema_config;
create trigger set_updated_at
  before update on public.sistema_config
  for each row execute function public.set_updated_at();

-- ================= supabase_migration_015_config_comercial.sql =================
-- CRM AURA — itens de Configurações > Comercial/Geral/Equipe/
-- Notificações que NÃO dependem de nenhuma integração externa.

alter table public.sistema_config add column if not exists tema text not null default 'escuro'
  check (tema in ('claro', 'escuro'));

create table if not exists public.templates_ia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  prompt text not null default '',
  categoria text not null default 'Geral',
  created_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric not null default 0,
  sku text,
  categoria text,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create table if not exists public.materiais_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text not null default 'link' check (tipo in ('link', 'pdf', 'apresentacao', 'outro')),
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.playbook (
  id text primary key default 'default',
  conteudo text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.playbook (id) values ('default') on conflict (id) do nothing;

create table if not exists public.comissao_regras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  percentual numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.membros_time (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  cargo text not null default 'vendedor',
  time text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.regras_alerta (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  condicao text not null,
  canal text not null default 'interno' check (canal in ('interno', 'whatsapp', 'email')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.templates_ia disable row level security;
alter table public.produtos disable row level security;
alter table public.materiais_venda disable row level security;
alter table public.playbook disable row level security;
alter table public.comissao_regras disable row level security;
alter table public.membros_time disable row level security;
alter table public.regras_alerta disable row level security;

drop trigger if exists set_updated_at on public.playbook;
create trigger set_updated_at
  before update on public.playbook
  for each row execute function public.set_updated_at();

-- ================= supabase_migration_016_agentes_config_completa.sql =================
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

-- ================= supabase_migration_017_multiclinica.sql =================
-- CRM AURA — 017: várias clínicas no mesmo sistema.
--
-- O que muda:
--   1. Cada clínica tem a sua conta. Login com e-mail e senha (Supabase Auth).
--   2. Toda tabela ganha `clinica_id` e a proteção por linha (RLS) volta a ser
--      ligada: cada clínica só enxerga os próprios dados.
--   3. Quem cria a conta já ganha a clínica montada (funil, configuração e o
--      organograma de agentes do Sistema Comercial).
--   4. Administradores da plataforma (você) enxergam a lista de clínicas e
--      podem "entrar" em qualquer uma para configurar.
--   5. Tokens pessoais para conectar o Claude pelo MCP.
--
-- Os dados que já existiam vão para a clínica "Aura (demonstração)".
-- Pode rodar mais de uma vez sem quebrar.

create extension if not exists pgcrypto;

-- ===================================================================
-- 1. Clínicas, membros e administradores
-- ===================================================================
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativa' check (status in ('ativa', 'pausada')),
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clinica_membros (
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'equipe')),
  created_at timestamptz not null default now(),
  primary key (clinica_id, user_id)
);
create index if not exists clinica_membros_user_idx on public.clinica_membros (user_id);

create table if not exists public.plataforma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Em qual clínica o administrador está "entrado" agora.
create table if not exists public.admin_contexto (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- Tokens do MCP (guardamos só o hash, nunca o token em si).
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default 'Claude',
  token_hash text not null unique,
  ultimo_uso_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id);

-- ===================================================================
-- 2. Funções de apoio
-- ===================================================================
create or replace function public.is_plataforma_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plataforma_admins where user_id = auth.uid())
$$;

-- A clínica "atual" de quem está logado: a escolhida pelo administrador,
-- ou senão a primeira clínica da qual a pessoa é membro.
create or replace function public.current_clinica_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ac.clinica_id from public.admin_contexto ac
      where ac.user_id = auth.uid() and public.is_plataforma_admin()),
    (select cm.clinica_id from public.clinica_membros cm
      where cm.user_id = auth.uid() order by cm.created_at limit 1)
  )
$$;

grant execute on function public.is_plataforma_admin() to authenticated;
grant execute on function public.current_clinica_id() to authenticated;

-- ===================================================================
-- 3. Clínica de demonstração para os dados que já existem
-- ===================================================================
insert into public.clinicas (id, nome)
values ('00000000-0000-0000-0000-000000000001', 'Aura (demonstração)')
on conflict (id) do nothing;

-- ===================================================================
-- 4. clinica_id + proteção por linha em todas as tabelas do CRM
-- ===================================================================
do $$
declare
  t text;
  demo uuid := '00000000-0000-0000-0000-000000000001';
  tabelas text[] := array[
    'contacts','pipeline_stages','deals','activities','tasks','consultas',
    'pos_venda','conversas','mensagens','treinamento_casos','treinamento_personas',
    'agentes','agente_tools','agente_canais','agente_regras','agente_notas',
    'agente_sessoes','agente_mensagens','canais_entrada','paginas_marketing',
    'formularios','campanhas_email','campanhas_whatsapp','automacoes',
    'templates_email','reunioes','sistema_config','templates_ia','produtos',
    'materiais_venda','playbook','comissao_regras','membros_time','regras_alerta'
  ];
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabela % não existe, pulando.', t;
      continue;
    end if;
    execute format('alter table public.%I add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade', t);
    execute format('update public.%I set clinica_id = %L where clinica_id is null', t, demo);
    execute format('alter table public.%I alter column clinica_id set default public.current_clinica_id()', t);
    execute format('alter table public.%I alter column clinica_id set not null', t);
    execute format('create index if not exists %I on public.%I (clinica_id)', t || '_clinica_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists clinica_isolada on public.%I', t);
    execute format(
      'create policy clinica_isolada on public.%I for all to authenticated
         using (clinica_id = public.current_clinica_id())
         with check (clinica_id = public.current_clinica_id())', t);
  end loop;
end $$;

-- Tabelas de "uma linha só" (id = 'default') passam a ter uma linha por clínica.
do $$
declare t text;
begin
  foreach t in array array['sistema_config', 'playbook'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_pkey');
    execute format('alter table public.%I add primary key (clinica_id, id)', t);
  end loop;
end $$;

-- ===================================================================
-- 5. Proteção das tabelas novas
-- ===================================================================
alter table public.clinicas enable row level security;
alter table public.clinica_membros enable row level security;
alter table public.plataforma_admins enable row level security;
alter table public.admin_contexto enable row level security;
alter table public.mcp_tokens enable row level security;

drop policy if exists clinicas_ver on public.clinicas;
create policy clinicas_ver on public.clinicas for select to authenticated
  using (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid()));

drop policy if exists clinicas_editar on public.clinicas;
create policy clinicas_editar on public.clinicas for update to authenticated
  using (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid() and papel = 'dono'))
  with check (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid() and papel = 'dono'));

drop policy if exists membros_ver on public.clinica_membros;
create policy membros_ver on public.clinica_membros for select to authenticated
  using (user_id = auth.uid() or public.is_plataforma_admin());

drop policy if exists admins_ver_proprio on public.plataforma_admins;
create policy admins_ver_proprio on public.plataforma_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists contexto_admin on public.admin_contexto;
create policy contexto_admin on public.admin_contexto for all to authenticated
  using (user_id = auth.uid() and public.is_plataforma_admin())
  with check (user_id = auth.uid() and public.is_plataforma_admin());

drop policy if exists tokens_proprios on public.mcp_tokens;
create policy tokens_proprios on public.mcp_tokens for select to authenticated
  using (user_id = auth.uid());
drop policy if exists tokens_apagar on public.mcp_tokens;
create policy tokens_apagar on public.mcp_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ===================================================================
-- 6. Ativação: monta o sistema de uma clínica nova
-- ===================================================================
create or replace function public.ativar_clinica(p_clinica uuid, p_nome text, p_email text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  ceo uuid; mkt uuid; vendas uuid;
begin
  -- Funil
  if not exists (select 1 from pipeline_stages where clinica_id = p_clinica) then
    insert into pipeline_stages (clinica_id, name, position) values
      (p_clinica, 'Novo Lead', 1), (p_clinica, 'Tentando Contato', 2),
      (p_clinica, 'Em Qualificação', 3), (p_clinica, 'Avaliação Agendada', 4),
      (p_clinica, 'No-show', 5), (p_clinica, 'Avaliação Realizada', 6),
      (p_clinica, 'Em Fechamento', 7), (p_clinica, 'Ganho', 8), (p_clinica, 'Perdido', 9);
  end if;

  -- Configuração e playbook
  insert into sistema_config (clinica_id, id, perfil_nome, perfil_email, perfil_cargo, perfil_time)
  values (p_clinica, 'default', coalesce(nullif(p_nome, ''), 'Dono da clínica'), p_email, 'dono', 'dono')
  on conflict (clinica_id, id) do nothing;
  insert into playbook (clinica_id, id) values (p_clinica, 'default')
  on conflict (clinica_id, id) do nothing;

  -- Organograma do Sistema Comercial (marketing primeiro, vendas depois)
  if not exists (select 1 from agentes where clinica_id = p_clinica) then
    insert into agentes (clinica_id, nome, emoji, cor, tier, proposito, prompt)
    values (p_clinica, 'Gerente', '🧭', 'teal', 'ceo',
      'Responde "como tá meu dia?" para o dono e coordena o time.',
      'Você é o gerente comercial da clínica. Responde ao dono de forma curta e clara: quantas conversas entraram, de onde vieram, quantas agendaram, quem ficou sem resposta e o que precisa de atenção hoje. Nunca invente números: use apenas o que está registrado no sistema.')
    returning id into ceo;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt)
    values (p_clinica, 'Marketing', '📣', 'green', 'manager', ceo,
      'Organiza a casa: origem dos pacientes, social selling e tráfego.',
      'Você coordena o marketing da clínica. Seu objetivo é organizar de onde vêm os pacientes, ativar o social selling e mostrar quais conteúdos e anúncios trazem venda.')
    returning id into mkt;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt)
    values (p_clinica, 'Vendas', '🤝', 'green', 'manager', ceo,
      'Atende, retoma quem esfriou e conduz até o fechamento.',
      'Você coordena as vendas da clínica. Garante que nenhum paciente fique sem resposta, que todo orçamento tenha um próximo passo e que as avaliações sejam agendadas e confirmadas.')
    returning id into vendas;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt) values
      (p_clinica, 'Social Selling', '💬', 'orange', 'specialist', mkt,
       'Chama quem comenta, curte e reage no Instagram antes de esfriar.',
       'Você faz a abordagem de quem engaja com a clínica no Instagram. Seja leve e educado. Nunca mencione dados pessoais que viu no perfil da pessoa, nunca aponte defeitos no rosto ou no corpo e nunca prometa resultado. Toda mensagem precisa de aprovação da recepção até o treinamento ser liberado.'),
      (p_clinica, 'Origem e Tráfego', '📈', 'orange', 'specialist', mkt,
       'Marca a origem de cada lead e mostra o que vende e o que vaza.',
       'Você acompanha a origem de cada paciente (Instagram, Google, anúncio, indicação, formulário) e liga cada venda ao canal e ao conteúdo que a trouxe. Aponte o que gera venda e o que só gera gasto.'),
      (p_clinica, 'Atendente 24h', '🎧', 'orange', 'specialist', vendas,
       'Responde em minutos, entende o objetivo do paciente e agenda.',
       'Você é a atendente da clínica. Responda com cordialidade, no jeito de falar da clínica. Entenda o objetivo do paciente antes de falar de preço, tire dúvidas e conduza para a avaliação. Só ofereça condições e promoções cadastradas pela clínica. Não faça diagnóstico e não prometa resultado.'),
      (p_clinica, 'Giro de 30 dias', '🔁', 'orange', 'specialist', vendas,
       'Varre as conversas e retoma orçamentos parados e pacientes sem retorno.',
       'A cada 30 dias, você revisa as conversas e encontra quem recebeu orçamento e não respondeu, quem não agendou e quem está no prazo de retorno. Sugira uma mensagem de retomada natural para cada caso.');
  end if;
end $$;

-- Quando alguém cria a conta, nasce a clínica dessa pessoa.
create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  nome_clinica text := coalesce(nullif(trim(new.raw_user_meta_data->>'clinica_nome'), ''), 'Minha clínica');
  nome_pessoa text := coalesce(new.raw_user_meta_data->>'nome', '');
begin
  insert into clinicas (nome, criado_por) values (nome_clinica, new.id) returning id into cid;
  insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, 'dono');
  perform public.ativar_clinica(cid, nome_pessoa, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- Garante que a clínica de demonstração também tenha tudo montado.
select public.ativar_clinica('00000000-0000-0000-0000-000000000001', 'Aura', null);

-- ===================================================================
-- 7. Depois de criar a SUA conta pelo /cadastro, rode isto (troque o e-mail)
--    para virar administrador da plataforma e enxergar a demonstração:
--
--   insert into public.plataforma_admins (user_id)
--     select id from auth.users where email = 'SEU_EMAIL_AQUI'
--   on conflict do nothing;
--
--   insert into public.clinica_membros (clinica_id, user_id, papel)
--     select '00000000-0000-0000-0000-000000000001', id, 'dono'
--     from auth.users where email = 'SEU_EMAIL_AQUI'
--   on conflict do nothing;
-- ===================================================================

-- ================= supabase_migration_018_instalacao_por_clinica.sql =================
-- CRM AURA — 018: uma instalação por clínica + painel de clientes.
--
-- Modelo: cada clínica tem o PRÓPRIO Supabase, o PRÓPRIO Vercel e o PRÓPRIO
-- domínio. Assim dá para transferir tudo para a clínica se ela quiser assumir.
--
-- O que muda nesta migração:
--   1. Cadastro fechado. A primeira pessoa que se cadastra "assume" a clínica
--      desta instalação (vira dona). Depois disso só entra quem tiver convite.
--   2. Convites: e-mail + papel (dono/equipe) + se é suporte da plataforma.
--   3. Painel de clientes (só usado na SUA instalação, a central): lista das
--      clínicas, onde estão hospedadas, quem paga e o token do MCP de cada uma.
--
-- Rode DEPOIS da 017. Pode rodar mais de uma vez.

-- ===================================================================
-- 1. A clínica desta instalação começa "aguardando cadastro"
-- ===================================================================
update public.clinicas
   set nome = 'Clínica (aguardando cadastro)'
 where id = '00000000-0000-0000-0000-000000000001'
   and criado_por is null
   and not exists (select 1 from public.clinica_membros where clinica_id = '00000000-0000-0000-0000-000000000001');

-- ===================================================================
-- 2. Convites
-- ===================================================================
create table if not exists public.convites (
  email text primary key,
  papel text not null default 'equipe' check (papel in ('dono', 'equipe')),
  suporte_plataforma boolean not null default false,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);
alter table public.convites enable row level security;

drop policy if exists convites_dono on public.convites;
create policy convites_dono on public.convites for all to authenticated
  using (public.is_plataforma_admin()
         or exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono'))
  with check (public.is_plataforma_admin()
         or exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono'));

-- ===================================================================
-- 3. Novo comportamento do cadastro
-- ===================================================================
create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  conv record;
  nome_clinica text := nullif(trim(new.raw_user_meta_data->>'clinica_nome'), '');
  nome_pessoa text := coalesce(new.raw_user_meta_data->>'nome', '');
begin
  -- a) Clínica ainda sem dono: quem se cadastra primeiro assume.
  select id into cid from clinicas
   where criado_por is null
     and not exists (select 1 from clinica_membros m where m.clinica_id = clinicas.id)
   order by created_at limit 1;

  if cid is not null then
    update clinicas set criado_por = new.id, nome = coalesce(nome_clinica, nome) where id = cid;
    -- especialidade (coluna criada na 020; o gatilho só roda depois de todas as migrações)
    if new.raw_user_meta_data ? 'especialidade' then
      execute 'update clinicas set especialidade = $1 where id = $2'
        using new.raw_user_meta_data->>'especialidade', cid;
    end if;
    insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, 'dono');
    update sistema_config set perfil_nome = coalesce(nullif(nome_pessoa, ''), perfil_nome),
                              perfil_email = new.email, perfil_cargo = 'dono', perfil_time = 'dono'
     where clinica_id = cid and id = 'default';
    perform public.ativar_clinica(cid, nome_pessoa, new.email);
    return new;
  end if;

  -- b) Tem convite: entra na clínica desta instalação.
  select * into conv from convites where lower(email) = lower(new.email) and usado_em is null;
  if found then
    select id into cid from clinicas order by created_at limit 1;
    insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, conv.papel)
      on conflict do nothing;
    if conv.suporte_plataforma then
      insert into plataforma_admins (user_id) values (new.id) on conflict do nothing;
    end if;
    update convites set usado_em = now() where email = conv.email;
    return new;
  end if;

  -- c) Sem convite: cadastro fechado.
  raise exception 'Cadastro fechado. Peça um convite para a clínica.';
end $$;

-- ===================================================================
-- 4. Painel de clientes (central da Aura)
-- ===================================================================
create table if not exists public.clientes_hub (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  responsavel text,
  dominio text,
  url_sistema text not null,          -- ex.: https://app.clinicadorafael.com.br
  supabase_projeto text,              -- referência do projeto no Supabase
  vercel_projeto text,                -- nome do projeto no Vercel
  gestao text not null default 'aura' check (gestao in ('aura', 'cliente')),
  status text not null default 'implantacao' check (status in ('implantacao', 'ativo', 'pausado', 'transferido')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- Token do MCP de cada cliente. Só o servidor lê (nenhuma política para o navegador).
create table if not exists public.clientes_hub_tokens (
  cliente_id uuid primary key references public.clientes_hub(id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);

-- Qual cliente cada administrador está usando agora (o Claude lê daqui).
create table if not exists public.cliente_ativo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes_hub(id) on delete set null,
  visto_cliente_id uuid,              -- último cliente que o Claude já anunciou
  updated_at timestamptz not null default now()
);
alter table public.cliente_ativo add column if not exists visto_cliente_id uuid;

alter table public.clientes_hub enable row level security;
alter table public.clientes_hub_tokens enable row level security;
alter table public.cliente_ativo enable row level security;

drop policy if exists hub_admin on public.clientes_hub;
create policy hub_admin on public.clientes_hub for all to authenticated
  using (public.is_plataforma_admin()) with check (public.is_plataforma_admin());

drop policy if exists ativo_admin on public.cliente_ativo;
create policy ativo_admin on public.cliente_ativo for all to authenticated
  using (user_id = auth.uid() and public.is_plataforma_admin())
  with check (user_id = auth.uid() and public.is_plataforma_admin());

-- ===================================================================
-- 5. Em uma instalação NOVA de cliente, depois de rodar 001 a 018,
--    crie o seu convite de suporte (troque o e-mail):
--
--   insert into public.convites (email, papel, suporte_plataforma)
--   values ('SEU_EMAIL_AQUI', 'equipe', true)
--   on conflict (email) do nothing;
--
--    Depois mande o link /cadastro para o cliente: ele se cadastra primeiro
--    e vira o dono. Você se cadastra com o seu e-mail e entra como suporte.
-- ===================================================================

-- ================= supabase_migration_019_conhecimento_clinica.sql =================
-- CRM AURA — 019: conhecimento da clínica (vale para todos os agentes).
--
-- Igual ao que a Mari fez na imersão: o tom de voz extraído de conversas reais
-- (ou de uma conversa simulada no Claude) fica salvo aqui e todos os agentes
-- passam a falar daquele jeito. Também guarda políticas, horários, endereço,
-- formas de pagamento e qualquer coisa que todos precisam saber.
-- Procedimentos e preços continuam na tabela `produtos`.
--
-- Rode depois da 018. Pode rodar mais de uma vez.

create table if not exists public.conhecimento_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  tipo text not null default 'geral' check (tipo in ('tom_de_voz', 'politica', 'geral')),
  titulo text not null,
  conteudo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conhecimento_clinica_clinica_idx on public.conhecimento_clinica (clinica_id);

alter table public.conhecimento_clinica enable row level security;
drop policy if exists clinica_isolada on public.conhecimento_clinica;
create policy clinica_isolada on public.conhecimento_clinica for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

drop trigger if exists set_updated_at on public.conhecimento_clinica;
create trigger set_updated_at before update on public.conhecimento_clinica
  for each row execute function public.set_updated_at();

-- Só pode existir um tom de voz ativo por clínica.
create unique index if not exists conhecimento_um_tom_de_voz
  on public.conhecimento_clinica (clinica_id) where tipo = 'tom_de_voz';

-- ================= supabase_migration_020_ficha_paciente_e_trafego.sql =================
-- CRM AURA — 020: ficha do paciente + rastreio do tráfego até a venda.
--
-- FICHA (vale para clínico, estética e odonto):
--   - Especialidade da clínica (define o modelo de anamnese).
--   - No paciente: nascimento, alergias, medicamentos, preferências
--     (o café, o chá), consentimento LGPD e a ORIGEM (canal, anúncio, UTM).
--   - Anamneses (respostas guardadas por modelo).
--   - Procedimentos realizados, com produto/lote e data de RETORNO.
--   - Orçamentos (pendente, aprovado, recusado) — alimentam o Giro de 30 dias.
--
-- TRÁFEGO:
--   - Anúncios (Meta e Google) e gasto diário de cada um.
--   - O paciente guarda de qual anúncio veio.
--   - Visão `desempenho_anuncios`: gasto × pacientes × vendas × receita por anúncio.
--
-- Rode depois da 019. Pode rodar mais de uma vez.
-- Ficha de relacionamento NÃO substitui o prontuário médico oficial.

-- ===================================================================
-- 1. Especialidade da clínica
-- ===================================================================
alter table public.clinicas add column if not exists especialidade text not null default 'estetica';
alter table public.clinicas drop constraint if exists clinicas_especialidade_check;
alter table public.clinicas add constraint clinicas_especialidade_check
  check (especialidade in ('clinico', 'estetica', 'odonto', 'outro'));

-- ===================================================================
-- 2. Campos da ficha e da origem no paciente (tabela contacts)
-- ===================================================================
alter table public.contacts add column if not exists data_nascimento date;
alter table public.contacts add column if not exists alergias text;
alter table public.contacts add column if not exists medicamentos text;
alter table public.contacts add column if not exists preferencias text;
alter table public.contacts add column if not exists consentimento_lgpd_em timestamptz;
alter table public.contacts add column if not exists origem_canal text;        -- instagram, google, anuncio_meta, anuncio_google, indicacao, formulario, whatsapp, outro
alter table public.contacts add column if not exists origem_detalhe text;      -- texto livre (nome do post, quem indicou…)
alter table public.contacts add column if not exists anuncio_id uuid;          -- liga em anuncios.id (abaixo)
alter table public.contacts add column if not exists utm_source text;
alter table public.contacts add column if not exists utm_medium text;
alter table public.contacts add column if not exists utm_campaign text;
alter table public.contacts add column if not exists utm_content text;
alter table public.contacts add column if not exists click_id text;            -- gclid / fbclid / ctwa_clid

-- ===================================================================
-- 3. Tabelas novas (todas isoladas por clínica)
-- ===================================================================
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  modelo text not null,
  respostas jsonb not null default '{}'::jsonb,
  preenchido_por text,
  created_at timestamptz not null default now()
);
create index if not exists anamneses_contact_idx on public.anamneses (contact_id);

create table if not exists public.procedimentos_realizados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  realizado_em date not null default current_date,
  profissional text,
  produto_lote text,
  valor numeric(12,2) not null default 0,
  retorno_em date,
  retorno_status text not null default 'pendente' check (retorno_status in ('pendente', 'agendado', 'feito', 'nao_vai')),
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists procedimentos_contact_idx on public.procedimentos_realizados (contact_id);
create index if not exists procedimentos_retorno_idx on public.procedimentos_realizados (retorno_em) where retorno_status = 'pendente';

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  enviado_em timestamptz not null default now(),
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orcamentos_contact_idx on public.orcamentos (contact_id);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null check (plataforma in ('meta', 'google', 'outro')),
  externo_id text not null,               -- id do anúncio na plataforma
  nome text not null default 'Anúncio',
  campanha text,
  conjunto text,
  criativo_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);

create table if not exists public.anuncios_gasto (
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  dia date not null,
  gasto numeric(12,2) not null default 0,
  impressoes integer not null default 0,
  cliques integer not null default 0,
  conversas integer not null default 0,
  primary key (anuncio_id, dia)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_anuncio_fk') then
    alter table public.contacts add constraint contacts_anuncio_fk
      foreign key (anuncio_id) references public.anuncios(id) on delete set null;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['anamneses', 'procedimentos_realizados', 'orcamentos', 'anuncios', 'anuncios_gasto'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists clinica_isolada on public.%I', t);
    execute format(
      'create policy clinica_isolada on public.%I for all to authenticated
         using (clinica_id = public.current_clinica_id())
         with check (clinica_id = public.current_clinica_id())', t);
  end loop;
end $$;

-- ===================================================================
-- 4. Desempenho por anúncio (respeita a proteção por clínica)
-- ===================================================================
create or replace view public.desempenho_anuncios
with (security_invoker = true) as
select
  a.id as anuncio_id,
  a.clinica_id,
  a.plataforma,
  a.nome,
  a.campanha,
  a.criativo_url,
  a.ativo,
  coalesce(g.gasto, 0)::numeric(12,2) as gasto,
  coalesce(g.cliques, 0) as cliques,
  coalesce(g.conversas, 0) as conversas_plataforma,
  coalesce(p.pacientes, 0) as pacientes,
  coalesce(v.vendas, 0) as vendas,
  coalesce(v.receita, 0)::numeric(12,2) as receita,
  case when coalesce(v.vendas, 0) > 0 then round(coalesce(g.gasto, 0) / v.vendas, 2) end as custo_por_venda,
  case when coalesce(g.gasto, 0) > 0 then round(coalesce(v.receita, 0) / g.gasto, 2) end as retorno_por_real
from public.anuncios a
left join (
  select anuncio_id, sum(gasto) gasto, sum(cliques) cliques, sum(conversas) conversas
  from public.anuncios_gasto group by anuncio_id
) g on g.anuncio_id = a.id
left join (
  select anuncio_id, count(*) pacientes from public.contacts where anuncio_id is not null group by anuncio_id
) p on p.anuncio_id = a.id
left join (
  select c.anuncio_id, count(d.id) vendas, sum(d.value) receita
  from public.deals d join public.contacts c on c.id = d.contact_id
  where d.status = 'won' and c.anuncio_id is not null
  group by c.anuncio_id
) v on v.anuncio_id = a.id;

grant select on public.desempenho_anuncios to authenticated;

-- ===================================================================
-- 4b. Meta do mês (visível para o time no Dashboard)
-- ===================================================================
alter table public.sistema_config add column if not exists meta_mensal numeric(12,2) not null default 0;

-- ===================================================================
-- 5. Chave para receber leads de fora (site, WhatsApp, Zernio…)
-- ===================================================================
alter table public.clinicas add column if not exists chave_entrada_leads text;
update public.clinicas set chave_entrada_leads = 'lead_' || encode(gen_random_bytes(18), 'hex')
 where chave_entrada_leads is null;
alter table public.clinicas alter column chave_entrada_leads
  set default 'lead_' || encode(gen_random_bytes(18), 'hex');

-- ================= supabase_migration_021_integracoes.sql =================
-- CRM AURA — 021: integrações da clínica (IA, WhatsApp, Meta Ads, Instagram,
-- Google Ads, e-mail, telefonia…).
--
-- Duas tabelas:
--   integracoes            o que pode aparecer na tela: tipo, campos públicos
--                          (ex.: ID da conta de anúncios), quais chaves já foram
--                          preenchidas, status e resultado do último teste.
--   integracoes_segredos   as chaves em si. Proteção ligada e NENHUMA política:
--                          o navegador nunca lê. Só o servidor (service_role).
--
-- Rode depois da 020. Pode rodar mais de uma vez.

create table if not exists public.integracoes (
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  tipo text not null,
  config jsonb not null default '{}'::jsonb,
  segredos_preenchidos text[] not null default '{}',
  status text not null default 'desconectado' check (status in ('desconectado', 'conectado', 'erro')),
  ultimo_teste_at timestamptz,
  ultimo_teste_msg text,
  updated_at timestamptz not null default now(),
  primary key (clinica_id, tipo)
);

create table if not exists public.integracoes_segredos (
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  tipo text not null,
  nome text not null,
  valor text not null,
  updated_at timestamptz not null default now(),
  primary key (clinica_id, tipo, nome)
);

alter table public.integracoes enable row level security;
drop policy if exists clinica_isolada on public.integracoes;
create policy clinica_isolada on public.integracoes for select to authenticated
  using (clinica_id = public.current_clinica_id());

alter table public.integracoes_segredos enable row level security;
-- (sem políticas de propósito)

-- ================= supabase_migration_022_zernio.sql =================
-- CRM AURA — 022: redes sociais pela Zernio (Instagram, TikTok, YouTube…).
--
--   contacts.instagram_id / instagram_usuario   quem mandou o direct (para não
--                                               duplicar o paciente)
--   conversas.externo_id                        id da conversa na Zernio (para
--                                               responder pelo CRM depois)
--   mensagens.externo_id                        id da mensagem na Zernio (para
--                                               não gravar a mesma duas vezes)
--   redes_posts                                 métricas de cada post
--
-- Rode depois da 021. Pode rodar mais de uma vez.

alter table public.contacts add column if not exists instagram_id text;
alter table public.contacts add column if not exists instagram_usuario text;
create unique index if not exists contacts_instagram_id_uniq on public.contacts (clinica_id, instagram_id);

alter table public.conversas add column if not exists externo_id text;
alter table public.mensagens add column if not exists externo_id text;
create unique index if not exists mensagens_externo_id_uniq on public.mensagens (clinica_id, externo_id);

create table if not exists public.redes_posts (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null,                 -- instagram, tiktok, youtube, linkedin, facebook…
  conta_externa_id text,                    -- id da conta na Zernio
  conta_usuario text,                       -- @ da conta
  externo_id text not null,                 -- id do post na rede (ou na Zernio)
  url text,
  legenda text,
  tipo_midia text,                          -- image, video, carousel, reel…
  thumbnail_url text,
  publicado_em timestamptz,
  impressoes integer not null default 0,
  alcance integer not null default 0,
  visualizacoes integer not null default 0,
  curtidas integer not null default 0,
  comentarios integer not null default 0,
  compartilhamentos integer not null default 0,
  salvos integer not null default 0,
  cliques integer not null default 0,
  taxa_engajamento numeric(8,4),
  metricas_brutas jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);

create index if not exists redes_posts_clinica_idx on public.redes_posts (clinica_id, publicado_em desc);

alter table public.redes_posts enable row level security;
drop policy if exists clinica_isolada on public.redes_posts;
create policy clinica_isolada on public.redes_posts for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

-- ================= supabase_migration_023_jornada_paciente.sql =================
-- CRM AURA — 023: jornada do paciente, do primeiro contato ao retorno.
--
-- Para saber POR QUE o paciente não fechou e POR QUE não voltou:
--   deals.motivo_perda                         (preço, medo, outra clínica…)
--   procedimentos_realizados.motivo_nao_retorno (mudou de cidade, insatisfeito…)
--   contacts.primeira_resposta_em              quando a clínica respondeu pela 1ª vez
--
-- Rode depois da 021 (a 022 é da Zernio). Pode rodar mais de uma vez.

alter table public.deals add column if not exists motivo_perda text;
alter table public.procedimentos_realizados add column if not exists motivo_nao_retorno text;
alter table public.contacts add column if not exists primeira_resposta_em timestamptz;

-- Marca a primeira resposta da clínica automaticamente.
create or replace function public.marcar_primeira_resposta()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'enviada' then
    update contacts c set primeira_resposta_em = now()
      from conversas cv
     where cv.id = new.conversa_id and c.id = cv.contact_id and c.primeira_resposta_em is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_primeira_resposta on public.mensagens;
create trigger trg_primeira_resposta after insert on public.mensagens
  for each row execute function public.marcar_primeira_resposta();

-- ================= supabase_migration_024_organograma_pessoas_e_premio.sql =================
-- CRM AURA — 024: organograma com PESSOAS e agentes juntos + prêmio da meta.
--
--   agentes.tipo   'agente' (IA) ou 'pessoa' (colaborador de verdade)
--   agentes.cargo  ex.: Head de marketing, Social media, Vendedora
--   sistema_config.premio_meta  o prêmio do time ao bater a meta (ex.: viagem)
--
-- Rode depois da 023. Pode rodar mais de uma vez.

alter table public.agentes add column if not exists tipo text not null default 'agente';
alter table public.agentes drop constraint if exists agentes_tipo_check;
alter table public.agentes add constraint agentes_tipo_check check (tipo in ('agente', 'pessoa'));
alter table public.agentes add column if not exists cargo text;

alter table public.sistema_config add column if not exists premio_meta text;

-- ================= supabase_migration_025_canais_gerente.sql =================
-- CRM AURA — 025: quem pode conversar com o Gerente (IA) pelo Telegram/WhatsApp.
--
-- canais_autorizados   uma linha por pessoa liberada (o chat do Telegram ou o
--                      número de WhatsApp), com nome e papel.
-- A conversa fica em agente_sessoes/agente_mensagens (canal telegram/whatsapp).
--
-- Rode depois da 024. Pode rodar mais de uma vez.

create table if not exists public.canais_autorizados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  canal text not null check (canal in ('telegram', 'whatsapp')),
  externo_id text not null,           -- chat_id do Telegram ou número do WhatsApp
  nome text,
  papel text not null default 'dono',
  ativo boolean not null default true,
  sessao_id uuid references public.agente_sessoes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clinica_id, canal, externo_id)
);

alter table public.canais_autorizados enable row level security;
drop policy if exists clinica_isolada on public.canais_autorizados;
create policy clinica_isolada on public.canais_autorizados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

alter table public.agente_sessoes drop constraint if exists agente_sessoes_canal_check;

-- ================= supabase_migration_026_origem_detalhada.sql =================
-- CRM AURA — 026: de onde o paciente veio, em detalhe, e qualificação de clínica.
--
--   contacts.indicado_por_id   quem indicou (outro paciente) → bônus por indicação
--   contacts.origem_post_id    o post/vídeo do Instagram que trouxe o paciente
--   contacts.objetivo / quando_quer_fazer / ja_fez_antes / decide_sozinho
--                              qualificação de clínica (no lugar de empresa,
--                              funcionários e faturamento, que são de B2B)
--
-- Rode depois da 025. Pode rodar mais de uma vez.

alter table public.contacts add column if not exists indicado_por_id uuid references public.contacts(id) on delete set null;
alter table public.contacts add column if not exists origem_post_id uuid references public.redes_posts(id) on delete set null;
alter table public.contacts add column if not exists objetivo text;
alter table public.contacts add column if not exists quando_quer_fazer text;
alter table public.contacts add column if not exists ja_fez_antes text;
alter table public.contacts add column if not exists decide_sozinho text;

create index if not exists contacts_indicado_por_idx on public.contacts (indicado_por_id);

-- ================= supabase_migration_027_combinados.sql =================
-- CRM AURA — 027: combinados com o paciente ("me chama dia 17", "volto de viagem
-- semana que vem") e a cobrança do time.
--
--   combinados        o que o paciente pediu, para quando, o trecho da conversa
--                     (o "print") e quem do time é o responsável.
--   tasks.responsavel / tasks.combinado_id   tarefa criada a partir da cobrança.
--   canais_autorizados.agente_id             liga o Telegram de alguém a uma pessoa
--                                            do organograma (para avisar a Marta).
--
-- Rode depois da 026. Pode rodar mais de uma vez.

create table if not exists public.combinados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  conversa_id uuid references public.conversas(id) on delete set null,
  combinado_para date not null,
  o_que text not null,                    -- ex.: "Ligar depois que voltar de viagem"
  trecho text,                            -- a mensagem do paciente (o "print")
  responsavel_id uuid references public.agentes(id) on delete set null, -- pessoa do organograma
  status text not null default 'pendente' check (status in ('pendente', 'cumprido', 'atrasado', 'cobrado', 'ignorado')),
  avisado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists combinados_data_idx on public.combinados (clinica_id, combinado_para) where status in ('pendente', 'atrasado');

alter table public.combinados enable row level security;
drop policy if exists clinica_isolada on public.combinados;
create policy clinica_isolada on public.combinados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

alter table public.tasks add column if not exists responsavel_id uuid references public.agentes(id) on delete set null;
alter table public.tasks add column if not exists combinado_id uuid references public.combinados(id) on delete set null;

alter table public.canais_autorizados add column if not exists agente_id uuid references public.agentes(id) on delete set null;

-- ================= supabase_migration_028_social_selling.sql =================
-- CRM AURA — 028: social selling.
--
-- engajados   quem comentou nos posts (via Zernio): quantas vezes, em quantos
--             posts, os últimos comentários, a análise da IA (potencial de
--             compra, por quê, mensagem sugerida) e em que pé está a abordagem.
-- Obs.: o Instagram não informa quem curtiu nem quem visitou o perfil; o
-- engajamento medido é por comentário (e direct, que já vem pelo Inbox).
--
-- Rode depois da 027. Pode rodar mais de uma vez.

create table if not exists public.engajados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null default 'instagram',
  externo_id text not null,               -- id da pessoa na rede
  usuario text,                           -- @
  nome text,
  comentarios integer not null default 0, -- no período lido
  posts integer not null default 0,       -- em quantos posts diferentes
  ultimos jsonb not null default '[]'::jsonb, -- [{texto, link, quando}]
  ultimo_em timestamptz,
  analise jsonb,                          -- {potencial, perfil, por_que, mensagem}
  analisado_em timestamptz,
  status text not null default 'novo' check (status in ('novo', 'abordado', 'virou_paciente', 'descartado')),
  contact_id uuid references public.contacts(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);
create index if not exists engajados_rank_idx on public.engajados (clinica_id, comentarios desc);

alter table public.engajados enable row level security;
drop policy if exists clinica_isolada on public.engajados;
create policy clinica_isolada on public.engajados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

-- ================= supabase_migration_029_comenta_recebe.sql =================
-- CRM AURA — 029: "Comenta & Recebe" (comentou a palavra → recebe no direct).
--
-- gatilhos   um por post: a palavra (ex.: PROMPT), a resposta pública no
--            comentário, a mensagem do direct, o botão (link da agenda,
--            formulário ou material) e o id da automação criada na Zernio.
--            Os números (DMs enviados, cliques) vêm da Zernio.
--
-- Rode depois da 028. Pode rodar mais de uma vez.

create table if not exists public.gatilhos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  post_id uuid references public.redes_posts(id) on delete set null,
  platform_post_id text,                 -- id da mídia no Instagram
  post_url text,
  legenda text,
  palavra text not null,
  objetivo text not null default 'call' check (objetivo in ('call', 'material', 'formulario', 'conversa')),
  resposta_publica text,
  mensagem_direct text not null,
  botao_titulo text,
  botao_url text,
  zernio_automation_id text,
  ativo boolean not null default false,
  stats jsonb not null default '{}'::jsonb,
  criado_automatico boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, platform_post_id, palavra)
);

alter table public.gatilhos enable row level security;
drop policy if exists clinica_isolada on public.gatilhos;
create policy clinica_isolada on public.gatilhos for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());
