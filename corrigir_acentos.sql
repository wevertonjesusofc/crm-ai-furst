-- Correção de acentos/emojis (a área de transferência embaralhou a codificação).
alter table public.agentes alter column emoji set default '🤖';
alter table public.agente_notas alter column titulo set default 'Sem título';
alter table public.anuncios alter column nome set default 'Anúncio';

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

-- Recria os agentes e o funil da clínica (ainda sem uso) com o texto certo.
delete from public.agentes where clinica_id = '00000000-0000-0000-0000-000000000001';
delete from public.pipeline_stages where clinica_id = '00000000-0000-0000-0000-000000000001'
  and not exists (select 1 from public.deals where clinica_id = '00000000-0000-0000-0000-000000000001');
select public.ativar_clinica('00000000-0000-0000-0000-000000000001', '', null);
select nome, emoji from public.agentes order by created_at;
