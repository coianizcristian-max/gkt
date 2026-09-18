import { NextResponse } from 'next/server'
import { tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getAdmin, ultimaRiga, syncSubscription } from '@/lib/stripeAbbonamenti'

// Disdetta: l'abbonamento NON si rinnova più ma resta attivo fino a scadenza.
// Prima si cambiava solo lo stato nel DB e Stripe continuava ad addebitare
// (e al rinnovo il webhook rimetteva 'attivo'). Ora la disdetta parte da
// Stripe (cancel_at_period_end) e il DB viene riallineato da Stripe stesso.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato.') }, { status: 401 })

  try {
    const admin = getAdmin()
    const riga = await ultimaRiga(admin, user.id)
    if (!riga || riga.stato !== 'attivo') {
      return NextResponse.json({ error: tApi(request, 'Nessun abbonamento attivo da disdire.') }, { status: 404 })
    }
    if (riga.piano === 'lifetime') {
      return NextResponse.json({ error: tApi(request, 'Il piano Lifetime non può essere disdetto.') }, { status: 400 })
    }

    if (riga.stripe_subscription_id) {
      const stripe = getStripe()
      await stripe.subscriptions.update(riga.stripe_subscription_id, { cancel_at_period_end: true })
      await syncSubscription(admin, stripe, riga.stripe_subscription_id, { userIdAtteso: user.id })
      const dopo = await ultimaRiga(admin, user.id)
      return NextResponse.json({ ok: true, scadenza: dopo?.scadenza ?? riga.scadenza })
    }

    // Abbonamento manuale (creato dal Supervisore, senza Stripe): solo DB.
    const { error } = await admin.from('abbonamenti').update({ stato: 'disdetto' }).eq('id', riga.id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, scadenza: riga.scadenza })
  } catch (err) {
    console.error('disdici-abbonamento error:', err)
    return NextResponse.json({ error: tApi(request, 'Impossibile disdire in questo momento, riprova tra poco.') }, { status: 500 })
  }
}
