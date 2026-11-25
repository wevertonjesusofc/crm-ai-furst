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
