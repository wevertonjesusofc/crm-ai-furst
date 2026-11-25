-- CRM AURA — aplicar 017 a 020 de uma vez (gerado em 25/11/2026)
-- Cole tudo no SQL Editor do Supabase e clique em Run.

-- ================= supabase_migration_017_multiclinica.sql =================
-- CRM AURA — 017: várias clínicas no mesmo sistema.
--
-- O que muda:
--   1. Cada clínica tem a sua conta. Login com e-mail e senha (Supabase Auth).
--   2. Toda tabela ganha `clinica_id` e a proteção por linha (RLS) volta a ser
--      ligada: cada clínica só enxerga os próprios dados.
--   3. Quem cria a conta já ganha a clínica montada (funil, configuração e o
--      organograma de agentes do Sistema Comercial).
--   4. Administradores da plataforma (você) enxergam a lista de clínicas e
--      podem "entrar" em qualquer uma para configurar.
--   5. Tokens pessoais para conectar o Claude pelo MCP.
--
-- Os dados que já existiam vão para a clínica "Aura (demonstração)".
-- Pode rodar mais de uma vez sem quebrar.

create extension if not exists pgcrypto;

-- ===================================================================
-- 1. Clínicas, membros e administradores
-- ===================================================================
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativa' check (status in ('ativa', 'pausada')),
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clinica_membros (
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'equipe')),
  created_at timestamptz not null default now(),
  primary key (clinica_id, user_id)
);
create index if not exists clinica_membros_user_idx on public.clinica_membros (user_id);

create table if not exists public.plataforma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Em qual clínica o administrador está "entrado" agora.
create table if not exists public.admin_contexto (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- Tokens do MCP (guardamos só o hash, nunca o token em si).
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default 'Claude',
  token_hash text not null unique,
  ultimo_uso_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id);

-- ===================================================================
-- 2. Funções de apoio
-- ===================================================================
create or replace function public.is_plataforma_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plataforma_admins where user_id = auth.uid())
$$;

-- A clínica "atual" de quem está logado: a escolhida pelo administrador,
-- ou senão a primeira clínica da qual a pessoa é membro.
create or replace function public.current_clinica_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ac.clinica_id from public.admin_contexto ac
      where ac.user_id = auth.uid() and public.is_plataforma_admin()),
    (select cm.clinica_id from public.clinica_membros cm
      where cm.user_id = auth.uid() order by cm.created_at limit 1)
  )
$$;

grant execute on function public.is_plataforma_admin() to authenticated;
grant execute on function public.current_clinica_id() to authenticated;

-- ===================================================================
-- 3. Clínica de demonstração para os dados que já existem
-- ===================================================================
insert into public.clinicas (id, nome)
values ('00000000-0000-0000-0000-000000000001', 'Aura (demonstração)')
on conflict (id) do nothing;

-- ===================================================================
-- 4. clinica_id + proteção por linha em todas as tabelas do CRM
-- ===================================================================
do $$
declare
  t text;
  demo uuid := '00000000-0000-0000-0000-000000000001';
  tabelas text[] := array[
    'contacts','pipeline_stages','deals','activities','tasks','consultas',
    'pos_venda','conversas','mensagens','treinamento_casos','treinamento_personas',
    'agentes','agente_tools','agente_canais','agente_regras','agente_notas',
    'agente_sessoes','agente_mensagens','canais_entrada','paginas_marketing',
    'formularios','campanhas_email','campanhas_whatsapp','automacoes',
    'templates_email','reunioes','sistema_config','templates_ia','produtos',
    'materiais_venda','playbook','comissao_regras','membros_time','regras_alerta'
  ];
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabela % não existe, pulando.', t;
      continue;
    end if;
    execute format('alter table public.%I add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade', t);
    execute format('update public.%I set clinica_id = %L where clinica_id is null', t, demo);
    execute format('alter table public.%I alter column clinica_id set default public.current_clinica_id()', t);
    execute format('alter table public.%I alter column clinica_id set not null', t);
    execute format('create index if not exists %I on public.%I (clinica_id)', t || '_clinica_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists clinica_isolada on public.%I', t);
    execute format(
      'create policy clinica_isolada on public.%I for all to authenticated
         using (clinica_id = public.current_clinica_id())
         with check (clinica_id = public.current_clinica_id())', t);
  end loop;
end $$;

-- Tabelas de "uma linha só" (id = 'default') passam a ter uma linha por clínica.
do $$
declare t text;
begin
  foreach t in array array['sistema_config', 'playbook'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_pkey');
    execute format('alter table public.%I add primary key (clinica_id, id)', t);
  end loop;
end $$;

-- ===================================================================
-- 5. Proteção das tabelas novas
-- ===================================================================
alter table public.clinicas enable row level security;
alter table public.clinica_membros enable row level security;
alter table public.plataforma_admins enable row level security;
alter table public.admin_contexto enable row level security;
alter table public.mcp_tokens enable row level security;

drop policy if exists clinicas_ver on public.clinicas;
create policy clinicas_ver on public.clinicas for select to authenticated
  using (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid()));

drop policy if exists clinicas_editar on public.clinicas;
create policy clinicas_editar on public.clinicas for update to authenticated
  using (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid() and papel = 'dono'))
  with check (public.is_plataforma_admin()
         or id in (select clinica_id from public.clinica_membros where user_id = auth.uid() and papel = 'dono'));

