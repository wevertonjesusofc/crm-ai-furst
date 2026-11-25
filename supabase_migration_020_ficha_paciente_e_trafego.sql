-- CRM AURA — 020: ficha do paciente + rastreio do tráfego até a venda.
--
-- FICHA (vale para clínico, estética e odonto):
--   - Especialidade da clínica (define o modelo de anamnese).
--   - No paciente: nascimento, alergias, medicamentos, preferências
--     (o café, o chá), consentimento LGPD e a ORIGEM (canal, anúncio, UTM).
--   - Anamneses (respostas guardadas por modelo).
--   - Procedimentos realizados, com produto/lote e data de RETORNO.
--   - Orçamentos (pendente, aprovado, recusado) — alimentam o Giro de 30 dias.
--
-- TRÁFEGO:
--   - Anúncios (Meta e Google) e gasto diário de cada um.
--   - O paciente guarda de qual anúncio veio.
--   - Visão `desempenho_anuncios`: gasto × pacientes × vendas × receita por anúncio.
--
-- Rode depois da 019. Pode rodar mais de uma vez.
-- Ficha de relacionamento NÃO substitui o prontuário médico oficial.

-- ===================================================================
-- 1. Especialidade da clínica
-- ===================================================================
alter table public.clinicas add column if not exists especialidade text not null default 'estetica';
alter table public.clinicas drop constraint if exists clinicas_especialidade_check;
alter table public.clinicas add constraint clinicas_especialidade_check
  check (especialidade in ('clinico', 'estetica', 'odonto', 'outro'));

-- ===================================================================
-- 2. Campos da ficha e da origem no paciente (tabela contacts)
-- ===================================================================
alter table public.contacts add column if not exists data_nascimento date;
alter table public.contacts add column if not exists alergias text;
alter table public.contacts add column if not exists medicamentos text;
alter table public.contacts add column if not exists preferencias text;
alter table public.contacts add column if not exists consentimento_lgpd_em timestamptz;
alter table public.contacts add column if not exists origem_canal text;        -- instagram, google, anuncio_meta, anuncio_google, indicacao, formulario, whatsapp, outro
alter table public.contacts add column if not exists origem_detalhe text;      -- texto livre (nome do post, quem indicou…)
alter table public.contacts add column if not exists anuncio_id uuid;          -- liga em anuncios.id (abaixo)
alter table public.contacts add column if not exists utm_source text;
alter table public.contacts add column if not exists utm_medium text;
alter table public.contacts add column if not exists utm_campaign text;
alter table public.contacts add column if not exists utm_content text;
alter table public.contacts add column if not exists click_id text;            -- gclid / fbclid / ctwa_clid

-- ===================================================================
-- 3. Tabelas novas (todas isoladas por clínica)
-- ===================================================================
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  modelo text not null,
  respostas jsonb not null default '{}'::jsonb,
  preenchido_por text,
  created_at timestamptz not null default now()
);
create index if not exists anamneses_contact_idx on public.anamneses (contact_id);

create table if not exists public.procedimentos_realizados (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  realizado_em date not null default current_date,
  profissional text,
  produto_lote text,
  valor numeric(12,2) not null default 0,
  retorno_em date,
  retorno_status text not null default 'pendente' check (retorno_status in ('pendente', 'agendado', 'feito', 'nao_vai')),
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists procedimentos_contact_idx on public.procedimentos_realizados (contact_id);
create index if not exists procedimentos_retorno_idx on public.procedimentos_realizados (retorno_em) where retorno_status = 'pendente';

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  enviado_em timestamptz not null default now(),
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orcamentos_contact_idx on public.orcamentos (contact_id);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  plataforma text not null check (plataforma in ('meta', 'google', 'outro')),
  externo_id text not null,               -- id do anúncio na plataforma
  nome text not null default 'Anúncio',
  campanha text,
  conjunto text,
  criativo_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinica_id, plataforma, externo_id)
);

create table if not exists public.anuncios_gasto (
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  clinica_id uuid not null default public.current_clinica_id() references public.clinicas(id) on delete cascade,
  dia date not null,
  gasto numeric(12,2) not null default 0,
  impressoes integer not null default 0,
  cliques integer not null default 0,
  conversas integer not null default 0,
  primary key (anuncio_id, dia)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_anuncio_fk') then
    alter table public.contacts add constraint contacts_anuncio_fk
      foreign key (anuncio_id) references public.anuncios(id) on delete set null;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['anamneses', 'procedimentos_realizados', 'orcamentos', 'anuncios', 'anuncios_gasto'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists clinica_isolada on public.%I', t);
    execute format(
      'create policy clinica_isolada on public.%I for all to authenticated
         using (clinica_id = public.current_clinica_id())
         with check (clinica_id = public.current_clinica_id())', t);
  end loop;
end $$;

-- ===================================================================
-- 4. Desempenho por anúncio (respeita a proteção por clínica)
-- ===================================================================
create or replace view public.desempenho_anuncios
with (security_invoker = true) as
select
  a.id as anuncio_id,
  a.clinica_id,
  a.plataforma,
  a.nome,
  a.campanha,
  a.criativo_url,
  a.ativo,
  coalesce(g.gasto, 0)::numeric(12,2) as gasto,
  coalesce(g.cliques, 0) as cliques,
  coalesce(g.conversas, 0) as conversas_plataforma,
  coalesce(p.pacientes, 0) as pacientes,
  coalesce(v.vendas, 0) as vendas,
  coalesce(v.receita, 0)::numeric(12,2) as receita,
  case when coalesce(v.vendas, 0) > 0 then round(coalesce(g.gasto, 0) / v.vendas, 2) end as custo_por_venda,
  case when coalesce(g.gasto, 0) > 0 then round(coalesce(v.receita, 0) / g.gasto, 2) end as retorno_por_real
from public.anuncios a
left join (
  select anuncio_id, sum(gasto) gasto, sum(cliques) cliques, sum(conversas) conversas
  from public.anuncios_gasto group by anuncio_id
) g on g.anuncio_id = a.id
left join (
  select anuncio_id, count(*) pacientes from public.contacts where anuncio_id is not null group by anuncio_id
) p on p.anuncio_id = a.id
left join (
  select c.anuncio_id, count(d.id) vendas, sum(d.value) receita
  from public.deals d join public.contacts c on c.id = d.contact_id
  where d.status = 'won' and c.anuncio_id is not null
  group by c.anuncio_id
) v on v.anuncio_id = a.id;

grant select on public.desempenho_anuncios to authenticated;

-- ===================================================================
-- 4b. Meta do mês (visível para o time no Dashboard)
-- ===================================================================
alter table public.sistema_config add column if not exists meta_mensal numeric(12,2) not null default 0;

-- ===================================================================
-- 5. Chave para receber leads de fora (site, WhatsApp, Zernio…)
-- ===================================================================
alter table public.clinicas add column if not exists chave_entrada_leads text;
update public.clinicas set chave_entrada_leads = 'lead_' || encode(gen_random_bytes(18), 'hex')
 where chave_entrada_leads is null;
alter table public.clinicas alter column chave_entrada_leads
  set default 'lead_' || encode(gen_random_bytes(18), 'hex');
