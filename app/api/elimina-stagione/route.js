import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

// Elimina DEFINITIVAMENTE una stagione e tutto quello che contiene.
// Regola non negoziabile di questo file: ogni singola query di eliminazione
// DEVE avere un filtro esplicito legato a questa specifica stagione (per id
// diretto, o per gli id di allenamenti/partite di QUESTA stagione raccolti
// prima). Mai una .delete() senza .eq()/.in() — è la garanzia che un errore
// qui non possa mai toccare dati di un'altra stagione o di un altro utente.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const ownerId = await getOwnerId(supabase, user.id)
    if (!ownerId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    const body = await request.json()
    const { stagioneId, azione, nomeConferma } = body
    if (!stagioneId || typeof stagioneId !== 'string') {
      return NextResponse.json({ error: 'ID stagione mancante' }, { status: 400 })
    }

    // Verifica che la stagione esista e appartenga davvero a chi sta chiedendo.
    // Da qui in poi ogni query usa SEMPRE stagioneId, mai un valore diverso.
    const { data: stagione, error: stErr } = await supabase
      .from('stagioni').select('id, nome, owner_id').eq('id', stagioneId).eq('owner_id', ownerId).maybeSingle()
    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 })
    if (!stagione) return NextResponse.json({ error: 'Stagione non trovata o non tua' }, { status: 404 })

    const { data: allIdsRows } = await supabase.from('allenamenti').select('id').eq('stagione_id', stagioneId)
    const { data: parIdsRows } = await supabase.from('partite').select('id').eq('stagione_id', stagioneId)
    const idsAllenamenti = (allIdsRows ?? []).map((r) => r.id)
    const idsPartite = (parIdsRows ?? []).map((r) => r.id)

    // ── Solo anteprima: conta cosa c'è, senza toccare nulla ──────────────────
    if (azione === 'anteprima') {
      const [partite, iscrizioni, ricorrenzeAll, ricorrenzePar, categorie, reportCommenti] = await Promise.all([
        supabase.from('partite').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
        supabase.from('iscrizioni').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
        supabase.from('ricorrenze_stagionali').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
        supabase.from('ricorrenze_partite_stagionali').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
        supabase.from('stagione_categorie').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
        supabase.from('report_commenti').select('id', { count: 'exact', head: true }).eq('stagione_id', stagioneId),
      ])

      const valutazioni = idsAllenamenti.length
        ? await supabase.from('valutazioni').select('id', { count: 'exact', head: true }).in('allenamento_id', idsAllenamenti)
        : { count: 0 }
      const valutazioniPartita = idsPartite.length
        ? await supabase.from('valutazioni_partita').select('id', { count: 'exact', head: true }).in('partita_id', idsPartite)
        : { count: 0 }

      return NextResponse.json({
        nome: stagione.nome,
        conteggi: {
          allenamenti: idsAllenamenti.length,
          partite: idsPartite.length,
          valutazioniAllenamento: valutazioni.count ?? 0,
          valutazioniPartita: valutazioniPartita.count ?? 0,
          iscrizioni: iscrizioni.count ?? 0,
          ricorrenze: (ricorrenzeAll.count ?? 0) + (ricorrenzePar.count ?? 0),
          categorieAttivate: categorie.count ?? 0,
          commentiReport: reportCommenti.count ?? 0,
        },
      })
    }

    // ── Eliminazione vera e propria ──────────────────────────────────────────
    if (azione === 'elimina') {
      if (!nomeConferma || nomeConferma.trim() !== stagione.nome) {
        return NextResponse.json({ error: 'Il nome digitato non corrisponde esattamente al nome della stagione.' }, { status: 400 })
      }

      // Ordine: prima le tabelle "foglia" collegate ad allenamenti/partite di
      // QUESTA stagione, poi le tabelle collegate direttamente alla stagione,
      // infine la stagione stessa. Ogni riga sotto ha il proprio filtro esplicito.
      if (idsAllenamenti.length) {
        await supabase.from('valutazioni').delete().in('allenamento_id', idsAllenamenti)
        await supabase.from('allenamento_esercizi').delete().in('allenamento_id', idsAllenamenti)
      }
      if (idsPartite.length) {
        await supabase.from('valutazioni_partita').delete().in('partita_id', idsPartite)
      }

      await supabase.from('report_commenti').delete().eq('stagione_id', stagioneId)
      await supabase.from('allenamenti').delete().eq('stagione_id', stagioneId)
      await supabase.from('partite').delete().eq('stagione_id', stagioneId)
      await supabase.from('iscrizioni').delete().eq('stagione_id', stagioneId)
      await supabase.from('ricorrenze_stagionali').delete().eq('stagione_id', stagioneId)
      await supabase.from('ricorrenze_partite_stagionali').delete().eq('stagione_id', stagioneId)
      await supabase.from('stagione_categorie').delete().eq('stagione_id', stagioneId)

      // Se qualcuno la aveva impostata come "corrente", sgancia il puntatore
      // prima di eliminarla (altrimenti resterebbe un riferimento a un id inesistente)
      await supabase.from('profili').update({ stagione_corrente_id: null }).eq('stagione_corrente_id', stagioneId)

      const { error: delErr } = await supabase.from('stagioni').delete().eq('id', stagioneId).eq('owner_id', ownerId)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Errore imprevisto' }, { status: 500 })
  }
}
