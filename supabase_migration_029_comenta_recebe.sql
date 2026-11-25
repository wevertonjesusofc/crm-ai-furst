-- CRM AURA — 029: "Comenta & Recebe" (comentou a palavra → recebe no direct).
--
-- gatilhos   um por post: a palavra (ex.: PROMPT), a resposta pública no
--            comentário, a mensagem do direct, o botão (link da agenda,
--            formulário ou material) e o id da automação criada na Zernio.
--            Os números (DMs enviados, cliques) vêm da Zernio.
--
-- Rode depois da 028. Pode rodar mais de uma vez.

create table if not exists public.gatilhos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  post_id uuid references public.redes_posts(id) on delete set null,
  platform_post_id text,                 -- id da mídia no Instagram
  post_url text,
  legenda text,
  palavra text not null,
  objetivo text not null default 'call' check (objetivo in ('call', 'material', 'formulario', 'conversa')),
  resposta_publica text,
  mensagem_direct text not null,
  botao_titulo text,
  botao_url text,
  zernio_automation_id text,
  ativo boolean not null default false,
  stats jsonb not null default '{}'::jsonb,
  criado_automatico boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, platform_post_id, palavra)
);

alter table public.gatilhos enable row level security;
drop policy if exists clinica_isolada on public.gatilhos;
create policy clinica_isolada on public.gatilhos for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());
