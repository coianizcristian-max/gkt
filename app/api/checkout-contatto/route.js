import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    const { allenatoreId } = await request.json()
    if (!allenatoreId) return NextResponse.json({ error: 'allenatoreId mancante' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Accedi prima di procedere' }, { status: 401 })

    // Importo fee dal config
    const { data: feeRow } = await supabase
      .from('funzionalita_config').select('label').eq('chiave', 'fee_contatto_importo').maybeSingle()
    const importoEur = parseFloat((feeRow?.label ?? '2.90').replace(',', '.'))
    const importoCent = Math.round(importoEur * 100)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = request.headers.get('origin') ?? 'https://gkt2026.vercel.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: importoCent,
          product_data: { name: 'Sblocco contatti allenatore GKSeason' },
        },
        quantity: 1,
      }],
      success_url: `${origin}/allenatori/${allenatoreId}/contatto?success=1`,
      cancel_url: `${origin}/allenatori/${allenatoreId}/contatto`,
      metadata: { tipo: 'contatto_allenatore', acquirente_id: user.id, allenatore_id: allenatoreId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('checkout-contatto error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
