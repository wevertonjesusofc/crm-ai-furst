-- CRM AURA — 026: de onde o paciente veio, em detalhe, e qualificação de clínica.
--
--   contacts.indicado_por_id   quem indicou (outro paciente) → bônus por indicação
--   contacts.origem_post_id    o post/vídeo do Instagram que trouxe o paciente
--   contacts.objetivo / quando_quer_fazer / ja_fez_antes / decide_sozinho
--                              qualificação de clínica (no lugar de empresa,
--                              funcionários e faturamento, que são de B2B)
--
-- Rode depois da 025. Pode rodar mais de uma vez.

alter table public.contacts add column if not exists indicado_por_id uuid references public.contacts(id) on delete set null;
alter table public.contacts add column if not exists origem_post_id uuid references public.redes_posts(id) on delete set null;
alter table public.contacts add column if not exists objetivo text;
alter table public.contacts add column if not exists quando_quer_fazer text;
alter table public.contacts add column if not exists ja_fez_antes text;
alter table public.contacts add column if not exists decide_sozinho text;

create index if not exists contacts_indicado_por_idx on public.contacts (indicado_por_id);
