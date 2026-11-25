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
