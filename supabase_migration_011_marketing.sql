-- CRM AURA — Marketing: canais de entrada, páginas rastreadas e
-- formulários de captação. As partes que dependem de integração
-- externa (email marketing, redes sociais, Meta Lead Ads) não têm
-- tabela própria ainda — ver checklist de integrações pendentes.

create table if not exists public.canais_entrada (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'pagina_externa' check (tipo in ('pagina_externa', 'whatsapp')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.paginas_marketing (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null,
  visitas integer not null default 0,
  leads integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.formularios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  campos jsonb not null default '["nome","email","telefone"]',
  cor_destaque text not null default '#22c55e',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  respostas integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.canais_entrada disable row level security;
alter table public.paginas_marketing disable row level security;
alter table public.formularios disable row level security;
