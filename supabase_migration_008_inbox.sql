-- CRM AURA — Inbox (conversas + mensagens). Preparado pra quando o
-- WhatsApp/Instagram de verdade conectar (um webhook passaria a
-- inserir em `mensagens` normalmente); por enquanto as mensagens são
-- só as que a gente manda/registra manualmente pela interface.

create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'instagram')),
  status text not null default 'aberta' check (status in ('aberta', 'concluida')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contact_id, channel)
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  direction text not null check (direction in ('enviada', 'recebida')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists mensagens_conversa_id_idx on public.mensagens (conversa_id);
create index if not exists conversas_contact_id_idx on public.conversas (contact_id);

alter table public.conversas disable row level security;
alter table public.mensagens disable row level security;
