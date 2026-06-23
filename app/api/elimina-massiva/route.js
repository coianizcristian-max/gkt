import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

export async function POST(request) {
  try {
    const { tipo, dal, al, categoriaId, stagioneId, filtroVal } = await request.json()

    if (!tipo || !dal || !al || !stagioneId) {
      return NextResponse.json({ error: 'Parametri mancanti.' }, { status: 400 })
    }
    if (!['allenamenti', 'partite'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo non valido.' }, { status: 400 })
    }
    if (dal > al) {
      return NextResponse.json({ error: 'Data "dal" successiva alla data "al".' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

    // Verifica che la stagione appartenga all'owner
    const ownerId = await getOwnerId(supabase, user.id)
    const { data: stagione } = await supabase
      .from('stagioni').select('id').eq('id', stagioneId).eq('owner_id', ownerId).maybeSingle()
    if (!stagione) return NextResponse.json({ error: 'Stagione non trovata.' }, { status: 403 })

    if (tipo === 'allenamenti') {
      // Leggo gli allenamenti nel range
      let q = supabase.from('allenamenti')
        .select('id')
        .eq('stagione_id', stagioneId)
        .gte('data', dal)
        .lte('data', al)
      if (categoriaId && categoriaId !== 'tutte') q = q.eq('squadra_id', categoriaId)
      const { data: rows, error: selErr } = await q
      if (selErr) throw selErr
      if (!rows || rows.length === 0) return NextResponse.json({ eliminati: 0 })

      let ids = rows.map((r) => r.id)

      // Filtro valutazioni: cerco quali allenamenti hanno almeno una valutazione
      if (filtroVal === 'senza' || filtroVal === 'con') {
        const { data: valRows, error: valErr } = await supabase
          .from('valutazioni_allenamento')
          .select('allenamento_id')
          .in('allenamento_id', ids)
        if (valErr) throw valErr

        const conVal = new Set((valRows ?? []).map((v) => v.allenamento_id))

        if (filtroVal === 'senza') {
          // Tieni solo quelli che NON hanno valutazioni
          ids = ids.filter((id) => !conVal.has(id))
        } else {
          // Tieni solo quelli che HANNO valutazioni
          ids = ids.filter((id) => conVal.has(id))
        }
      }

      if (!ids.length) return NextResponse.json({ eliminati: 0 })

      const { error: delErr } = await supabase.from('allenamenti').delete().in('id', ids)
      if (delErr) throw delErr
      return NextResponse.json({ eliminati: ids.length })

    } else {
      // partite
      let q = supabase.from('partite')
        .select('id')
        .eq('stagione_id', stagioneId)
        .gte('data', dal)
        .lte('data', al)
      if (categoriaId && categoriaId !== 'tutte') q = q.eq('squadra_id', categoriaId)
      const { data: rows, error: selErr } = await q
      if (selErr) throw selErr
      if (!rows || rows.length === 0) return NextResponse.json({ eliminati: 0 })

      let ids = rows.map((r) => r.id)

      // Filtro valutazioni partite
      if (filtroVal === 'senza' || filtroVal === 'con') {
        const { data: valRows, error: valErr } = await supabase
          .from('valutazioni_partita')
          .select('partita_id')
          .in('partita_id', ids)
        if (valErr) throw valErr

        const conVal = new Set((valRows ?? []).map((v) => v.partita_id))

        if (filtroVal === 'senza') {
          ids = ids.filter((id) => !conVal.has(id))
        } else {
          ids = ids.filter((id) => conVal.has(id))
        }
      }

      if (!ids.length) return NextResponse.json({ eliminati: 0 })

      const { error: delErr } = await supabase.from('partite').delete().in('id', ids)
      if (delErr) throw delErr
      return NextResponse.json({ eliminati: ids.length })
    }

  } catch (err) {
    console.error('elimina-massiva error:', err)
    return NextResponse.json({ error: err.message ?? 'Errore server.' }, { status: 500 })
  }
}
