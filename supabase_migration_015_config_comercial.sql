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
