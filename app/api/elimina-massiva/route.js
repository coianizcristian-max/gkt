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

    const ownerId = await getOwnerId(supabase, user.id)

    const { data: stagione } = await supabase
      .from('stagioni').select('id').eq('id', stagioneId).eq('owner_id', ownerId).maybeSingle()

    if (!stagione) {
      return NextResponse.json({ error: 'Stagione non trovata.' }, { status: 403 })
    }

    if (tipo === 'allenamenti') {
      // Carica allenamenti nel range con il campo nessuna_valutazione
      let q = supabase.from('allenamenti')
        .select('id, nessuna_valutazione')
        .eq('stagione_id', stagioneId)
        .gte('data', dal)
        .lte('data', al)
      if (categoriaId && categoriaId !== 'tutte') q = q.eq('squadra_id', categoriaId)
      const { data: rows, error: selErr } = await q
      if (selErr) throw selErr
      if (!rows || rows.length === 0) return NextResponse.json({ eliminati: 0 })

      let ids = rows.map((r) => r.id)

      if (filtroVal === 'senza' || filtroVal === 'con') {
        // Carica quali allenamenti hanno almeno una valutazione inserita
        const { data: valRows } = await supabase
          .from('valutazioni')
          .select('allenamento_id')
          .in('allenamento_id', ids)

        const conValutazioni = new Set((valRows ?? []).map((v) => v.allenamento_id))

        // "Valutato" = ha righe in valutazioni OPPURE ha il flag nessuna_valutazione=true
        // "Senza valutazioni" = non ha righe in valutazioni E non ha il flag nessuna_valutazione
        if (filtroVal === 'senza') {
          ids = ids.filter((id) => {
            const row = rows.find(r => r.id === id)
            return !conValutazioni.has(id) && !row?.nessuna_valutazione
          })
        } else {
          ids = ids.filter((id) => {
            const row = rows.find(r => r.id === id)
            return conValutazioni.has(id) || row?.nessuna_valutazione
          })
        }
      }

      if (!ids.length) return NextResponse.json({ eliminati: 0 })

      const { error: delErr } = await supabase.from('allenamenti').delete().in('id', ids)
      if (delErr) throw delErr
      return NextResponse.json({ eliminati: ids.length })

    } else {
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

      if (filtroVal === 'senza' || filtroVal === 'con') {
        const { data: valRows } = await supabase
          .from('valutazioni_partita')
          .select('partita_id')
          .in('partita_id', ids)

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