drop policy if exists membros_ver on public.clinica_membros;
create policy membros_ver on public.clinica_membros for select to authenticated
  using (user_id = auth.uid() or public.is_plataforma_admin());

drop policy if exists admins_ver_proprio on public.plataforma_admins;
create policy admins_ver_proprio on public.plataforma_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists contexto_admin on public.admin_contexto;
create policy contexto_admin on public.admin_contexto for all to authenticated
  using (user_id = auth.uid() and public.is_plataforma_admin())
  with check (user_id = auth.uid() and public.is_plataforma_admin());

drop policy if exists tokens_proprios on public.mcp_tokens;
create policy tokens_proprios on public.mcp_tokens for select to authenticated
  using (user_id = auth.uid());
drop policy if exists tokens_apagar on public.mcp_tokens;
create policy tokens_apagar on public.mcp_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ===================================================================
-- 6. Ativação: monta o sistema de uma clínica nova
-- ===================================================================
create or replace function public.ativar_clinica(p_clinica uuid, p_nome text, p_email text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  ceo uuid; mkt uuid; vendas uuid;
begin
  -- Funil
  if not exists (select 1 from pipeline_stages where clinica_id = p_clinica) then
    insert into pipeline_stages (clinica_id, name, position) values
      (p_clinica, 'Novo Lead', 1), (p_clinica, 'Tentando Contato', 2),
      (p_clinica, 'Em Qualificação', 3), (p_clinica, 'Avaliação Agendada', 4),
      (p_clinica, 'No-show', 5), (p_clinica, 'Avaliação Realizada', 6),
      (p_clinica, 'Em Fechamento', 7), (p_clinica, 'Ganho', 8), (p_clinica, 'Perdido', 9);
  end if;

  -- Configuração e playbook
  insert into sistema_config (clinica_id, id, perfil_nome, perfil_email, perfil_cargo, perfil_time)
  values (p_clinica, 'default', coalesce(nullif(p_nome, ''), 'Dono da clínica'), p_email, 'dono', 'dono')
  on conflict (clinica_id, id) do nothing;
  insert into playbook (clinica_id, id) values (p_clinica, 'default')
  on conflict (clinica_id, id) do nothing;

  -- Organograma do Sistema Comercial (marketing primeiro, vendas depois)
  if not exists (select 1 from agentes where clinica_id = p_clinica) then
    insert into agentes (clinica_id, nome, emoji, cor, tier, proposito, prompt)
    values (p_clinica, 'Gerente', '🧭', 'teal', 'ceo',
      'Responde "como tá meu dia?" para o dono e coordena o time.',
      'Você é o gerente comercial da clínica. Responde ao dono de forma curta e clara: quantas conversas entraram, de onde vieram, quantas agendaram, quem ficou sem resposta e o que precisa de atenção hoje. Nunca invente números: use apenas o que está registrado no sistema.')
    returning id into ceo;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt)
    values (p_clinica, 'Marketing', '📣', 'green', 'manager', ceo,
      'Organiza a casa: origem dos pacientes, social selling e tráfego.',
      'Você coordena o marketing da clínica. Seu objetivo é organizar de onde vêm os pacientes, ativar o social selling e mostrar quais conteúdos e anúncios trazem venda.')
    returning id into mkt;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt)
    values (p_clinica, 'Vendas', '🤝', 'green', 'manager', ceo,
      'Atende, retoma quem esfriou e conduz até o fechamento.',
      'Você coordena as vendas da clínica. Garante que nenhum paciente fique sem resposta, que todo orçamento tenha um próximo passo e que as avaliações sejam agendadas e confirmadas.')
    returning id into vendas;

    insert into agentes (clinica_id, nome, emoji, cor, tier, reportar_a_id, proposito, prompt) values
      (p_clinica, 'Social Selling', '💬', 'orange', 'specialist', mkt,
       'Chama quem comenta, curte e reage no Instagram antes de esfriar.',
       'Você faz a abordagem de quem engaja com a clínica no Instagram. Seja leve e educado. Nunca mencione dados pessoais que viu no perfil da pessoa, nunca aponte defeitos no rosto ou no corpo e nunca prometa resultado. Toda mensagem precisa de aprovação da recepção até o treinamento ser liberado.'),
      (p_clinica, 'Origem e Tráfego', '📈', 'orange', 'specialist', mkt,
       'Marca a origem de cada lead e mostra o que vende e o que vaza.',
       'Você acompanha a origem de cada paciente (Instagram, Google, anúncio, indicação, formulário) e liga cada venda ao canal e ao conteúdo que a trouxe. Aponte o que gera venda e o que só gera gasto.'),
      (p_clinica, 'Atendente 24h', '🎧', 'orange', 'specialist', vendas,
       'Responde em minutos, entende o objetivo do paciente e agenda.',
       'Você é a atendente da clínica. Responda com cordialidade, no jeito de falar da clínica. Entenda o objetivo do paciente antes de falar de preço, tire dúvidas e conduza para a avaliação. Só ofereça condições e promoções cadastradas pela clínica. Não faça diagnóstico e não prometa resultado.'),
      (p_clinica, 'Giro de 30 dias', '🔁', 'orange', 'specialist', vendas,
       'Varre as conversas e retoma orçamentos parados e pacientes sem retorno.',
       'A cada 30 dias, você revisa as conversas e encontra quem recebeu orçamento e não respondeu, quem não agendou e quem está no prazo de retorno. Sugira uma mensagem de retomada natural para cada caso.');
  end if;
