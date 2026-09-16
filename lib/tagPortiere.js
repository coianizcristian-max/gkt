// Etichette dei tag portiere.
// I valori restano in ITALIANO nel DB (tabella portiere_tag): qui si traduce
// solo cio' che si vede. La mappa e' condivisa fra TagManager (dove si
// assegnano) e PortieriSearch (dove si mostrano nella lista), per non avere
// due elenchi che divergono.
export const TAG_LABEL_KEY = {
  'Capitano': 'tag_capitano',
  'Talento': 'tag_talento',
  'Leader': 'tag_leader',
  'Da osservare': 'tag_daOsservare',
  'Recupero infortunio': 'tag_recuperoInfortunio',
  'Infortunato': 'tag_infortunato',
}

/** t = useTranslations('tagManager'). Tag sconosciuto -> valore originale. */
export function etichettaTag(tag, t) {
  const k = TAG_LABEL_KEY[tag]
  return k ? t(k) : tag
}
