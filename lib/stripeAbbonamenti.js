// ────────────────────────────────────────────────────────────────────────────
// Stripe ↔ tabella `abbonamenti` — UNICO punto che scrive lo stato pagato.
//
// Perché esiste (set. 2026, prima dell'avvio degli abbonamenti a pagamento):
//  - webhook, pagina di ritorno da Stripe e disdetta usavano logiche diverse;
//  - la disdetta cambiava solo il DB e Stripe continuava ad addebitare;
//  - i payload dei webhook cambiano forma con la versione API dell'endpoint
//    (es. `invoice.subscription` spostato in `invoice.parent...`).
//
// Regola: non ci fidiamo del payload dell'evento. Ricaviamo l'id della
// subscription e la RILEGGIAMO da Stripe con l'SDK (versione API fissata
// dalla libreria), poi scriviamo lo stato. Così l'esito non dipende né dalla
// versione dell'endpoint né dall'ordine in cui arrivano gli eventi, e
// rieseguire la stessa sincronizzazione due volte non fa danni.
//
// Scrittura: una riga per utente (la più recente). Non dipende da vincoli
// UNIQUE sul DB: legge l'ultima riga e fa update, altrimenti insert.
// ────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY mancante')
  return new Stripe(key)
}

export function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/** Fine del periodo pagato (ISO) — gestisce sia la forma vecchia che la nuova. */
export function finePeriodo(sub) {
  const fine = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null
  const cancel = sub?.cancel_at ?? null
  // se è programmata una chiusura prima della fine periodo, vale la più vicina
  const sec = fine && cancel ? Math.min(fine, cancel) : (fine ?? cancel)
  return sec ? new Date(sec * 1000).toISOString() : null
}

/**
 * Stato GKSeason a partire dallo stato Stripe.
 * null = non toccare (es. 'incomplete': primo pagamento non ancora andato).
 *  - active / trialing / past_due → 'attivo' (o 'disdetto' se non si rinnova)
 *    past_due: Stripe sta ritentando l'addebito, l'accesso resta finché decide.
 *  - canceled → 'cancellato'; unpaid / incomplete_expired / paused → 'scaduto'
 */
export function statoDaSubscription(sub) {
  switch (sub?.status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return (sub.cancel_at_period_end || sub.cancel_at) ? 'disdetto' : 'attivo'
    case 'canceled':
      return 'cancellato'
    case 'unpaid':
    case 'incomplete_expired':
    case 'paused':
      return 'scaduto'
    default:
      return null
  }
}

export function pianoDaSubscription(sub) {
  const p = sub?.metadata?.piano
  if (p === 'mensile' || p === 'annuale') return p
  const interval = sub?.items?.data?.[0]?.price?.recurring?.interval
  return interval === 'year' ? 'annuale' : 'mensile'
}

/** Id subscription da una fattura: forma vecchia e forma nuova (API 2025+). */
export function subIdDaInvoice(invoice) {
  const v = invoice?.subscription
    ?? invoice?.parent?.subscription_details?.subscription
    ?? null
  if (!v) return null
  return typeof v === 'string' ? v : v.id ?? null
}

// Avviso a supporto@ per casi da guardare a mano (doppio abbonamento,
// rimborsi, contestazioni, pagamenti su account cancellati). Non blocca mai.
export async function avvisaAdmin(oggetto, righe) {
  try {
    const key = process.env.RESEND_API_KEY
    console.warn('[AVVISO PAGAMENTI]', oggetto, righe)
    if (!key) return
    const html = '<p>' + righe.map((r) => String(r).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))).join('<br>') + '</p>'
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'GKSeason <notifiche@gkseason.it>', to: 'supporto@gkseason.it', subject: '[Pagamenti] ' + oggetto, html }),
    }).catch(() => {})
    clearTimeout(timer)
  } catch { /* mai bloccare il flusso dei pagamenti per un avviso */ }
}

async function utenteEsiste(admin, userId) {
  const { data, error } = await admin.from('profili').select('id').eq('id', userId).limit(1)
  if (error) throw new Error('lettura profili: ' + error.message)
  return !!data?.length
}

