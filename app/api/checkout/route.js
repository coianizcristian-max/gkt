import { NextResponse } from 'next/server'
import { tApi, localeFromRequest, DEFAULT_LOCALE } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import {
  getStripe, getAdmin, ultimaRiga, customerValido, rigaValida, fineAccessoGratuito, trialEndValido,
} from '@/lib/stripeAbbonamenti'

const DEFAULT_PREZZI = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

const PIANO_LABEL = {
  mensile:  'Mensile',
  annuale:  'Annuale',
  lifetime: 'A vita',
}

export async function POST(request) {
  try {
    const { piano } = await request.json()
    if (!['mensile', 'annuale', 'lifetime'].includes(piano)) {
      return NextResponse.json({ error: tApi(request, 'Piano non valido') }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato') }, { status: 401 })

    // Il ruolo (e quindi il PREZZO) si decide qui dal profilo, mai dal browser:
    // prima un allenatore poteva mandare ruolo='portiere' e pagare meno.
    const { data: profilo } = await supabase.from('profili')
      .select('ruolo, nome_visualizzato, nome_completo').eq('id', user.id).maybeSingle()
    const ruolo = profilo?.ruolo === 'portiere' ? 'portiere' : profilo?.ruolo === 'allenatore' ? 'allenatore' : null
    if (!ruolo) {
      // staff/collaboratori ereditano l'abbonamento del titolare: non pagano
      return NextResponse.json({ error: tApi(request, 'Il tuo abbonamento è gestito dal tuo allenatore.') }, { status: 403 })
    }

    // Il piano "A vita" può essere disattivato dal Supervisore, per ruolo.
    if (piano === 'lifetime') {
      const { data: ltRow } = await supabase
        .from('funzionalita_config').select('free').eq('chiave', `lifetime_attivo_${ruolo}`).maybeSingle()
      if (ltRow && ltRow.free === false) {
        return NextResponse.json({ error: tApi(request, 'Il piano «A vita» non è al momento disponibile.') }, { status: 400 })
      }
    }

    // Prezzo dal DB (impostato dal Supervisore)
    const { data: prezzoRow } = await supabase
      .from('funzionalita_config').select('label').eq('chiave', `prezzo_${ruolo}_${piano}`).maybeSingle()
    const importoStr = String(prezzoRow?.label ?? DEFAULT_PREZZI[ruolo][piano]).trim()
    // Solo formati sicuri: 5 · 4,9 · 4.99 (niente 3 decimali, segni o testo):
    // su un importo non si "interpreta", si rifiuta.
    const importoCent = /^\d{1,5}([.,]\d{1,2})?$/.test(importoStr)
      ? Math.round(Number(importoStr.replace(',', '.')) * 100)
      : NaN
    if (!Number.isFinite(importoCent) || importoCent < 50) {
      // Stripe non accetta importi sotto 0,50 €
      return NextResponse.json({ error: tApi(request, 'Prezzo non valido: contatta il supporto.') }, { status: 400 })
    }

    const admin = getAdmin()
    const riga = await ultimaRiga(admin, user.id)

    // Niente doppio abbonamento: chi ha già un piano pagato valido lo gestisce
    // dal portale (la prova gratuita invece non blocca).
    if (riga && riga.stato !== 'prova' && rigaValida(riga)) {
      return NextResponse.json({ error: tApi(request, 'Hai già un abbonamento attivo: puoi gestirlo dalla pagina Abbonati.') }, { status: 409 })
    }

    const stripe = getStripe()

    // Customer Stripe: riuso solo se esiste davvero nella modalità attuale
    // (test → live: gli id creati in test non esistono in live).
    let customerId = await customerValido(stripe, riga?.stripe_customer_id)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profilo?.nome_visualizzato || profilo?.nome_completo || undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const isLifetime = piano === 'lifetime'
    const nomeRuolo = ruolo === 'portiere' ? 'Portiere' : 'Allenatore'
    const nomeProdotto = `GKSeason ${PIANO_LABEL[piano]} — ${nomeRuolo}`

    // Chi ha ancora accesso gratuito (prova o coupon) non perde i giorni
    // rimasti: il primo addebito del piano ricorrente parte alla loro fine.
    const trialEnd = isLifetime ? null : trialEndValido(await fineAccessoGratuito(admin, user.id, riga))

    // Chiudo eventuali pagine di pagamento lasciate aperte (altra scheda,
    // doppio clic): così non si possono pagare due abbonamenti.
    try {
      const aperte = await stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 20 })
      for (const cs of aperte?.data ?? []) {
        try { await stripe.checkout.sessions.expire(cs.id) } catch { /* già chiusa */ }
      }
    } catch (e) { console.warn('checkout: pulizia sessioni aperte non riuscita', e?.message) }

    const locale = localeFromRequest(request)
    const prefisso = locale === DEFAULT_LOCALE ? '' : `/${locale}`
    const origin = request.headers.get('origin') ?? 'https://www.gkseason.it'
    const meta = { user_id: user.id, piano, ruolo }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: importoCent,
          ...(isLifetime ? {} : { recurring: { interval: piano === 'mensile' ? 'month' : 'year' } }),
          product_data: { name: nomeProdotto },
        },
        quantity: 1,
      }],
      success_url: `${origin}${prefisso}/abbonati?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${prefisso}/abbonati?cancel=1`,
      client_reference_id: user.id,
      metadata: meta,
      allow_promotion_codes: true,
      ...(isLifetime
        ? { payment_intent_data: { metadata: meta } }
        : { subscription_data: { metadata: meta, ...(trialEnd ? { trial_end: trialEnd } : {}) } }),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