end $$;

-- Quando alguém cria a conta, nasce a clínica dessa pessoa.
create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  nome_clinica text := coalesce(nullif(trim(new.raw_user_meta_data->>'clinica_nome'), ''), 'Minha clínica');
  nome_pessoa text := coalesce(new.raw_user_meta_data->>'nome', '');
begin
  insert into clinicas (nome, criado_por) values (nome_clinica, new.id) returning id into cid;
  insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, 'dono');
  perform public.ativar_clinica(cid, nome_pessoa, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- Garante que a clínica de demonstração também tenha tudo montado.
select public.ativar_clinica('00000000-0000-0000-0000-000000000001', 'Aura', null);

-- ===================================================================
-- 7. Depois de criar a SUA conta pelo /cadastro, rode isto (troque o e-mail)
--    para virar administrador da plataforma e enxergar a demonstração:
--
--   insert into public.plataforma_admins (user_id)
--     select id from auth.users where email = 'SEU_EMAIL_AQUI'
--   on conflict do nothing;
--
--   insert into public.clinica_membros (clinica_id, user_id, papel)
--     select '00000000-0000-0000-0000-000000000001', id, 'dono'
--     from auth.users where email = 'SEU_EMAIL_AQUI'
--   on conflict do nothing;
-- ===================================================================

-- ================= supabase_migration_018_instalacao_por_clinica.sql =================
-- CRM AURA — 018: uma instalação por clínica + painel de clientes.
--
-- Modelo: cada clínica tem o PRÓPRIO Supabase, o PRÓPRIO Vercel e o PRÓPRIO
-- domínio. Assim dá para transferir tudo para a clínica se ela quiser assumir.
--
-- O que muda nesta migração:
--   1. Cadastro fechado. A primeira pessoa que se cadastra "assume" a clínica
--      desta instalação (vira dona). Depois disso só entra quem tiver convite.
--   2. Convites: e-mail + papel (dono/equipe) + se é suporte da plataforma.
--   3. Painel de clientes (só usado na SUA instalação, a central): lista das
--      clínicas, onde estão hospedadas, quem paga e o token do MCP de cada uma.
--
-- Rode DEPOIS da 017. Pode rodar mais de uma vez.

-- ===================================================================
-- 1. A clínica desta instalação começa "aguardando cadastro"
-- ===================================================================
update public.clinicas
   set nome = 'Clínica (aguardando cadastro)'
 where id = '00000000-0000-0000-0000-000000000001'
   and criado_por is null
   and not exists (select 1 from public.clinica_membros where clinica_id = '00000000-0000-0000-0000-000000000001');

-- ===================================================================
-- 2. Convites
-- ===================================================================
create table if not exists public.convites (
  email text primary key,
  papel text not null default 'equipe' check (papel in ('dono', 'equipe')),
  suporte_plataforma boolean not null default false,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);
alter table public.convites enable row level security;

drop policy if exists convites_dono on public.convites;
create policy convites_dono on public.convites for all to authenticated
  using (public.is_plataforma_admin()
         or exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono'))
  with check (public.is_plataforma_admin()
         or exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono'));

-- ===================================================================
-- 3. Novo comportamento do cadastro
-- ===================================================================
create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  conv record;
  nome_clinica text := nullif(trim(new.raw_user_meta_data->>'clinica_nome'), '');
  nome_pessoa text := coalesce(new.raw_user_meta_data->>'nome', '');
begin
  -- a) Clínica ainda sem dono: quem se cadastra primeiro assume.
  select id into cid from clinicas
   where criado_por is null
     and not exists (select 1 from clinica_membros m where m.clinica_id = clinicas.id)
   order by created_at limit 1;

  if cid is not null then
    update clinicas set criado_por = new.id, nome = coalesce(nome_clinica, nome) where id = cid;
    -- especialidade (coluna criada na 020; o gatilho só roda depois de todas as migrações)
    if new.raw_user_meta_data ? 'especialidade' then
      execute 'update clinicas set especialidade = $1 where id = $2'
        using new.raw_user_meta_data->>'especialidade', cid;
    end if;
    insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, 'dono');
    update sistema_config set perfil_nome = coalesce(nullif(nome_pessoa, ''), perfil_nome),
                              perfil_email = new.email, perfil_cargo = 'dono', perfil_time = 'dono'
     where clinica_id = cid and id = 'default';
    perform public.ativar_clinica(cid, nome_pessoa, new.email);
    return new;
  end if;

  -- b) Tem convite: entra na clínica desta instalação.
  select * into conv from convites where lower(email) = lower(new.email) and usado_em is null;
  if found then
    select id into cid from clinicas order by created_at limit 1;
    insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, conv.papel)
      on conflict do nothing;
    if conv.suporte_plataforma then
      insert into plataforma_admins (user_id) values (new.id) on conflict do nothing;
    end if;
    update convites set usado_em = now() where email = conv.email;
    return new;
  end if;

  -- c) Sem convite: cadastro fechado.
  raise exception 'Cadastro fechado. Peça um convite para a clínica.';