const idDi = (v) => (v == null ? null : typeof v === 'string' ? v : v.id ?? null)

/** Ultima riga abbonamenti dell'utente (o null). Lancia su errore DB. */
export async function ultimaRiga(admin, userId) {
  const { data, error } = await admin.from('abbonamenti')
    .select('id, piano, stato, scadenza, stripe_subscription_id, stripe_customer_id')
    .eq('allenatore_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error('lettura abbonamenti: ' + error.message)
  return data?.[0] ?? null
}

/** Aggiorna l'ultima riga dell'utente o ne crea una. Lancia su errore DB. */
export async function scriviAbbonamento(admin, userId, campi, riga) {
  if (riga === undefined) riga = await ultimaRiga(admin, userId)
  if (riga) {
    const { error } = await admin.from('abbonamenti').update(campi).eq('id', riga.id)
    if (error) throw new Error('update abbonamenti: ' + error.message)
    return riga.id
  }
  const { data, error } = await admin.from('abbonamenti')
    .insert({ allenatore_id: userId, ...campi }).select('id').single()
  if (error) {
    // 23505 = un'altra richiesta ha appena creato la riga (webhook e pagina di
    // ritorno arrivano insieme): rileggo e aggiorno quella.
    if (error.code === '23505') {
      const ora = await ultimaRiga(admin, userId)
      if (ora) return scriviAbbonamento(admin, userId, campi, ora)
    }
    throw new Error('insert abbonamenti: ' + error.message)
  }
  return data?.id ?? null
}

/** Utente Supabase proprietario di una subscription. */
async function trovaUtente(admin, stripe, sub) {
  if (sub?.metadata?.user_id) return sub.metadata.user_id

  const { data, error } = await admin.from('abbonamenti')
    .select('allenatore_id').eq('stripe_subscription_id', sub.id).limit(1)
  if (error) throw new Error('ricerca per subscription: ' + error.message)
  if (data?.[0]?.allenatore_id) return data[0].allenatore_id

  const custId = idDi(sub.customer)
  if (custId) {
    try {
      const c = await stripe.customers.retrieve(custId)
      if (!c?.deleted && c?.metadata?.supabase_user_id) return c.metadata.supabase_user_id
    } catch { /* customer inesistente: nessun utente */ }
  }
  return null
}

/**
 * Rilegge la subscription da Stripe e allinea `abbonamenti`.
 * opts.userIdAtteso: se passato, sincronizza solo se la sub è di quell'utente.
 * Ritorna { ok, stato?, ignorato? }. Lancia solo su errori DB/Stripe veri
 * (così il webhook risponde 500 e Stripe ritenta).
 */
export async function syncSubscription(admin, stripe, subId, opts = {}) {
  const sub = await stripe.subscriptions.retrieve(subId)
  const userId = await trovaUtente(admin, stripe, sub)
  if (!userId) return { ok: false, ignorato: 'utente non trovato' }
  if (opts.userIdAtteso && userId !== opts.userIdAtteso) return { ok: false, ignorato: 'utente diverso' }

  const stato = statoDaSubscription(sub)
  if (!stato) return { ok: true, ignorato: 'stato ' + sub.status }

  if (!(await utenteEsiste(admin, userId))) {
    if (stato === 'attivo' || stato === 'disdetto') {
      await avvisaAdmin('Abbonamento attivo su un account che non esiste più', [
        'Subscription: ' + sub.id, 'Customer: ' + idDi(sub.customer), 'User id: ' + userId,
        'Stripe continua ad addebitare: annullala (ed eventualmente rimborsa) dalla dashboard Stripe.',
      ])
    }
    return { ok: true, ignorato: 'utente inesistente' }
  }

  const riga = await ultimaRiga(admin, userId)

  // Chi ha comprato "A vita" non deve essere toccato da eventi di vecchie sub.
  if (riga && riga.piano === 'lifetime' && riga.stato === 'attivo' && riga.stripe_subscription_id !== sub.id) {
    return { ok: true, ignorato: 'lifetime attivo' }
  }
  // Una sub VECCHIA che si chiude non deve spegnere una sub NUOVA diversa.
  if (riga?.stripe_subscription_id && riga.stripe_subscription_id !== sub.id
      && (stato === 'cancellato' || stato === 'scaduto')) {
    return { ok: true, ignorato: 'sub non corrente' }
  }

  // Due sottoscrizioni vive per la stessa persona = paga due volte: avviso.
  if (riga?.stripe_subscription_id && riga.stripe_subscription_id !== sub.id
      && (stato === 'attivo' || stato === 'disdetto')) {
    try {
      const vecchia = await stripe.subscriptions.retrieve(riga.stripe_subscription_id)
      if (['active', 'trialing', 'past_due'].includes(vecchia.status) && !vecchia.cancel_at_period_end && !vecchia.cancel_at) {
        await avvisaAdmin('Possibile DOPPIO abbonamento', [
          'User id: ' + userId, 'Sub precedente ancora attiva: ' + vecchia.id, 'Sub nuova: ' + sub.id,
          'Verifica su Stripe e annulla/rimborsa quella in più.',
        ])
      }
    } catch (e) { if (e?.code !== 'resource_missing') throw e }
  }

  await scriviAbbonamento(admin, userId, {
    piano: pianoDaSubscription(sub),
    stato,
    scadenza: finePeriodo(sub),
    stripe_subscription_id: sub.id,
    stripe_customer_id: idDi(sub.customer),
  }, riga)
  return { ok: true, stato }
}

/**
 * Checkout completato (abbonamento o "A vita").
 * Usato dal webhook e dalla pagina di ritorno /abbonati?session_id=...
 */
export async function syncCheckoutSession(admin, stripe, session, opts = {}) {
  if (!session || session.metadata?.tipo === 'contatto_allenatore') return { ok: true, ignorato: 'non abbonamento' }
  const userId = session.metadata?.user_id
  if (!userId) return { ok: false, ignorato: 'metadata mancanti' }
  if (opts.userIdAtteso && userId !== opts.userIdAtteso) return { ok: false, ignorato: 'utente diverso' }
  if (session.status && session.status !== 'complete') return { ok: false, ignorato: 'sessione non completata' }

  if (session.mode === 'subscription') {
    const subId = idDi(session.subscription)
    if (!subId) return { ok: false, ignorato: 'subscription mancante' }
    return syncSubscription(admin, stripe, subId, { userIdAtteso: userId })
  }

  // mode 'payment' → piano "A vita"
  if (!(await utenteEsiste(admin, userId))) {
    await avvisaAdmin('Pagamento "A vita" su un account che non esiste più', [
      'Sessione: ' + session.id, 'User id: ' + userId, 'Valuta il rimborso dalla dashboard Stripe.',
    ])
    return { ok: true, ignorato: 'utente inesistente' }
  }
  // 'no_payment_required' = pagato al 100% con codice sconto
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return { ok: false, ignorato: 'pagamento non concluso' }
  }
  const riga = await ultimaRiga(admin, userId)

  // Se aveva una sub ricorrente ancora viva, la chiudiamo: non deve pagare due volte.
  const vecchia = riga?.stripe_subscription_id
  if (vecchia && riga.piano !== 'lifetime') {
    try { await stripe.subscriptions.cancel(vecchia) } catch (e) {
      if (e?.code !== 'resource_missing') console.error('cancel sub precedente fallita:', vecchia, e?.message)
    }
  }

  await scriviAbbonamento(admin, userId, {
    piano: 'lifetime',
    stato: 'attivo',
    scadenza: null,
    stripe_subscription_id: null,
    stripe_customer_id: idDi(session.customer),
  }, riga)
  return { ok: true, stato: 'attivo' }
}

