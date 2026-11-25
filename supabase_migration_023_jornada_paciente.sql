-- CRM AURA — 023: jornada do paciente, do primeiro contato ao retorno.
--
-- Para saber POR QUE o paciente não fechou e POR QUE não voltou:
--   deals.motivo_perda                         (preço, medo, outra clínica…)
--   procedimentos_realizados.motivo_nao_retorno (mudou de cidade, insatisfeito…)
--   contacts.primeira_resposta_em              quando a clínica respondeu pela 1ª vez
--
-- Rode depois da 021 (a 022 é da Zernio). Pode rodar mais de uma vez.

alter table public.deals add column if not exists motivo_perda text;
alter table public.procedimentos_realizados add column if not exists motivo_nao_retorno text;
alter table public.contacts add column if not exists primeira_resposta_em timestamptz;

-- Marca a primeira resposta da clínica automaticamente.
create or replace function public.marcar_primeira_resposta()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'enviada' then
    update contacts c set primeira_resposta_em = now()
      from conversas cv
     where cv.id = new.conversa_id and c.id = cv.contact_id and c.primeira_resposta_em is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_primeira_resposta on public.mensagens;
create trigger trg_primeira_resposta after insert on public.mensagens
  for each row execute function public.marcar_primeira_resposta();
