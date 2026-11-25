-- CRM AURA — 019: conhecimento da clínica (vale para todos os agentes).
--
-- Igual ao que a Mari fez na imersão: o tom de voz extraído de conversas reais
-- (ou de uma conversa simulada no Claude) fica salvo aqui e todos os agentes
-- passam a falar daquele jeito. Também guarda políticas, horários, endereço,
-- formas de pagamento e qualquer coisa que todos precisam saber.
-- Procedimentos e preços continuam na tabela `produtos`.
--
-- Rode depois da 018. Pode rodar mais de uma vez.

create table if not exists public.conhecimento_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  tipo text not null default 'geral' check (tipo in ('tom_de_voz', 'politica', 'geral')),
  titulo text not null,
  conteudo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conhecimento_clinica_clinica_idx on public.conhecimento_clinica (clinica_id);

alter table public.conhecimento_clinica enable row level security;
drop policy if exists clinica_isolada on public.conhecimento_clinica;
create policy clinica_isolada on public.conhecimento_clinica for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

drop trigger if exists set_updated_at on public.conhecimento_clinica;
create trigger set_updated_at before update on public.conhecimento_clinica
  for each row execute function public.set_updated_at();

-- Só pode existir um tom de voz ativo por clínica.
create unique index if not exists conhecimento_um_tom_de_voz
  on public.conhecimento_clinica (clinica_id) where tipo = 'tom_de_voz';
