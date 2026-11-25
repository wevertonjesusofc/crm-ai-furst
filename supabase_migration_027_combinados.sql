-- CRM AURA — 027: combinados com o paciente ("me chama dia 17", "volto de viagem
-- semana que vem") e a cobrança do time.
--
--   combinados        o que o paciente pediu, para quando, o trecho da conversa
--                     (o "print") e quem do time é o responsável.
--   tasks.responsavel / tasks.combinado_id   tarefa criada a partir da cobrança.
--   canais_autorizados.agente_id             liga o Telegram de alguém a uma pessoa
--                                            do organograma (para avisar a Marta).
--
-- Rode depois da 026. Pode rodar mais de uma vez.

create table if not exists public.combinados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  conversa_id uuid references public.conversas(id) on delete set null,
  combinado_para date not null,
  o_que text not null,                    -- ex.: "Ligar depois que voltar de viagem"
  trecho text,                            -- a mensagem do paciente (o "print")
  responsavel_id uuid references public.agentes(id) on delete set null, -- pessoa do organograma
  status text not null default 'pendente' check (status in ('pendente', 'cumprido', 'atrasado', 'cobrado', 'ignorado')),
  avisado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists combinados_data_idx on public.combinados (clinica_id, combinado_para) where status in ('pendente', 'atrasado');

alter table public.combinados enable row level security;
drop policy if exists clinica_isolada on public.combinados;
create policy clinica_isolada on public.combinados for all to authenticated
  using (clinica_id = public.current_clinica_id())
  with check (clinica_id = public.current_clinica_id());

alter table public.tasks add column if not exists responsavel_id uuid references public.agentes(id) on delete set null;
alter table public.tasks add column if not exists combinado_id uuid references public.combinados(id) on delete set null;

alter table public.canais_autorizados add column if not exists agente_id uuid references public.agentes(id) on delete set null;
