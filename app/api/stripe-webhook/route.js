import { NextResponse } from 'next/server'
import {
  getStripe, getAdmin, syncSubscription, syncCheckoutSession, subIdDaInvoice,
  gestisciRimborso, avvisaAdmin,
} from '@/lib/stripeAbbonamenti'

// Il webhook deve leggere il corpo grezzo (firma) e non va mai messo in cache.
export const dynamic = 'force-dynamic'

// Eventi da abilitare sull'endpoint Stripe (Developers → Webhooks):
//   checkout.session.completed
//   customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
//   invoice.paid, invoice.payment_failed
//   charge.refunded, charge.dispute.created
// (invoice.payment_succeeded è gestito uguale, se già abilitato non dà fastidio)

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET o STRIPE_SECRET_KEY mancanti')
    return new NextResponse('Webhook non configurato', { status: 500 })
  }

  const stripe = getStripe()
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new NextResponse('Webhook Error', { status: 400 })
  }

  const admin = getAdmin()
  const obj = event.data.object

  try {
    let esito = { ok: true, ignorato: 'evento non gestito' }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        if (obj.metadata?.tipo === 'contatto_allenatore') {
          const acquirenteId = obj.metadata?.acquirente_id
          const allenatoreId = obj.metadata?.allenatore_id
          if (acquirenteId && allenatoreId && obj.payment_status === 'paid') {
            const { error } = await admin.from('accessi_contatto').upsert({
              acquirente_id: acquirenteId,
              allenatore_id: allenatoreId,
              stripe_payment_intent: obj.payment_intent,
            }, { onConflict: 'acquirente_id,allenatore_id' })
            if (error) throw new Error('accessi_contatto: ' + error.message)
            esito = { ok: true, stato: 'contatto sbloccato' }
          }
        } else {
          esito = await syncCheckoutSession(admin, stripe, obj)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        esito = await syncSubscription(admin, stripe, obj.id)
        break

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const subId = subIdDaInvoice(obj)
        if (subId) esito = await syncSubscription(admin, stripe, subId)
        break
      }

      case 'charge.refunded':
        esito = await gestisciRimborso(admin, stripe, obj)
        break

      case 'charge.dispute.created':
        await avvisaAdmin('Contestazione (chargeback) aperta', [
          'Dispute: ' + obj.id, 'Charge: ' + (typeof obj.charge === 'string' ? obj.charge : obj.charge?.id),
          'Importo: ' + ((obj.amount ?? 0) / 100).toFixed(2) + ' ' + String(obj.currency ?? '').toUpperCase(),
          'Rispondi dalla dashboard Stripe entro la scadenza indicata.',
        ])
        esito = { ok: true, stato: 'avviso inviato' }
        break

      default:
        break
    }

    console.log('stripe-webhook', event.type, event.id, JSON.stringify(esito))
  } catch (err) {
    // 500 → Stripe ritenta l'evento più tardi (prima rispondevamo sempre 200
    // e un errore del DB faceva perdere l'attivazione per sempre).
    console.error('Webhook handler error:', event.type, event.id, err)
    return new NextResponse('Errore elaborazione', { status: 500 })
  }

  return NextResponse.json({ received: true })
}
