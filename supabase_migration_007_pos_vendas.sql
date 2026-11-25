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
