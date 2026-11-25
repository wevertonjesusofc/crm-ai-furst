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
