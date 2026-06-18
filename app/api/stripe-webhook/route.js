import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function scadenzaDa(piano, subscription) {
  if (piano === 'lifetime') return null
  if (subscription?.current_period_end) {
    return new Date(subscription.current_period_end * 1000).toISOString()
  }
  return null
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new NextResponse('Webhook Error', { status: 400 })
  }

  const admin = getAdmin()

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const piano = session.metadata?.piano
      if (!userId || !piano) return NextResponse.json({ ok: true })

      let subscription = null
      let subscriptionId = null
      if (session.subscription) {
        subscription = await stripe.subscriptions.retrieve(session.subscription)
        subscriptionId = subscription.id
      }

      // Crea o aggiorna il record abbonamento
      await admin.from('abbonamenti').upsert({
        allenatore_id: userId,
        piano,
        stato: 'attivo',
        scadenza: scadenzaDa(piano, subscription),
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer,
      }, { onConflict: 'allenatore_id' })
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      if (!invoice.subscription) return NextResponse.json({ ok: true })
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
      const userId = subscription.metadata?.user_id
      if (!userId) return NextResponse.json({ ok: true })

      await admin.from('abbonamenti').update({
        stato: 'attivo',
        scadenza: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('allenatore_id', userId)
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const userId = subscription.metadata?.user_id
      if (!userId) return NextResponse.json({ ok: true })
      await admin.from('abbonamenti').update({ stato: 'cancellato' }).eq('allenatore_id', userId)
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      if (!invoice.subscription) return NextResponse.json({ ok: true })
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
      const userId = subscription.metadata?.user_id
      if (userId) {
        await admin.from('abbonamenti').update({ stato: 'scaduto' }).eq('allenatore_id', userId)
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ ok: true })
}
