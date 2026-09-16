// ---------------------------------------------------------------------------
// GKSeason — voci degli elenchi di sistema (tabella `elenco_voci`).
//
// ATTENZIONE alla natura del dato: la tipologia NON e' una chiave esterna.
// Su `esercizi.tipologia` (e su `esercizi.tipologie`) e' salvato il TESTO
// italiano. Quindi:
//   - il valore italiano resta il dato: filtri, raggruppamenti, confronti e
//     salvataggi continuano a lavorare su quello;
//   - la traduzione si applica SOLO al momento di mostrarlo a schermo.
// Invertire questi due piani romperebbe filtri e raggruppamenti (stessa
// lezione imparata col prefisso RPE dei parametri di valutazione).
//
// Perche' un dizionario nel codice e non `contenuti_traduzioni`: le voci di
// sistema sono poche e stabili, e vengono mostrate in una dozzina di punti,
// molti dei quali client component. Un dizionario sincrono evita una query in
// piu' ovunque. Le voci aggiunte dagli allenatori non sono qui e restano nella
// lingua in cui le hanno scritte — che e' il comportamento giusto: sono roba
// loro, non etichette di sistema.
// ---------------------------------------------------------------------------

const TIPOLOGIE_ESERCIZIO = {
  'Tecnica di base': { en: 'Basic technique', de: 'Grundtechnik', es: 'Técnica de base' },
  'Presa': { en: 'Catching', de: 'Fangen', es: 'Blocaje' },
  'Tuffi': { en: 'Diving', de: 'Hechten', es: 'Estiradas' },
  'Uscite alte': { en: 'High claims', de: 'Hohes Herauslaufen', es: 'Salidas altas' },
  'Uscite basse': { en: 'Low claims', de: 'Tiefes Herauslaufen', es: 'Salidas bajas' },
  'Gioco con i piedi': { en: 'Play with the feet', de: 'Spiel mit dem Fuß', es: 'Juego con los pies' },
  'Posizionamento': { en: 'Positioning', de: 'Stellungsspiel', es: 'Colocación' },
  'Reattivita / Riflessi': { en: 'Reactions / reflexes', de: 'Reaktion / Reflexe', es: 'Reactividad / reflejos' },
  'Fisico / Atletico': { en: 'Physical / athletic', de: 'Physis / Athletik', es: 'Físico / atlético' },
  'RIscaldamento': { en: 'Warm-up', de: 'Aufwärmen', es: 'Calentamiento' },
  'Forza': { en: 'Strength', de: 'Kraft', es: 'Fuerza' },
  'Pliometria': { en: 'Plyometrics', de: 'Plyometrie', es: 'Pliometría' },
  'Bande': { en: 'Resistance bands', de: 'Widerstandsbänder', es: 'Bandas elásticas' },
}

const PIEDE = {
  'Destro': { en: 'Right', de: 'Rechts', es: 'Derecho' },
  'Sinistro': { en: 'Left', de: 'Links', es: 'Izquierdo' },
  'Ambidestro': { en: 'Two-footed', de: 'Beidfüßig', es: 'Ambidiestro' },
}

const ELENCHI = {
  tipologie_esercizio: TIPOLOGIE_ESERCIZIO,
  piede: PIEDE,
}

/**
 * Traduce UNA voce per la sola visualizzazione.
 * Sconosciuta (es. aggiunta da un allenatore) o lingua italiana -> torna
 * il valore originale. Non lancia mai.
 */
export function vocetradotta(elenco, valore, lingua) {
  if (!valore || lingua === 'it') return valore
  const dict = ELENCHI[elenco]
  const voce = dict && dict[valore]
  return (voce && voce[lingua]) || valore
}

/** Scorciatoia per l'elenco usato ovunque: le tipologie di esercizio. */
export function tipologiaTradotta(valore, lingua) {
  return vocetradotta('tipologie_esercizio', valore, lingua)
}

/**
 * Per i menu a tendina e le liste di filtri: traduce l'ETICHETTA ma conserva
 * il valore italiano, che e' quello che va salvato e confrontato.
 * Ritorna [{ valore, etichetta }].
 */
export function opzioniElenco(elenco, valori, lingua) {
  return (valori ?? []).map((v) => ({
    valore: v,
    etichetta: vocetradotta(elenco, v, lingua),
  }))
}

/** Piede preferito: come sopra, si traduce solo l'etichetta mostrata. */
export function piedeTradotto(valore, lingua) {
  return vocetradotta('piede', valore, lingua)
}
