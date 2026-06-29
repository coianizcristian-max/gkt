import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// POST /api/revoca-supervisione
// Body: { preparatore_id }
export async function POST(request) {
  try {
    const { preparatore_id } = await request.json()
    if (!preparatore_id) return NextResponse.json({ error: 'preparatore_id mancante' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    if (profilo?.ruolo !== 'allenatore') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    const admin = getAdmin()

    // Revoca la relazione
    const { error: revErr } = await admin
      .from('relazioni_supervisione')
      .update({ attivo: false, revocato_il: new Date().toISOString() })
      .eq('supervisore_id', user.id)
      .eq('preparatore_id', preparatore_id)

    if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 })

    // Rimuovi supervisore_id dal profilo del preparatore
    await admin
      .from('profili')
      .update({ supervisore_id: null })
      .eq('id', preparatore_id)
      .eq('supervisore_id', user.id) // sicurezza: solo se era davvero il suo supervisore

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('revoca-supervisione error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
