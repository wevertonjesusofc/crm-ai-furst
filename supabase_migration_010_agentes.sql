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
