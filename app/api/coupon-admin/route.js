import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function checkSupervisore(supabase, user) {
  if (!user) return false
  const { data } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  return !!data?.supervisore
}

// POST: crea coupon (accesso gratuito o sconto Stripe)
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!await checkSupervisore(supabase, user))
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await request.json()
  const { codice, tipo = 'accesso_gratuito', scadenza_attivazione, max_utilizzi } = body
  if (!codice?.trim()) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })
  const codiceNorm = codice.trim().toUpperCase()

  const admin = getAdmin()

  if (tipo === 'sconto_stripe') {
    const scontoPercento = Number(body.sconto_percento)
    const scontoMesi = Number(body.sconto_mesi)
    if (!scontoPercento || scontoPercento < 1 || scontoPercento > 100) {
      return NextResponse.json({ error: 'Percentuale di sconto non valida' }, { status: 400 })
    }
    if (!scontoMesi || scontoMesi < 1) {
      return NextResponse.json({ error: 'Numero di mesi non valido' }, { status: 400 })
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

      const stripeCoupon = await stripe.coupons.create({
        percent_off: scontoPercento,
        duration: 'repeating',
        duration_in_months: scontoMesi,
        name: `${codiceNorm} — ${scontoPercento}% per ${scontoMesi} mesi`,
      })

      const promoParams = { coupon: stripeCoupon.id, code: codiceNorm }
      if (max_utilizzi) promoParams.max_redemptions = Number(max_utilizzi)
      if (scadenza_attivazione) promoParams.expires_at = Math.floor(new Date(scadenza_attivazione).getTime() / 1000)

      const promo = await stripe.promotionCodes.create(promoParams)

      const { error } = await admin.from('coupon').insert({
        codice: codiceNorm,
        tipo: 'sconto_stripe',
        sconto_percento: scontoPercento,
        sconto_mesi: scontoMesi,
        scadenza_attivazione: scadenza_attivazione || null,
        max_utilizzi: max_utilizzi ? Number(max_utilizzi) : null,
        stripe_coupon_id: stripeCoupon.id,
        stripe_promotion_code_id: promo.id,
        attivo: true,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('stripe coupon error:', err)
      return NextResponse.json({ error: 'Errore Stripe: ' + err.message }, { status: 400 })
    }
  }

  // tipo === 'accesso_gratuito'
  const { error } = await admin.from('coupon').insert({
    codice: codiceNorm,
    tipo: 'accesso_gratuito',
    durata_gg: Number(body.durata_gg) || 30,
    scadenza_attivazione: scadenza_attivazione || null,
    max_utilizzi: max_utilizzi ? Number(max_utilizzi) : null,
    attivo: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// PATCH: toggle attivo (sincronizza anche il promotion code Stripe se presente)
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!await checkSupervisore(supabase, user))
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id, attivo } = await request.json()
  const admin = getAdmin()

  const { data: riga } = await admin.from('coupon').select('stripe_promotion_code_id').eq('id', id).maybeSingle()
  if (riga?.stripe_promotion_code_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      await stripe.promotionCodes.update(riga.stripe_promotion_code_id, { active: attivo })
    } catch (err) {
      console.error('stripe promotion code toggle error:', err)
      return NextResponse.json({ error: 'Errore Stripe: ' + err.message }, { status: 400 })
    }
  }

  const { error } = await admin.from('coupon').update({ attivo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
