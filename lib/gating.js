// Mappa di tutte le funzionalità soggette a gating.
// chiave → { label, defaultFree }
import { getOwnerId } from './tenant'

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

  // L'abbonamento è legato all'allenatore titolare: un collaboratore/portiere
  // deve ereditare il piano del proprio allenatore principale, non avere il proprio.
  const ownerId = await getOwnerId(supabase, userId)

  // Controlla abbonamento Stripe
  const { data } = await supabase
    .from('abbonamenti')
    .select('piano, stato, scadenza')
    .eq('allenatore_id', ownerId ?? userId)
    .in('stato', ['attivo', 'disdetto'])  // disdetto = attivo fino a scadenza
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  if (data) {
    if (data.piano === 'lifetime' && data.stato === 'attivo') return true
    if (data.scadenza && new Date(data.scadenza) > new Date()) return true
  }

  // Controlla coupon attivo (personale: resta legato a chi lo ha effettivamente riscattato)
  const { data: coupon } = await supabase
    .from('coupon_utilizzi')
    .select('scade_il')
    .eq('utente_id', userId)
    .gt('scade_il', new Date().toISOString())
    .limit(1).maybeSingle()
  if (coupon) return true

  return false
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
