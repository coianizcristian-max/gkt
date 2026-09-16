// ---------------------------------------------------------------------------
// GKSeason — parametri di valutazione nella lingua dell'utente.
//
// `parametri_valutazione` e' una tabella GLOBALE (uguale per tutti gli
// allenatori: in `allenatore_parametri` ognuno sceglie solo quali attivare).
// I nomi sono quindi etichette di sistema, non dati dell'utente, e vanno
// tradotti come il resto dell'interfaccia — ma vivono a DB, quindi passano da
// `contenuti_traduzioni` e non dai dizionari messages/*.json.
//
// Ritorna la stessa forma di una query Supabase ({ data, error }) apposta:
// nei Promise.all esistenti basta sostituire la query con questa chiamata,
// senza toccare la destrutturazione.
//
// In italiano, senza traduzioni a DB o in caso di errore si ottengono i nomi
// originali: mai una riga vuota.
// ---------------------------------------------------------------------------

import { caricaTraduzioni } from './traduzioni'

/** Applica le traduzioni a un elenco gia' caricato di { id, nome, ... }. */
export async function traduciParametri(supabase, righe, lingua) {
  const elenco = righe ?? []
  if (lingua === 'it' || elenco.length === 0) return elenco
  try {
    const tr = await caricaTraduzioni(
      supabase,
      'parametri_valutazione',
      elenco.map((r) => r.id),
      lingua
    )
    return elenco.map((r) => ({ ...r, nome: tr(r.id, 'nome') ?? r.nome }))
  } catch {
    return elenco // qualunque problema: restano i nomi italiani
  }
}

/**
 * Sostituto di:
 *   supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine')
 * Uso:
 *   const [{ data: par }] = await Promise.all([ caricaParametri(supabase, locale), ... ])
 */
export async function caricaParametri(supabase, lingua) {
  const { data, error } = await supabase
    .from('parametri_valutazione')
    .select('id, nome, ordine')
    .eq('attivo', true)
    .order('ordine')
  return { data: await traduciParametri(supabase, data, lingua), error }
}
