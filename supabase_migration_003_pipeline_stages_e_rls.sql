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
