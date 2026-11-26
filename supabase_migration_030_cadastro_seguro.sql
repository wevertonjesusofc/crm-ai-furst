-- CRM AURA — 030: cadastro seguro para colocar no ar.
--
-- 1. A clínica só é "assumida" por quem tem convite de DONO. Antes, a primeira
--    pessoa que abrisse /cadastro virava dona (mesmo sem confirmar o e-mail).
--    Na instalação: insert into public.convites (email, papel) values ('email-do-dono@clinica.com', 'dono');
-- 2. Só a plataforma (Aura) pode convidar alguém como suporte da plataforma.
-- 3. Modelo padrão dos agentes atualizado.
--
-- Rode depois da 029. Pode rodar mais de uma vez.

create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  conv record;
  nome_clinica text := nullif(trim(new.raw_user_meta_data->>'clinica_nome'), '');
  nome_pessoa text := coalesce(new.raw_user_meta_data->>'nome', '');
begin
  select * into conv from convites where lower(email) = lower(new.email) and usado_em is null;
  if not found then
    raise exception 'Cadastro fechado. Peça um convite para a clínica.';
  end if;

  -- a) Convite de dono e clínica ainda sem dono: assume a clínica.
  if conv.papel = 'dono' then
    select id into cid from clinicas
     where criado_por is null
       and not exists (select 1 from clinica_membros m where m.clinica_id = clinicas.id)
     order by created_at limit 1;
    if cid is not null then
      update clinicas set criado_por = new.id, nome = coalesce(nome_clinica, nome) where id = cid;
      if new.raw_user_meta_data ? 'especialidade' then
        execute 'update clinicas set especialidade = $1 where id = $2'
          using new.raw_user_meta_data->>'especialidade', cid;
      end if;
      insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, 'dono');
      update sistema_config set perfil_nome = coalesce(nullif(nome_pessoa, ''), perfil_nome),
                                perfil_email = new.email, perfil_cargo = 'dono', perfil_time = 'dono'
       where clinica_id = cid and id = 'default';
      perform public.ativar_clinica(cid, nome_pessoa, new.email);
      if conv.suporte_plataforma then
        insert into plataforma_admins (user_id) values (new.id) on conflict do nothing;
      end if;
      update convites set usado_em = now() where email = conv.email;
      return new;
    end if;
  end if;

  -- b) Convite (equipe, ou dono numa clínica que já tem dono): entra na clínica.
  select id into cid from clinicas order by created_at limit 1;
  insert into clinica_membros (clinica_id, user_id, papel) values (cid, new.id, conv.papel)
    on conflict do nothing;
  if conv.suporte_plataforma then
    insert into plataforma_admins (user_id) values (new.id) on conflict do nothing;
  end if;
  update convites set usado_em = now() where email = conv.email;
  return new;
end $$;

drop policy if exists convites_dono on public.convites;
create policy convites_dono on public.convites for all to authenticated
  using (public.is_plataforma_admin()
         or exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono'))
  with check (public.is_plataforma_admin()
         or (suporte_plataforma = false
             and exists (select 1 from public.clinica_membros where user_id = auth.uid() and papel = 'dono')));

alter table public.agentes alter column model set default 'claude-sonnet-5-5';
update public.agentes set model = 'claude-sonnet-5-5' where model like 'claude-sonnet-4%';
