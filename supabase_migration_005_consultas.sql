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
