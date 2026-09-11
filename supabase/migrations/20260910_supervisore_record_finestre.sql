-- Funzione supervisore: record creati per utente su finestre 3 / 7 / 30 giorni.
-- Alimenta le nuove colonne della pagina Supervisore > Metriche.
-- Attribuzione via v_record_creati (record legati all'owner/allenatore).
create or replace function public.supervisore_record_finestre()
returns table (utente uuid, r3 bigint, r7 bigint, r30 bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- solo un supervisore puo' leggere l'aggregato di tutti gli utenti
  if not exists (select 1 from public.profili where id = auth.uid() and supervisore) then
    raise exception 'non autorizzato';
  end if;

  return query
    select v.utente,
           count(*) filter (where v.created_at >= now() - interval '3 days')  as r3,
           count(*) filter (where v.created_at >= now() - interval '7 days')  as r7,
           count(*) filter (where v.created_at >= now() - interval '30 days') as r30
    from public.v_record_creati v
    where v.created_at is not null
      and v.created_at >= now() - interval '30 days'
    group by v.utente;
end;
$$;

grant execute on function public.supervisore_record_finestre() to authenticated;
