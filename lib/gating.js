// Mappa di tutte le funzionalità soggette a gating.
// chiave → { label, defaultFree }
export const FUNZIONALITA = {
  valutazioni_allenamento: { label: 'Valutazioni allenamento (inserimento/modifica)', defaultFree: true },
  valutazioni_partita:     { label: 'Valutazioni partita (inserimento/modifica)',    defaultFree: true },
  esercizi_allenamento:    { label: 'Esercizi negli allenamenti',                     defaultFree: true },
  statistiche_dettaglio:   { label: 'Statistiche dettaglio portiere (per-mese, per-caratteristica)', defaultFree: false },
  obiettivi_portieri:      { label: 'Obiettivi portieri',                             defaultFree: false },
  ricorrenze_genera:       { label: 'Generazione automatica ricorrenze',              defaultFree: false },
  feedback_allenatore:     { label: 'Tab feedback portieri (lato allenatore)',        defaultFree: false },
  inviti_creazione:        { label: 'Creazione link di invito',                      defaultFree: true },
  profilo_ricerca:         { label: 'Profilo allenatore nella ricerca pubblica',     defaultFree: false },
}

/**
 * Lato server: restituisce { tuttoFree, config }
 * config = { chiave: boolean (true = free/sbloccato) }
 */
export async function getGatingConfig(supabase) {
  const { data } = await supabase.from('funzionalita_config').select('chiave, free')
  const rows = data ?? []
  const tuttoFreeRow = rows.find((r) => r.chiave === '__tutto_free')
  const tuttoFree = tuttoFreeRow?.free ?? false

  const config = {}
  for (const [k, def] of Object.entries(FUNZIONALITA)) {
    const row = rows.find((r) => r.chiave === k)
    config[k] = row ? row.free : def.defaultFree
  }
  return { tuttoFree, config }
}

/**
 * Lato server: controlla se un allenatore ha un abbonamento attivo.
 * Restituisce true se ha accesso (abbonamento attivo o lifetime).
 */
export async function hasAbbonamento(supabase, userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('abbonamenti')
    .select('piano, stato, scadenza')
    .eq('allenatore_id', userId)
    .eq('stato', 'attivo')
    .maybeSingle()
  if (!data) return false
  if (data.piano === 'lifetime') return true
  if (!data.scadenza) return false
  return new Date(data.scadenza) > new Date()
}

/**
 * Determina se una funzionalità è accessibile.
 * Restituisce true se sbloccata.
 */
export function isUnlocked(chiave, { tuttoFree, config }, abbonamentoAttivo) {
  if (tuttoFree) return true
  if (config[chiave]) return true // impostata come free
  return abbonamentoAttivo
}
