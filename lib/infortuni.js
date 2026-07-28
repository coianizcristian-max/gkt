// Conta, per ciascun portiere, quanti allenamenti cadono in un periodo di
// infortunio (D >= data_inizio AND (data_fine IS NULL OR data_fine >= D)),
// limitato agli allenamenti della squadra in cui il portiere è iscritto.
//
// client        : un client Supabase (RLS utente o admin service-role)
// stagioneId    : id della stagione
// allenamenti   : array di { id, data, squadra_id }
// ritorna       : { [portiere_id]: numeroAllenamentiPersiPerInfortunio }
export async function infortuniPerPortiere(client, stagioneId, allenamenti) {
  const conteggio = {}
  if (!allenamenti || !allenamenti.length) return conteggio

  const { data: iscr } = await client
    .from('iscrizioni')
    .select('id, portiere_id, squadra_id')
    .eq('stagione_id', stagioneId)
  const lista = iscr ?? []
  if (!lista.length) return conteggio

  const { data: inf } = await client
    .from('infortuni')
    .select('iscrizione_id, data_inizio, data_fine')
    .in('iscrizione_id', lista.map((i) => i.id))
  if (!inf || !inf.length) return conteggio

  const infByIscr = {}
  for (const x of inf) (infByIscr[x.iscrizione_id] ??= []).push(x)

  for (const i of lista) {
    const win = infByIscr[i.id]
    if (!win) continue
    let n = 0
    for (const a of allenamenti) {
      if (a.squadra_id !== i.squadra_id || !a.data) continue
      const d = a.data
      if (win.some((w) => w.data_inizio <= d && (w.data_fine == null || w.data_fine >= d))) n++
    }
    if (n) conteggio[i.portiere_id] = (conteggio[i.portiere_id] ?? 0) + n
  }
  return conteggio
}
