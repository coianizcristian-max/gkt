import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/commenti-supervisione?preparatore_id=xxx&contesto=calendario
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const preparatoreId = searchParams.get('preparatore_id')
    if (!preparatoreId) return NextResponse.json({ error: 'preparatore_id mancante' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const admin = getAdmin()

    // Verifica che l'utente sia supervisore o il preparatore stesso
    const { data: rel } = await admin
      .from('relazioni_supervisione')
      .select('id')
      .or(`supervisore_id.eq.${user.id},preparatore_id.eq.${user.id}`)
      .eq('attivo', true)
      .or(`preparatore_id.eq.${preparatoreId},supervisore_id.eq.${preparatoreId}`)
      .maybeSingle()

    if (!rel) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    let query = admin
      .from('commenti_supervisione')
      .select('id, testo, contesto, created_at, supervisore_id')
      .eq('preparatore_id', preparatoreId)
      .order('created_at', { ascending: false })
      .limit(50)

    const contesto = searchParams.get('contesto')
    if (contesto) query = query.eq('contesto', contesto)

    const { data: commenti } = await query

    // Arricchisci con il nome del mittente
    const supIds = [...new Set((commenti ?? []).map(c => c.supervisore_id))]
    let nomi = {}
    if (supIds.length > 0) {
      const { data: profili } = await admin.from('profili').select('id, nome_completo').in('id', supIds)
      profili?.forEach(p => { nomi[p.id] = p.nome_completo ?? 'Responsabile' })
    }

    const result = (commenti ?? []).map(c => ({
      ...c,
      mittente: nomi[c.supervisore_id] ?? 'Responsabile',
      sono_io: c.supervisore_id === user.id,
    }))

    return NextResponse.json({ commenti: result })
  } catch (err) {
    console.error('GET commenti-supervisione:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST /api/commenti-supervisione
// Body: { preparatore_id, testo, contesto }
export async function POST(request) {
  try {
    const { preparatore_id, testo, contesto } = await request.json()
    if (!preparatore_id || !testo?.trim()) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const admin = getAdmin()

    // Verifica relazione attiva supervisore → preparatore
    const { data: rel } = await admin
      .from('relazioni_supervisione')
      .select('id')
      .eq('supervisore_id', user.id)
      .eq('preparatore_id', preparatore_id)
      .eq('attivo', true)
      .maybeSingle()

    if (!rel) return NextResponse.json({ error: 'Non sei il supervisore di questo preparatore' }, { status: 403 })

    const { data: commento, error: insErr } = await admin
      .from('commenti_supervisione')
      .insert({
        supervisore_id: user.id,
        preparatore_id,
        testo: testo.trim(),
        contesto: contesto ?? null,
      })
      .select()
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, commento })
  } catch (err) {
    console.error('POST commenti-supervisione:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
