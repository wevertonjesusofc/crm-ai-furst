-- CRM AURA — 021: integrações da clínica (IA, WhatsApp, Meta Ads, Instagram,
-- Google Ads, e-mail, telefonia…).
--
-- Duas tabelas:
--   integracoes            o que pode aparecer na tela: tipo, campos públicos
--                          (ex.: ID da conta de anúncios), quais chaves já foram
--                          preenchidas, status e resultado do último teste.
--   integracoes_segredos   as chaves em si. Proteção ligada e NENHUMA política:
--                          o navegador nunca lê. Só o servidor (service_role).
--
-- Rode depois da 020. Pode rodar mais de uma vez.

create table if not exists public.integracoes (
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  tipo text not null,
  config jsonb not null default '{}'::jsonb,
  segredos_preenchidos text[] not null default '{}',
  status text not null default 'desconectado' check (status in ('desconectado', 'conectado', 'erro')),
  ultimo_teste_at timestamptz,
  ultimo_teste_msg text,
  updated_at timestamptz not null default now(),
  primary key (clinica_id, tipo)
);

create table if not exists public.integracoes_segredos (
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  tipo text not null,
  nome text not null,
  valor text not null,
  updated_at timestamptz not null default now(),
  primary key (clinica_id, tipo, nome)
);

alter table public.integracoes enable row level security;
drop policy if exists clinica_isolada on public.integracoes;
create policy clinica_isolada on public.integracoes for select to authenticated
  using (clinica_id = public.current_clinica_id());

alter table public.integracoes_segredos enable row level security;
-- (sem políticas de propósito)
