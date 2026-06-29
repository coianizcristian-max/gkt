import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Client admin con service_role per operazioni privilegiate
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

    // Verifica che l'utente sia autenticato
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

    // Risali all'allenatore proprietario della stagione collegata all'invito
    let allenatoreOwnerId = null
    if (invito.stagione_id) {
      const { data: stagioneRow } = await admin.from('stagioni').select('owner_id').eq('id', invito.stagione_id).maybeSingle()
      allenatoreOwnerId = stagioneRow?.owner_id ?? null
    }

    // ── RAMO 1: invito per PORTIERE ───────────────────────────────────
    if (invito.tipo === 'portiere') {
      await admin.from('profili').upsert({
        id: user.id,
        ruolo: 'portiere',
        portiere_id: invito.portiere_id ?? null,
        allenatore_id: allenatoreOwnerId,
      }, { onConflict: 'id' })

      await admin.from('inviti').update({
        stato: 'consumato',
        consumato_da: user.id,
        consumato_il: new Date().toISOString(),
      }).eq('id', invito.id)
    }

    // ── RAMO 2: invito per COLLABORATORE (staff) ──────────────────────
    else if (invito.tipo === 'collaboratore') {
      await admin.from('profili').upsert({
        id: user.id,
        ruolo: 'staff',
        permessi_collaboratore: invito.permessi ?? {},
        allenatore_id: allenatoreOwnerId,
      }, { onConflict: 'id' })

      await admin.from('inviti').update({
        stato: 'consumato',
        consumato_da: user.id,
        consumato_il: new Date().toISOString(),
      }).eq('id', invito.id)
    }

    // ── RAMO 3: invito per PREPARATORE (supervisione) ─────────────────
    // Il preparatore mantiene il suo ruolo 'allenatore' e la sua autonomia.
    // Si crea solo la relazione responsabile → preparatore.
    else if (invito.tipo === 'preparatore') {
      if (!allenatoreOwnerId) {
        return NextResponse.json({ error: 'Invito non valido: nessuna stagione collegata' }, { status: 422 })
      }

      // Impedisci che un allenatore si colleghi a se stesso
      if (allenatoreOwnerId === user.id) {
        return NextResponse.json({ error: 'Non puoi collegarti a te stesso' }, { status: 422 })
      }

      // Assicura che il profilo del preparatore esista (potrebbe non esserci ancora)
      const { data: profiloPre } = await admin.from('profili').select('id, ruolo').eq('id', user.id).maybeSingle()
      if (!profiloPre) {
        await admin.from('profili').insert({ id: user.id, ruolo: 'allenatore' })
      }

      // Crea (o riattiva) la relazione di supervisione
      const { error: relErr } = await admin.from('relazioni_supervisione').upsert({
        supervisore_id: allenatoreOwnerId,
        preparatore_id: user.id,
        attivo: true,
        invito_id: invito.id,
        revocato_il: null,
      }, { onConflict: 'supervisore_id,preparatore_id' })

      if (relErr) {
        console.error('relazioni_supervisione upsert error:', relErr)
        return NextResponse.json({ error: 'Errore nel creare la relazione' }, { status: 500 })
      }

      // Aggiorna supervisore_id nel profilo del preparatore
      await admin.from('profili').update({
        supervisore_id: allenatoreOwnerId,
      }).eq('id', user.id)

      // Marca l'invito come consumato
      await admin.from('inviti').update({
        stato: 'consumato',
        consumato_da: user.id,
        consumato_il: new Date().toISOString(),
      }).eq('id', invito.id)
    }

    else {
      return NextResponse.json({ error: 'Tipo invito non riconosciuto' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, tipo: invito.tipo })

  } catch (err) {
    console.error('consuma-invito error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