/**
 * Verifica che un customer salvato esista nella modalità Stripe attuale.
 * Serve al passaggio TEST → LIVE: gli id cus_ creati in test non esistono in
 * live ("No such customer"), senza questo controllo il checkout si rompe.
 */
export async function customerValido(stripe, customerId) {
  if (!customerId) return null
  try {
    const c = await stripe.customers.retrieve(customerId)
    return c && !c.deleted ? c.id : null
  } catch (e) {
    if (e?.code === 'resource_missing' || e?.statusCode === 404) return null
    throw e
  }
}

/** true se la riga dà ancora accesso (stessa regola di hasAbbonamento). */
export function rigaValida(riga, ora = new Date()) {
  if (!riga) return false
  if (riga.piano === 'lifetime') return riga.stato === 'attivo'
  if (!['attivo', 'disdetto', 'prova'].includes(riga.stato)) return false
  return !!riga.scadenza && new Date(riga.scadenza) > ora
}

/**
 * Rimborso TOTALE di un pagamento "A vita" → accesso revocato.
 * (Per gli abbonamenti ricorrenti il rimborso non chiude la sub: va annullata
 * su Stripe, e l'evento customer.subscription.deleted spegne l'accesso.)
 */
export async function gestisciRimborso(admin, stripe, charge) {
  if (!charge?.refunded) return { ok: true, ignorato: 'rimborso parziale' }
  const piId = idDi(charge.payment_intent)
  if (!piId) return { ok: true, ignorato: 'nessun payment_intent' }
  const pi = await stripe.paymentIntents.retrieve(piId)
  const userId = pi?.metadata?.user_id
  if (pi?.metadata?.piano !== 'lifetime' || !userId) return { ok: true, ignorato: 'non lifetime' }
  const riga = await ultimaRiga(admin, userId)
  if (!riga || riga.piano !== 'lifetime') return { ok: true, ignorato: 'riga non lifetime' }
  await scriviAbbonamento(admin, userId, { stato: 'cancellato' }, riga)
  await avvisaAdmin('Rimborso "A vita": accesso revocato', ['User id: ' + userId, 'Charge: ' + charge.id])
  return { ok: true, stato: 'cancellato' }
}

