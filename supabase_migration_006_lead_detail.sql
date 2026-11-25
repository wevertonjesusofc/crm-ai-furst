-- CRM AURA — colunas extras em contacts pra suportar a Lead Detail
-- Page (qualificação e favoritar). company/notes já existiam.

alter table public.contacts add column if not exists funcionarios text;
alter table public.contacts add column if not exists faturamento text;
alter table public.contacts add column if not exists desafios text;
alter table public.contacts add column if not exists starred boolean not null default false;
