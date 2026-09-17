import { createClient as createAdminClient } from '@supabase/supabase-js'

// Client admin con service_role per operazioni privilegiate
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Consuma un invito PER CONTO di `user`, che DEVE essere l'utente invitato
// autenticato come sé stesso. Non legge cookie/sessione: riceve già l'utente
// giusto dal chiamante, così non può mai agire sull'account sbagliato.
// Ritorna { ok, tipo } in caso di successo, oppure { error, status }.
export async function consumaInvito(token, user) {
  if (!token) return { error: 'Token mancante', status: 400 }
  if (!user) return { error: 'Non autenticato', status: 401 }

  const admin = getAdmin()

  // Leggi l'invito
  const { data: invito, error: invErr } = await admin
    .from('inviti')
    .select('id, tipo, stato, portiere_id, stagione_id, permessi')
    .eq('token', token)
    .maybeSingle()

  if (invErr || !invito) return { error: 'Invito non trovato', status: 404 }
  if (invito.stato !== 'attivo') return { error: 'Invito non più valido', status: 410, esaurito: true }

  // ── RETE ANTI-DIROTTAMENTO ────────────────────────────────────────
  // Blocca SOLO se l'utente possiede già stagioni proprie: è il segnale
  // affidabile di un allenatore consolidato. NON ci si può basare su
  // ruolo='allenatore', perché OGNI nuovo utente nasce con ruolo 'allenatore'
  // di default (trigger su Supabase) pur avendo 0 stagioni — bloccare su quello
  // impedirebbe di collegare i portieri veri appena registrati.
  if (invito.tipo === 'portiere' || invito.tipo === 'collaboratore') {
    // Blocca SOLO se l'account è un allenatore GIÀ ATTIVO: possiede almeno una
    // stagione CON attività reale (allenamenti o partite). Non basta possedere
    // una stagione: ogni nuovo utente nasce 'allenatore' e potrebbe avere una
    // stagione di default vuota — bloccare su quella impedirebbe di collegare i
    // portieri/collaboratori veri appena registrati.
    const { data: stagRows } = await admin
      .from('stagioni').select('id').eq('owner_id', user.id)
    const stagIds = (stagRows ?? []).map((s) => s.id)
    let coachAttivo = false
    if (stagIds.length > 0) {
      const [{ count: nAll }, { count: nPar }] = await Promise.all([
        admin.from('allenamenti').select('id', { count: 'exact', head: true }).in('stagione_id', stagIds),
        admin.from('partite').select('id', { count: 'exact', head: true }).in('stagione_id', stagIds),
      ])
      coachAttivo = (nAll ?? 0) > 0 || (nPar ?? 0) > 0
    }
    if (coachAttivo) {
      return {
        error: "Questo account è già un allenatore attivo (ha stagioni con allenamenti o partite) e non può essere collegato come portiere o collaboratore. Usa l'invito con un account nuovo.",
        status: 409,
      }
    }
  }

  // Risali all'allenatore proprietario della stagione collegata all'invito
  let allenatoreOwnerId = null
  if (invito.stagione_id) {
    const { data: stagioneRow } = await admin.from('stagioni').select('owner_id').eq('id', invito.stagione_id).maybeSingle()
    allenatoreOwnerId = stagioneRow?.owner_id ?? null
  }

  // ── RAMO 1: invito per PORTIERE ───────────────────────────────────
  if (invito.tipo === 'portiere') {
    // IMPORTANTE: se questa scrittura fallisce NON si prosegue. Marcare
    // l'invito come consumato dopo un upsert fallito lo brucerebbe lasciando
    // l'utente col ruolo di default 'allenatore', senza alcuna traccia.
    const { error: upErr } = await admin.from('profili').upsert({
      id: user.id,
      ruolo: 'portiere',
      portiere_id: invito.portiere_id ?? null,
      allenatore_id: allenatoreOwnerId,
    }, { onConflict: 'id' })

    if (upErr) {
      console.error('consumaInvito: upsert profili (portiere) fallito:', upErr)
      return { error: 'Non è stato possibile collegare il profilo. Riprova o contatta il tuo preparatore.', status: 500 }
    }

    await admin.from('inviti').update({
      stato: 'consumato',
      consumato_da: user.id,
      consumato_il: new Date().toISOString(),
    }).eq('id', invito.id)
  }

  // ── RAMO 2: invito per COLLABORATORE (staff) ──────────────────────
  else if (invito.tipo === 'collaboratore') {
    const { error: upErr } = await admin.from('profili').upsert({
      id: user.id,
      ruolo: 'staff',
      permessi_collaboratore: invito.permessi ?? {},
      allenatore_id: allenatoreOwnerId,
    }, { onConflict: 'id' })

    if (upErr) {
      console.error('consumaInvito: upsert profili (staff) fallito:', upErr)
      return { error: 'Non è stato possibile collegare il profilo. Riprova o contatta il tuo preparatore.', status: 500 }
    }

    await admin.from('inviti').update({
      stato: 'consumato',
      consumato_da: user.id,
      consumato_il: new Date().toISOString(),
    }).eq('id', invito.id)
  }

  // ── RAMO 3: invito per PREPARATORE (supervisione) ─────────────────
  else if (invito.tipo === 'preparatore') {
    if (!allenatoreOwnerId) {
      return { error: 'Invito non valido: nessuna stagione collegata', status: 422 }
    }
    if (allenatoreOwnerId === user.id) {
      return { error: 'Non puoi collegarti a te stesso', status: 422 }
    }

    const { data: profiloPre } = await admin.from('profili').select('id, ruolo').eq('id', user.id).maybeSingle()
    if (!profiloPre) {
      await admin.from('profili').insert({ id: user.id, ruolo: 'allenatore' })
    }

    const { error: relErr } = await admin.from('relazioni_supervisione').upsert({
      supervisore_id: allenatoreOwnerId,
      preparatore_id: user.id,
      attivo: true,
      invito_id: invito.id,
      revocato_il: null,
    }, { onConflict: 'supervisore_id,preparatore_id' })

    if (relErr) {
      console.error('relazioni_supervisione upsert error:', relErr)
      return { error: 'Errore nel creare la relazione', status: 500 }
    }

    const { error: supErr } = await admin
      .from('profili').update({ supervisore_id: allenatoreOwnerId }).eq('id', user.id)
    if (supErr) {
      console.error('consumaInvito: update profili (supervisore) fallito:', supErr)
      return { error: 'Non è stato possibile collegare il profilo. Riprova.', status: 500 }
    }

    await admin.from('inviti').update({
      stato: 'consumato',
      consumato_da: user.id,
      consumato_il: new Date().toISOString(),
    }).eq('id', invito.id)
  }

  else {
    return { error: 'Tipo invito non riconosciuto', status: 400 }
  }

  return { ok: true, tipo: invito.tipo }
}
