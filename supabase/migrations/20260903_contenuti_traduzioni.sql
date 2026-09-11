-- Traduzioni dei contenuti gestiti da DB (home e FAQ interne).
-- Modello "tabella traduzioni": una riga per (tabella, riga tradotta, campo, lingua).
-- L'italiano resta nella tabella originale; qui stanno solo EN/DE (ed eventuali lingue future).

create table if not exists public.contenuti_traduzioni (
  id          uuid primary key default gen_random_uuid(),
  tabella     text not null check (tabella in ('sito_sezioni','faq_interne')),
  riga_id     uuid not null,                       -- id della riga nella tabella originale
  campo       text not null,                       -- es. 'titolo','testo','domanda','risposta'
  lingua      text not null check (lingua in ('en','de')),
  testo       text not null default '',
  updated_at  timestamptz not null default now(),
  unique (tabella, riga_id, campo, lingua)
);

create index if not exists idx_contenuti_traduzioni_lookup
  on public.contenuti_traduzioni (tabella, lingua, riga_id);

alter table public.contenuti_traduzioni enable row level security;

-- Lettura pubblica: le pagine pubbliche (home) devono poter leggere le traduzioni
-- anche senza login, come già avviene per sito_sezioni.
create policy "traduzioni_public_read"
  on public.contenuti_traduzioni for select
  using (true);

-- Scrittura riservata ai supervisori (come per il resto del pannello Sito/FAQ).
create policy "traduzioni_supervisore_write"
  on public.contenuti_traduzioni for all
  using      (exists (select 1 from public.profili p where p.id = auth.uid() and p.supervisore = true))
  with check (exists (select 1 from public.profili p where p.id = auth.uid() and p.supervisore = true));
