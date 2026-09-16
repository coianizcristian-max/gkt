import { NextResponse } from 'next/server'
import { tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Trova l'utente registrato con una certa email (l'admin API non filtra per
// email, quindi paginiamo — per un club sono pochi utenti).
async function trovaUtentePerEmail(admin, email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    const users = data?.users ?? []
    const hit = users.find((u) => (u.email || '').toLowerCase() === email)
    if (hit) return hit
    if (users.length < 1000) break
  }
  return null
}

// Collega un account GIÀ REGISTRATO a un portiere, impostandone ruolo e
// collegamenti — senza dipendere dalla conferma-email/consumazione invito.
// Solo l'allenatore/staff proprietario del portiere può farlo.
export async function POST(request) {
  try {
    const { email, portiere_id } = await request.json()
    if (!email || !portiere_id) {
      return NextResponse.json({ error: tApi(request, 'Dati mancanti (email e portiere).') }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato') }, { status: 401 })

    const { data: profilo } = await supabase.from('profili').select('ruolo, allenatore_id').eq('id', user.id).maybeSingle()
    if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) {
      return NextResponse.json({ error: tApi(request, 'Non autorizzato') }, { status: 403 })
    }
    const ownerId = profilo.ruolo === 'allenatore' ? user.id : profilo.allenatore_id
    if (!ownerId) return NextResponse.json({ error: tApi(request, 'Nessun allenatore collegato') }, { status: 422 })

    const admin = getAdmin()

    // Il portiere deve appartenere a questo allenatore.
    const { data: portiere } = await admin
      .from('portieri').select('id, nome, cognome, allenatore_id').eq('id', portiere_id).maybeSingle()
    if (!portiere || portiere.allenatore_id !== ownerId) {
      return NextResponse.json({ error: tApi(request, 'Portiere non valido o non collegato al tuo account.') }, { status: 403 })
    }

    // Trova l'account registrato con quella email.
    const target = await trovaUtentePerEmail(admin, String(email).trim().toLowerCase())
    if (!target) {
      return NextResponse.json({ error: tApi(request, 'Nessun account registrato con questa email. Deve prima registrarsi.') }, { status: 404 })
    }
    if (target.id === user.id) {
      return NextResponse.json({ error: tApi(request, 'Non puoi collegare te stesso come portiere.') }, { status: 422 })
    }

    // Non trasformare in portiere un allenatore GIÀ ATTIVO (stagioni con attività).
    const { data: stagRows } = await admin.from('stagioni').select('id').eq('owner_id', target.id)
    const stagIds = (stagRows ?? []).map((s) => s.id)
    if (stagIds.length > 0) {
      const [{ count: nAll }, { count: nPar }] = await Promise.all([
        admin.from('allenamenti').select('id', { count: 'exact', head: true }).in('stagione_id', stagIds),
        admin.from('partite').select('id', { count: 'exact', head: true }).in('stagione_id', stagIds),
      ])
      if ((nAll ?? 0) > 0 || (nPar ?? 0) > 0) {
        return NextResponse.json({
          error: tApi(request, 'Questo account è già un allenatore attivo (ha allenamenti o partite) e non può essere collegato come portiere.'),
          status: 409,
        }, { status: 409 })
      }
    }

    // Collega: imposta ruolo portiere + collegamenti.
    const { error: upErr } = await admin.from('profili').upsert({
      id: target.id,
      ruolo: 'portiere',
      portiere_id: portiere.id,
      allenatore_id: ownerId,
    }, { onConflict: 'id' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Segna consumato l'eventuale invito-portiere ancora attivo per questo portiere.
    await admin.from('inviti')
      .update({ stato: 'consumato', consumato_da: target.id, consumato_il: new Date().toISOString() })
      .eq('portiere_id', portiere.id).eq('tipo', 'portiere').eq('stato', 'attivo')

    return NextResponse.json({ ok: true, nome: `${portiere.nome} ${portiere.cognome ?? ''}`.trim() })
  } catch (err) {
    console.error('collega-portiere error:', err)
    return NextResponse.json({ error: tApi(request, 'Errore interno') }, { status: 500 })
  }
}
