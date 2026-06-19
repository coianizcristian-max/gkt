import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// ID del prodotto Stripe (lo stesso per tutti i piani, il prezzo varia)
// Lascia STRIPE_PRODUCT_ID vuoto per usare price_data inline senza prodotto
const PRODUCT_ID = process.env.STRIPE_PRODUCT_ID ?? null

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
    const { piano, ruolo = 'allenatore' } = await request.json()
    if (!['mensile', 'annuale', 'lifetime'].includes(piano)) {
      return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    // ── Legge il prezzo dal DB (impostato dal Supervisore) ──────────────
    const chiave = `prezzo_${ruolo}_${piano}`
    const { data: prezzoRow } = await supabase
      .from('funzionalita_config').select('label').eq('chiave', chiave).maybeSingle()
    const importoStr = prezzoRow?.label ?? DEFAULT_PREZZI[ruolo]?.[piano] ?? '9.90'
    const importoCent = Math.round(parseFloat(String(importoStr).replace(',', '.')) * 100)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = request.headers.get('origin') ?? 'https://gkt2026.vercel.app'

    // ── Customer Stripe ─────────────────────────────────────────────────
    let customerId
    const { data: abb } = await supabase.from('abbonamenti')
      .select('stripe_customer_id').eq('allenatore_id', user.id).maybeSingle()
    customerId = abb?.stripe_customer_id

    if (!customerId) {
      const { data: profilo } = await supabase.from('profili')
        .select('nome_visualizzato').eq('id', user.id).maybeSingle()
      const customer = await stripe.customers.create({
        email: user.email,
        name: profilo?.nome_visualizzato ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const isLifetime = piano === 'lifetime'
    const nomeRuolo = ruolo === 'portiere' ? 'Portiere' : 'Allenatore'
    const nomeProdotto = `GKT ${PIANO_LABEL[piano]} — ${nomeRuolo}`

    // ── Crea sempre price dinamico dal DB ────────────────────────────────
    // Così il prezzo mostrato su Stripe corrisponde sempre a quello del Supervisore
    const priceData = {
      currency: 'eur',
      unit_amount: importoCent,
      ...(isLifetime ? {} : {
        recurring: { interval: piano === 'mensile' ? 'month' : 'year' },
      }),
      product_data: PRODUCT_ID
        ? undefined  // se c'è un product_id, lo usiamo
        : { name: nomeProdotto },
      ...(PRODUCT_ID ? { product: PRODUCT_ID } : {}),
    }

    // Se c'è STRIPE_PRODUCT_ID, lo associamo al price dinamico
    const lineItemPriceData = PRODUCT_ID ? {
      currency: 'eur',
      unit_amount: importoCent,
      ...(isLifetime ? {} : {
        recurring: { interval: piano === 'mensile' ? 'month' : 'year' },
      }),
      product: PRODUCT_ID,
    } : {
      currency: 'eur',
      unit_amount: importoCent,
      ...(isLifetime ? {} : {
        recurring: { interval: piano === 'mensile' ? 'month' : 'year' },
      }),
      product_data: { name: nomeProdotto },
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price_data: lineItemPriceData, quantity: 1 }],
      success_url: `${origin}/abbonati?success=1`,
      cancel_url: `${origin}/abbonati?cancel=1`,
      metadata: { user_id: user.id, piano, ruolo },
      ...(isLifetime ? {} : {
        subscription_data: { metadata: { user_id: user.id, piano } },
      }),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
