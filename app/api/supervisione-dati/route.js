import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/supervisione-dati?tipo=preview_allenamenti&ids=xxx,yyy&preparatore_id=zzz
// GET /api/supervisione-dati?tipo=preview_partite&ids=xxx,yyy&preparatore_id=zzz
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const preparatoreId = searchParams.get('preparatore_id')
    const idsRaw = searchParams.get('ids')

    if (!tipo || !preparatoreId || !idsRaw) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const ids = idsRaw.split(',').filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ data: {} })

    // Verifica autenticazione e relazione supervisore→preparatore
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const admin = getAdmin()

    const { data: rel } = await admin
      .from('relazioni_supervisione')
      .select('id')
      .eq('supervisore_id', user.id)
      .eq('preparatore_id', preparatoreId)
      .eq('attivo', true)
      .maybeSingle()

    if (!rel) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    // ── Preview allenamenti ───────────────────────────────────────────────
    if (tipo === 'preview_allenamenti') {
      const [{ data: ae }, { data: allRows }] = await Promise.all([
        admin.from('allenamento_esercizi')
          .select('allenamento_id, ordine, esercizi(id, titolo, tipologia, durata_minuti, recupero_minuti)')
          .in('allenamento_id', ids)
          .order('ordine'),
        admin.from('allenamenti')
          .select('id, obiettivi, consuntivo')
          .in('id', ids),
      ])

      const byAll = {}
      for (const r of (ae ?? [])) {
        if (!byAll[r.allenamento_id]) byAll[r.allenamento_id] = []
        if (r.esercizi) byAll[r.allenamento_id].push(r.esercizi)
      }
      const allMap = {}
      for (const a of (allRows ?? [])) allMap[a.id] = a

      const data = {}
      for (const id of ids) {
        const esercizi = byAll[id] ?? []
        data[id] = {
          esercizi,
          obiettivi: allMap[id]?.obiettivi ?? null,
          consuntivo: allMap[id]?.consuntivo ?? null,
          totaleMinuti: esercizi.reduce((tot, e) => tot + (parseFloat(e.durata_minuti) || 0) + (parseFloat(e.recupero_minuti) || 0), 0),
        }
      }
      return NextResponse.json({ data })
    }

    // ── Preview partite ───────────────────────────────────────────────────
    if (tipo === 'preview_partite') {
      const { data: vp } = await admin
        .from('valutazioni_partita')
        .select('partita_id, voto, presente, portieri(nome, cognome)')
        .in('partita_id', ids)
        .eq('presente', true)
        .order('voto', { ascending: false })

      const byPart = {}
      for (const v of (vp ?? [])) {
        if (!byPart[v.partita_id]) byPart[v.partita_id] = []
        byPart[v.partita_id].push(v)
      }

      const data = {}
      for (const id of ids) data[id] = byPart[id] ?? []
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Tipo non riconosciuto' }, { status: 400 })

  } catch (err) {
    console.error('supervisione-dati:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
