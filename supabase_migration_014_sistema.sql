-- CRM AURA — Sistema: config singleton (módulos ativos + perfil do
-- usuário). Sem tabela de múltiplos usuários ainda (MVP sem login).

create table if not exists public.sistema_config (
  id text primary key default 'default',
  modulos_desativados text[] not null default '{}',
  perfil_nome text not null default 'weverton jesus',
  perfil_cargo text not null default 'admin',
  perfil_email text,
  perfil_time text not null default 'admin',
  updated_at timestamptz not null default now()
);

insert into public.sistema_config (id) values ('default')
  on conflict (id) do nothing;

alter table public.sistema_config disable row level security;

drop trigger if exists set_updated_at on public.sistema_config;
create trigger set_updated_at
  before update on public.sistema_config
  for each row execute function public.set_updated_at();
