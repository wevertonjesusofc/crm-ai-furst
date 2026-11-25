-- CRM AURA — 024: organograma com PESSOAS e agentes juntos + prêmio da meta.
--
--   agentes.tipo   'agente' (IA) ou 'pessoa' (colaborador de verdade)
--   agentes.cargo  ex.: Head de marketing, Social media, Vendedora
--   sistema_config.premio_meta  o prêmio do time ao bater a meta (ex.: viagem)
--
-- Rode depois da 023. Pode rodar mais de uma vez.

alter table public.agentes add column if not exists tipo text not null default 'agente';
alter table public.agentes drop constraint if exists agentes_tipo_check;
alter table public.agentes add constraint agentes_tipo_check check (tipo in ('agente', 'pessoa'));
alter table public.agentes add column if not exists cargo text;

alter table public.sistema_config add column if not exists premio_meta text;
