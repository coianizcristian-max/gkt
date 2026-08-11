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
  if (invito.stato !== 'attivo') return { error: 'Invito non più valido', status: 410 }

  // ── RETE ANTI-DIROTTAMENTO ────────────────────────────────────────
  // Un invito 'portiere'/'collaboratore' non deve mai declassare un account
  // che è già allenatore o che possiede stagioni proprie.
  if (invito.tipo === 'portiere' || invito.tipo === 'collaboratore') {
    const { data: profiloEsistente } = await admin
      .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    const { count: stagioniPossedute } = await admin
      .from('stagioni').select('id', { count: 'exact', head: true }).eq('owner_id', user.id)
    if (profiloEsistente?.ruolo === 'allenatore' || (stagioniPossedute ?? 0) > 0) {
      return {
        error: "Questo account è già un allenatore e non può essere collegato come portiere o collaboratore. Usa l'invito con un account nuovo.",
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

    await admin.from('profili').update({ supervisore_id: allenatoreOwnerId }).eq('id', user.id)

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