/**
 * Fino a quando l'utente ha già accesso gratuito (prova o coupon ancora
 * valido). Serve per far partire il primo addebito solo dopo. ISO o null.
 */
export async function fineAccessoGratuito(admin, userId, riga) {
  const ora = Date.now()
  let fine = riga?.stato === 'prova' && riga.scadenza ? new Date(riga.scadenza).getTime() : 0
  const { data, error } = await admin.from('coupon_utilizzi')
    .select('scade_il').eq('utente_id', userId)
    .gt('scade_il', new Date(ora).toISOString())
    .order('scade_il', { ascending: false }).limit(1)
  if (error) throw new Error('lettura coupon: ' + error.message)
  const c = data?.[0]?.scade_il ? new Date(data[0].scade_il).getTime() : 0
  fine = Math.max(fine, c)
  return fine > ora ? new Date(fine).toISOString() : null
}

// Stripe: trial_end deve essere almeno 48h nel futuro e al massimo 730 giorni.
export const MIN_PROVA_MS = 49 * 60 * 60 * 1000
export const MAX_PROVA_MS = 729 * 24 * 60 * 60 * 1000
export function trialEndValido(fineIso, ora = Date.now()) {
  if (!fineIso) return null
  const fine = new Date(fineIso).getTime()
  if (!(fine - ora > MIN_PROVA_MS)) return null
  return Math.floor(Math.min(fine, ora + MAX_PROVA_MS) / 1000)
}

/**
 * Fine del giorno 'YYYY-MM-DD' nel fuso Europe/Rome (23:59:59 ora italiana),
 * con ora legale/solare gestita. Usata per le scadenze scelte a calendario.
 */
export function fineGiornoRoma(yyyyMmDd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(yyyyMmDd || ''))) return null
  for (const off of ['+02:00', '+01:00']) {
    const d = new Date(`${yyyyMmDd}T23:59:59${off}`)
    const giorno = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
    const ora = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Rome', hour12: false })
    if (giorno === yyyyMmDd && ora.startsWith('23:59')) return d
  }
  return new Date(`${yyyyMmDd}T23:59:59+01:00`)
}
