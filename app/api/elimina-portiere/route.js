import { NextResponse } from 'next/server'
import { tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

// Toglie un portiere da UNA stagione (elimina la sua iscrizione a quella stagione).
// Se era la sua UNICA stagione, elimina anche il portiere e tutti i suoi dati,
// in modo ATOMICO tramite la funzione DB elimina_portiere_completo (o tutto o niente).
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato') }, { status: 401 })

    const ownerId = await getOwnerId(supabase, user.id)
    if (!ownerId) return NextResponse.json({ error: tApi(request, 'Non autorizzato') }, { status: 403 })

    const { portiereId, stagioneId, azione } = await request.json()
    if (!portiereId || !stagioneId) return NextResponse.json({ error: tApi(request, 'Parametri mancanti') }, { status: 400 })

    // Il portiere deve appartenere a questo tenant.
    const { data: portiere } = await supabase
      .from('portieri').select('id, nome, cognome, allenatore_id').eq('id', portiereId).maybeSingle()
    if (!portiere) return NextResponse.json({ error: tApi(request, 'Portiere non trovato') }, { status: 404 })
    if (portiere.allenatore_id && portiere.allenatore_id !== ownerId) {
      return NextResponse.json({ error: tApi(request, 'Portiere non tuo') }, { status: 403 })
    }

    // La stagione deve appartenere a questo tenant.
    const { data: stagione } = await supabase
      .from('stagioni').select('id, owner_id').eq('id', stagioneId).eq('owner_id', ownerId).maybeSingle()
    if (!stagione) return NextResponse.json({ error: tApi(request, 'Stagione non trovata o non tua') }, { status: 404 })

    // Quante ALTRE stagioni ha (diverse da questa).
    const { count: altre } = await supabase
      .from('iscrizioni').select('id', { count: 'exact', head: true })
      .eq('portiere_id', portiereId).neq('stagione_id', stagioneId)
    const altreStagioni = altre ?? 0

    if (azione === 'anteprima') {
      return NextResponse.json({
        nome: `${portiere.nome ?? ''} ${portiere.cognome ?? ''}`.trim(),
        altreStagioni,
      })
    }

    if (azione === 'elimina') {
      // 1) Togli da QUESTA stagione.
      const { error: iErr } = await supabase.from('iscrizioni').delete()
        .eq('portiere_id', portiereId).eq('stagione_id', stagioneId)
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

      // 2) Se non ha altre stagioni, elimina tutto (atomico, lato DB).
      if (altreStagioni === 0) {
        const { error: rpcErr } = await supabase.rpc('elimina_portiere_completo', {
          p_id: portiereId, p_owner: ownerId,
        })
        if (rpcErr) {
          // La iscrizione è già stata tolta; la cancellazione completa è atomica e
          // NON è avvenuta (rollback). Segnaliamo l'errore così si può correggere.
          return NextResponse.json({ error: rpcErr.message, rimossoDaStagione: true }, { status: 500 })
        }
        return NextResponse.json({ ok: true, eliminatoCompleto: true })
      }

      return NextResponse.json({ ok: true, eliminatoCompleto: false })
    }

    return NextResponse.json({ error: tApi(request, 'Azione non valida') }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Errore imprevisto' }, { status: 500 })
  }
}
