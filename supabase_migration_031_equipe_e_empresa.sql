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

-- Tráfego no estilo painel de rastreio: criativo (miniatura e vídeo), status
-- na plataforma, alcance e leads por dia.
alter table public.anuncios add column if not exists video_url text;
alter table public.anuncios add column if not exists formato text;            -- video, imagem, carrossel
alter table public.anuncios add column if not exists status_plataforma text;  -- ACTIVE, PAUSED…
alter table public.anuncios add column if not exists link text;
alter table public.anuncios_gasto add column if not exists alcance integer not null default 0;
alter table public.anuncios_gasto add column if not exists leads integer not null default 0;
