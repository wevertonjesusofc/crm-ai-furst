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
