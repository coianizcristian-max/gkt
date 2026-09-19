// Dati del "Confronto portieri" calcolati sul server.
//
// Serve in MODALITA' DEMO: ConfrontoPortieri di norma legge dal browser con la
// sessione dell'utente (rpc presenze_confronto + tabelle). In demo quella
// sessione e' l'ospite, che non vede i dati dell'account demo (RLS), e in piu'
// la rpc passa da una POST che DemoGuardia blocca: risultato "Nessun dato" e
// l'avviso "salvataggio disabilitato". Qui gli stessi dati si leggono con il
// lettore demo in sola lettura, rispettando la data di taglio (oggi).
//
// Presenze = valutazioni con presente = true, raggruppate per portiere,
// categoria dell'allenamento e mese: stesso criterio delle statistiche.
import { caricaParametri } from '@/lib/parametri'

async function inBlocchi(ids, carica, blocco = 500) {
  let tutti = []
  for (let i = 0; i < ids.length; i += blocco) {
    const { data } = await carica(ids.slice(i, i + blocco))
    tutti = tutti.concat(data ?? [])
  }
  return tutti
}

export async function datiConfrontoServer(db, stagioneId, oggi, locale) {
  const [{ data: allen }, par] = await Promise.all([
    db.from('allenamenti').select('id, squadra_id, data').eq('stagione_id', stagioneId).lte('data', oggi),
    caricaParametri(db, locale),
  ])
  const allenamenti = allen ?? []
  const allenIds = allenamenti.map((a) => a.id)
  const perId = new Map(allenamenti.map((a) => [a.id, a]))

  const vals = allenIds.length
    ? await inBlocchi(allenIds, (ids) => db.from('valutazioni')
      .select('id, portiere_id, voto, presente, allenamento_id').in('allenamento_id', ids), 200)
    : []
  const punteggi = vals.length
    ? await inBlocchi(vals.map((v) => v.id), (ids) => db.from('valutazione_punteggi')
      .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', ids), 200)
    : []

  const portIds = [...new Set(vals.map((v) => v.portiere_id))]
  const squadIds = [...new Set(allenamenti.map((a) => a.squadra_id).filter(Boolean))]
  const [portieri, squadre] = await Promise.all([
    portIds.length ? inBlocchi(portIds, (ids) => db.from('portieri').select('id, nome, cognome').in('id', ids)) : [],
    squadIds.length ? inBlocchi(squadIds, (ids) => db.from('squadre').select('id, nome').in('id', ids)) : [],
  ])
  const portiere = new Map(portieri.map((p) => [p.id, p]))
  const squadraNome = new Map(squadre.map((s) => [s.id, s.nome]))

  // Righe nello stesso formato della rpc presenze_confronto
  const agg = new Map()
  for (const v of vals) {
    if (!v.presente) continue
    const a = perId.get(v.allenamento_id)
    if (!a) continue
    const mese = `${String(a.data).slice(0, 7)}-01`
    const k = `${v.portiere_id}|${a.squadra_id}|${mese}`
    if (!agg.has(k)) {
      const p = portiere.get(v.portiere_id) ?? {}
      agg.set(k, {
        portiere_id: v.portiere_id, nome: p.nome ?? null, cognome: p.cognome ?? null,
        squadra_id: a.squadra_id, squadra_nome: squadraNome.get(a.squadra_id) ?? null,
        mese, presenze: 0,
      })
    }
    agg.get(k).presenze += 1
  }

  return {
    rows: [...agg.values()],
    allen: allenamenti.map((a) => ({ id: a.id, squadra_id: a.squadra_id })),
    vals,
    punteggi,
    parametri: par?.data ?? [],
  }
}
