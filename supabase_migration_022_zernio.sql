-- CRM AURA — 022: redes sociais pela Zernio (Instagram, TikTok, YouTube…).
--
--   contacts.instagram_id / instagram_usuario   quem mandou o direct (para não
--                                               duplicar o paciente)
--   conversas.externo_id                        id da conversa na Zernio (para
--                                               responder pelo CRM depois)
--   mensagens.externo_id                        id da mensagem na Zernio (para
--                                               não gravar a mesma duas vezes)
--   redes_posts                                 métricas de cada post
--
-- Rode depois da 021. Pode rodar mais de uma vez.

alter table public.contacts add column if not exists instagram_id text;
alter table public.contacts add column if not exists instagram_usuario text;
create unique index if not exists contacts_instagram_id_uniq on public.contacts (clinica_id, instagram_id);

alter table public.conversas add column if not exists externo_id text;
alter table public.mensagens add column if not exists externo_id text;
create unique index if not exists mensagens_externo_id_uniq on public.mensagens (clinica_id, externo_id);

create table if not exists public.redes_posts (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null,                 -- instagram, tiktok, youtube, linkedin, facebook…
  conta_externa_id text,                    -- id da conta na Zernio
  conta_usuario text,                       -- @ da conta
  externo_id text not null,                 -- id do post na rede (ou na Zernio)
  url text,
  legenda text,
  tipo_midia text,                          -- image, video, carousel, reel…
  thumbnail_url text,
  publicado_em timestamptz,
  impressoes integer not null default 0,
  alcance integer not null default 0,
  visualizacoes integer not null default 0,
  curtidas integer not null default 0,
  comentarios integer not null default 0,
  compartilhamentos integer not null default 0,
  salvos integer not null default 0,
  cliques integer not null default 0,
  taxa_engajamento numeric(8,4),
  metricas_brutas jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);

create index if not exists redes_posts_clinica_idx on public.redes_posts (clinica_id, publicado_em desc);

alter table public.redes_posts enable row level security;
drop policy if exists clinica_isolada on public.redes_posts;
create policy clinica_isolada on public.redes_posts for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());
