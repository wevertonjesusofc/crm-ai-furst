-- CRM AURA — 028: social selling.
--
-- engajados   quem comentou nos posts (via Zernio): quantas vezes, em quantos
--             posts, os últimos comentários, a análise da IA (potencial de
--             compra, por quê, mensagem sugerida) e em que pé está a abordagem.
-- Obs.: o Instagram não informa quem curtiu nem quem visitou o perfil; o
-- engajamento medido é por comentário (e direct, que já vem pelo Inbox).
--
-- Rode depois da 027. Pode rodar mais de uma vez.

create table if not exists public.engajados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null default 'instagram',
  externo_id text not null,               -- id da pessoa na rede
  usuario text,                           -- @
  nome text,
  comentarios integer not null default 0, -- no período lido
  posts integer not null default 0,       -- em quantos posts diferentes
  ultimos jsonb not null default '[]'::jsonb, -- [{texto, link, quando}]
  ultimo_em timestamptz,
  analise jsonb,                          -- {potencial, perfil, por_que, mensagem}
  analisado_em timestamptz,
  status text not null default 'novo' check (status in ('novo', 'abordado', 'virou_paciente', 'descartado')),
  contact_id uuid references public.contacts(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);
create index if not exists engajados_rank_idx on public.engajados (clinica_id, comentarios desc);

alter table public.engajados enable row level security;
drop policy if exists clinica_isolada on public.engajados;
create policy clinica_isolada on public.engajados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());
