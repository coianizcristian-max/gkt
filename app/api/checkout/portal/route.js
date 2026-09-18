import { NextResponse } from 'next/server'
import { tApi, localeFromRequest, DEFAULT_LOCALE } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getAdmin, ultimaRiga, customerValido } from '@/lib/stripeAbbonamenti'

// Portale clienti Stripe: metodo di pagamento, fatture, disdetta/riattivazione.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato') }, { status: 401 })

    const riga = await ultimaRiga(getAdmin(), user.id)
    const stripe = getStripe()
    const customerId = await customerValido(stripe, riga?.stripe_customer_id)
    if (!customerId) return NextResponse.json({ error: tApi(request, 'Nessun abbonamento trovato') }, { status: 404 })

    const locale = localeFromRequest(request)
    const prefisso = locale === DEFAULT_LOCALE ? '' : `/${locale}`
    const origin = request.headers.get('origin') ?? 'https://www.gkseason.it'
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${prefisso}/abbonati`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