end $$;

-- ===================================================================
-- 4. Painel de clientes (central da Aura)
-- ===================================================================
create table if not exists public.clientes_hub (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  responsavel text,
  dominio text,
  url_sistema text not null,          -- ex.: https://app.clinicadorafael.com.br
  supabase_projeto text,              -- referência do projeto no Supabase
  vercel_projeto text,                -- nome do projeto no Vercel
  gestao text not null default 'aura' check (gestao in ('aura', 'cliente')),
  status text not null default 'implantacao' check (status in ('implantacao', 'ativo', 'pausado', 'transferido')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- Token do MCP de cada cliente. Só o servidor lê (nenhuma política para o navegador).
create table if not exists public.clientes_hub_tokens (
  cliente_id uuid primary key references public.clientes_hub(id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);

-- Qual cliente cada administrador está usando agora (o Claude lê daqui).
create table if not exists public.cliente_ativo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes_hub(id) on delete set null,
  visto_cliente_id uuid,              -- último cliente que o Claude já anunciou
  updated_at timestamptz not null default now()
);
alter table public.cliente_ativo add column if not exists visto_cliente_id uuid;

alter table public.clientes_hub enable row level security;
alter table public.clientes_hub_tokens enable row level security;
alter table public.cliente_ativo enable row level security;

drop policy if exists hub_admin on public.clientes_hub;
create policy hub_admin on public.clientes_hub for all to authenticated
  using (public.is_plataforma_admin()) with check (public.is_plataforma_admin());

drop policy if exists ativo_admin on public.cliente_ativo;
create policy ativo_admin on public.cliente_ativo for all to authenticated
  using (user_id = auth.uid() and public.is_plataforma_admin())
  with check (user_id = auth.uid() and public.is_plataforma_admin());

-- ===================================================================
-- 5. Em uma instalação NOVA de cliente, depois de rodar 001 a 018,
--    crie o seu convite de suporte (troque o e-mail):
--
--   insert into public.convites (email, papel, suporte_plataforma)
--   values ('SEU_EMAIL_AQUI', 'equipe', true)
--   on conflict (email) do nothing;
--
--    Depois mande o link /cadastro para o cliente: ele se cadastra primeiro
--    e vira o dono. Você se cadastra com o seu e-mail e entra como suporte.
-- ===================================================================

-- ================= supabase_migration_019_conhecimento_clinica.sql =================
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

-- ================= supabase_migration_020_ficha_paciente_e_trafego.sql =================
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
