import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Price IDs da configurare su Stripe Dashboard e inserire in env vars
const PRICE_IDS = {
  mensile:  process.env.STRIPE_PRICE_MENSILE,
  annuale:  process.env.STRIPE_PRICE_ANNUALE,
  lifetime: process.env.STRIPE_PRICE_LIFETIME,
}

export async function POST(request) {
  try {
    const { piano } = await request.json()
    if (!PRICE_IDS[piano]) return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://gkt2026.vercel.app'

    // Recupera o crea il customer Stripe
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

    // Per lifetime usa payment_mode (one-time), per i piani ricorrenti usa subscription
    const isLifetime = piano === 'lifetime'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: PRICE_IDS[piano], quantity: 1 }],
      success_url: `${origin}/abbonati?success=1`,
      cancel_url: `${origin}/abbonati?cancel=1`,
      metadata: { user_id: user.id, piano },
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
