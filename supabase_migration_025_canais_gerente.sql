-- CRM AURA — 025: quem pode conversar com o Gerente (IA) pelo Telegram/WhatsApp.
--
-- canais_autorizados   uma linha por pessoa liberada (o chat do Telegram ou o
--                      número de WhatsApp), com nome e papel.
-- A conversa fica em agente_sessoes/agente_mensagens (canal telegram/whatsapp).
--
-- Rode depois da 024. Pode rodar mais de uma vez.

create table if not exists public.canais_autorizados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  canal text not null check (canal in ('telegram', 'whatsapp')),
  externo_id text not null,           -- chat_id do Telegram ou número do WhatsApp
  nome text,
  papel text not null default 'dono',
  ativo boolean not null default true,
  sessao_id uuid references public.agente_sessoes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clinica_id, canal, externo_id)
);

alter table public.canais_autorizados enable row level security;
drop policy if exists clinica_isolada on public.canais_autorizados;
create policy clinica_isolada on public.canais_autorizados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

alter table public.agente_sessoes drop constraint if exists agente_sessoes_canal_check;
