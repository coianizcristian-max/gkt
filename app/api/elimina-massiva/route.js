import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

export async function POST(request) {
  try {
    const { tipo, dal, al, categoriaId, stagioneId, filtroVal } = await request.json()

    if (!tipo || !dal || !al || !stagioneId)
      return NextResponse.json({ error: 'Parametri mancanti.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

    const ownerId = await getOwnerId(supabase, user.id)
    const { data: stagione } = await supabase
      .from('stagioni').select('id').eq('id', stagioneId).eq('owner_id', ownerId).maybeSingle()
    if (!stagione) return NextResponse.json({ error: 'Stagione non trovata.', ownerId, stagioneId }, { status: 403 })

    // Step 1: trova allenamenti nel range
    let q = supabase.from('allenamenti')
      .select('id, nessuna_valutazione')
      .eq('stagione_id', stagioneId)
      .gte('data', dal)
      .lte('data', al)
    if (categoriaId && categoriaId !== 'tutte') q = q.eq('squadra_id', categoriaId)
    const { data: rows, error: selErr } = await q
    if (selErr) return NextResponse.json({ error: 'Query allenamenti: ' + selErr.message }, { status: 500 })

    const totaleRighe = rows?.length ?? 0
    if (!rows || rows.length === 0) return NextResponse.json({ eliminati: 0, debug: { totaleRighe } })

    let ids = rows.map(r => r.id)
    const rowMap = Object.fromEntries(rows.map(r => [r.id, r]))

    // Step 2: filtro valutazioni
    let conVoto = new Set()
    let valErr = null
    let valCount = 0

    if (filtroVal === 'senza' || filtroVal === 'con') {
      const { data: vrows, error: ve } = await supabase
        .from('valutazioni')
        .select('allenamento_id')
        .not('voto', 'is', null)
        .in('allenamento_id', ids)
      valErr = ve?.message ?? null
      valCount = vrows?.length ?? 0
      conVoto = new Set((vrows ?? []).map(r => r.allenamento_id))

      if (filtroVal === 'senza') {
        ids = ids.filter(id => !conVoto.has(id) && !rowMap[id]?.nessuna_valutazione)
      } else {
        ids = ids.filter(id => conVoto.has(id) || !!rowMap[id]?.nessuna_valutazione)
      }
    }

    const debug = {
      totaleRighe,
      idsDopofiltro: ids.length,
      filtroVal,
      valErr,
      valCount,
      conVotoSize: conVoto.size,
      campioneSenzaFlag: rows.filter(r => !r.nessuna_valutazione).length,
      campioneConFlag: rows.filter(r => r.nessuna_valutazione).length,
    }

    if (!ids.length) return NextResponse.json({ eliminati: 0, debug })

    const { error: delErr } = await supabase.from('allenamenti').delete().in('id', ids)
    if (delErr) return NextResponse.json({ error: 'Delete: ' + delErr.message, debug }, { status: 500 })

    return NextResponse.json({ eliminati: ids.length, debug })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
