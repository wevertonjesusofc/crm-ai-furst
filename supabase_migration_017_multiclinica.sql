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
