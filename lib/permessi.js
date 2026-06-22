// Sistema permessi granulari per Collaboratori (ruolo 'staff' invitato con permessi specifici).
// L'allenatore principale (ruolo 'allenatore') ha sempre accesso completo a tutto:
// i permessi si applicano SOLO a chi è stato invitato come collaboratore.
//
// Ogni modulo può essere: 'nessuno' | 'visualizza' | 'modifica'
// 'modifica' implica anche 'visualizza'.

export const MODULI_PERMESSI = {
  portieri:    { label: 'Portieri' },
  allenamenti: { label: 'Allenamenti / Calendario' },
  partite:     { label: 'Partite' },
  statistiche: { label: 'Statistiche' },
}

export const LIVELLI = [
  { v: 'nessuno', label: 'Nessun accesso' },
  { v: 'visualizza', label: 'Solo visualizza' },
  { v: 'modifica', label: 'Visualizza e modifica' },
]

// Permessi di default per un nuovo invito collaboratore: accesso completo a tutto,
// così il comportamento di default resta quello "storico" (collaboratore = accesso pieno)
// finché l'allenatore non restringe esplicitamente qualcosa.
export function permessiDiDefault() {
  const out = {}
  for (const k of Object.keys(MODULI_PERMESSI)) out[k] = 'modifica'
  return out
}

/**
 * Calcola i permessi effettivi di un utente per un modulo.
 * - allenatore principale (ruolo 'allenatore'): sempre 'modifica' (accesso pieno, non soggetto a restrizioni)
 * - staff/collaboratore (ruolo 'staff'): legge permessi_collaboratore dal profilo; se mancante, usa default pieno
 * - chiunque altro (portiere, non loggato): 'nessuno'
 */
export function permessoModulo({ ruolo, permessiCollaboratore }, modulo) {
  if (ruolo === 'allenatore') return 'modifica'
  if (ruolo === 'staff') {
    const valore = permessiCollaboratore?.[modulo]
    if (valore === 'modifica' || valore === 'visualizza' || valore === 'nessuno') return valore
    return 'modifica' // retrocompatibilità: collaboratori invitati prima di questo sistema restano con accesso pieno
  }
  return 'nessuno'
}

export function puoVisualizzare(ctx, modulo) {
  const p = permessoModulo(ctx, modulo)
  return p === 'visualizza' || p === 'modifica'
}

export function puoModificare(ctx, modulo) {
  return permessoModulo(ctx, modulo) === 'modifica'
}
