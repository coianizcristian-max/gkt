-- Consenti anche lo spagnolo nelle traduzioni dei contenuti (home + FAQ interne),
-- così l'editor Traduzioni puo' salvare la lingua 'es'.
alter table public.contenuti_traduzioni drop constraint if exists contenuti_traduzioni_lingua_check;
alter table public.contenuti_traduzioni add constraint contenuti_traduzioni_lingua_check
  check (lingua in ('en','de','es'));
