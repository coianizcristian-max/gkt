// Carica le traduzioni di una tabella/lingua e ritorna un helper `tr(rigaId, campo)`.
// Uso:  const tr = await caricaTraduzioni(supabase, 'sito_sezioni', ids, locale)
//       const titolo = tr(riga.id, 'titolo') ?? riga.titolo   // fallback all'italiano
// Per l'italiano (o lista vuota) ritorna sempre undefined -> resta il testo IT originale.
export async function caricaTraduzioni(supabase, tabella, righeIds, lingua) {
  if (lingua === 'it' || !righeIds || righeIds.length === 0) return () => undefined
  const { data } = await supabase
    .from('contenuti_traduzioni')
    .select('riga_id, campo, testo')
    .eq('tabella', tabella)
    .eq('lingua', lingua)
    .in('riga_id', righeIds)
  const map = new Map()
  for (const r of (data ?? [])) if (r.testo) map.set(`${r.riga_id}:${r.campo}`, r.testo)
  return (rigaId, campo) => map.get(`${rigaId}:${campo}`)
}
