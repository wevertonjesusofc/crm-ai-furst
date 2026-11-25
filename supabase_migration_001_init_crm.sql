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
