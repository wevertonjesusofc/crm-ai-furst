-- CRM AURA — libera leitura/escrita nas tabelas do app pra chave pública (anon)
-- Fase MVP sem login ainda. Quando tivermos autenticação de verdade, substituímos
-- isso por políticas de RLS de verdade (cada usuário só vê seus próprios dados).
-- Não mexe nas tabelas leads / lead_atividades (do Waldir) — só as 5 do CRM AURA.

alter table public.contacts disable row level security;
alter table public.pipeline_stages disable row level security;
alter table public.deals disable row level security;
alter table public.activities disable row level security;
alter table public.tasks disable row level security;
