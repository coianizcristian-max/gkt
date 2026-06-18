import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Client admin con service_role per operazioni privilegiate (aggiorna ruolo portiere)
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 400 })

    // Verifica che l'utente sia autenticato (sessione appena creata)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const admin = getAdmin()

    // Leggi l'invito
    const { data: invito, error: invErr } = await admin
      .from('inviti')
      .select('id, tipo, stato, portiere_id, stagione_id, permessi')
      .eq('token', token)
      .maybeSingle()

    if (invErr || !invito) return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
    if (invito.stato !== 'attivo') return NextResponse.json({ error: 'Invito non più valido' }, { status: 410 })

    if (invito.tipo === 'portiere') {
      // 1. Setta ruolo portiere e collega portiere_id nel profilo
      await admin.from('profili').upsert({
        id: user.id,
        ruolo: 'portiere',
        portiere_id: invito.portiere_id ?? null,
      }, { onConflict: 'id' })

      // 2. Marca invito come consumato
      await admin.from('inviti').update({
        stato: 'consumato',
        consumato_da: user.id,
        consumato_il: new Date().toISOString(),
      }).eq('id', invito.id)

    } else if (invito.tipo === 'collaboratore') {
      // Collaboratore: ruolo staff con permessi
      await admin.from('profili').upsert({
        id: user.id,
        ruolo: 'staff',
        permessi_collaboratore: invito.permessi ?? {},
      }, { onConflict: 'id' })

      await admin.from('inviti').update({
        stato: 'consumato',
        consumato_da: user.id,
        consumato_il: new Date().toISOString(),
      }).eq('id', invito.id)
    }

    return NextResponse.json({ ok: true, tipo: invito.tipo })
  } catch (err) {
    console.error('consuma-invito error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
