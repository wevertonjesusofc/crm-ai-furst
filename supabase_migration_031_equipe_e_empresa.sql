-- CRM AURA — 031: tela "Equipe e empresa" do dono.
--
-- clinicas    dados da empresa (CNPJ, telefone, WhatsApp, endereço, Instagram, site)
-- agentes     e-mail da pessoa do time (liga a pessoa do organograma ao login)
-- O WhatsApp de cada pessoa fica em canais_autorizados (canal 'whatsapp'),
-- igual ao Telegram: é por ele que o Gerente reconhece quem está falando.
--
-- Rode depois da 030. Pode rodar mais de uma vez.

alter table public.clinicas add column if not exists razao_social text;
alter table public.clinicas add column if not exists cnpj text;
alter table public.clinicas add column if not exists telefone text;
alter table public.clinicas add column if not exists whatsapp text;
alter table public.clinicas add column if not exists email_contato text;
alter table public.clinicas add column if not exists endereco text;
alter table public.clinicas add column if not exists cidade text;
alter table public.clinicas add column if not exists instagram text;
alter table public.clinicas add column if not exists site text;

alter table public.agentes add column if not exists email text;

alter table public.sistema_config alter column perfil_nome set default '';
