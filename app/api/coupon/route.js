import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { hasAbbonamento } from '@/lib/gating'

function getAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(request) {
  try {
    const { codice } = await request.json()
    if (!codice?.trim()) return NextResponse.json({ error: 'Inserisci un codice' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    if (!rateLimit(`coupon:${user.id}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 })
    }

    const admin = getAdmin()

    // Cerca il coupon
    const { data: coupon } = await admin.from('coupon')
      .select('id, codice, tipo, durata_gg, attivo, scadenza_attivazione, max_utilizzi, target_abbonamento')
      .eq('codice', codice.trim().toUpperCase()).maybeSingle()
    if (!coupon || !coupon.attivo) return NextResponse.json({ error: 'Codice non valido o scaduto' }, { status: 404 })

    if (coupon.tipo === 'sconto_stripe') {
      return NextResponse.json({ error: 'Questo codice è uno sconto: inseriscilo nella pagina di pagamento al momento dell\'abbonamento, non qui.' }, { status: 400 })
    }

    if (coupon.scadenza_attivazione && new Date() > new Date(coupon.scadenza_attivazione + 'T23:59:59')) {
      return NextResponse.json({ error: 'Il periodo per attivare questo codice è scaduto.' }, { status: 410 })
    }

    if (coupon.target_abbonamento && coupon.target_abbonamento !== 'tutti') {
      const abbonato = await hasAbbonamento(supabase, user.id)
      if (coupon.target_abbonamento === 'abbonati' && !abbonato) {
        return NextResponse.json({ error: 'Questo coupon è riservato a chi ha già un abbonamento attivo.' }, { status: 403 })
      }
      if (coupon.target_abbonamento === 'non_abbonati' && abbonato) {
        return NextResponse.json({ error: 'Questo coupon è riservato a chi non ha ancora un abbonamento attivo.' }, { status: 403 })
      }
    }

    // Controlla se già usato da questo utente — SEMPRE una sola volta, per
    // sempre, anche se il precedente riscatto è già scaduto (non è un
    // "rinnovabile", è un vantaggio una tantum).
    const { data: gia } = await admin.from('coupon_utilizzi')
      .select('id, scade_il').eq('coupon_id', coupon.id).eq('utente_id', user.id).maybeSingle()
    if (gia) {
      const scade = new Date(gia.scade_il)
      const messaggio = scade > new Date()
        ? 'Hai già usato questo coupon. Scade il ' + scade.toLocaleDateString('it-IT')
        : 'Hai già usato questo coupon in passato (scaduto il ' + scade.toLocaleDateString('it-IT') + '). Ogni coupon si può riscattare una sola volta.'
      return NextResponse.json({ error: messaggio }, { status: 409 })
    }

    // Controlla limite utilizzi
    if (coupon.max_utilizzi) {
      const { count } = await admin.from('coupon_utilizzi')
        .select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id)
      if ((count ?? 0) >= coupon.max_utilizzi) {
        return NextResponse.json({ error: 'Limite di utilizzi di questo coupon raggiunto.' }, { status: 410 })
      }
    }

    // Attiva coupon
    const scade_il = new Date()
    scade_il.setDate(scade_il.getDate() + coupon.durata_gg)

    const { error: insErr } = await admin.from('coupon_utilizzi').insert({
      coupon_id: coupon.id,
      utente_id: user.id,
      scade_il: scade_il.toISOString(),
    })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, scade_il: scade_il.toISOString(), durata_gg: coupon.durata_gg })
  } catch (err) {
    console.error('coupon error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: verifica coupon attivo per l'utente corrente
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ attivo: false })

  const { data } = await supabase.from('coupon_utilizzi')
    .select('scade_il, coupon:coupon_id(codice, durata_gg)')
    .eq('utente_id', user.id)
    .gt('scade_il', new Date().toISOString())
    .order('scade_il', { ascending: false }).limit(1).maybeSingle()

  if (!data) return NextResponse.json({ attivo: false })
  const giRimasti = Math.ceil((new Date(data.scade_il) - new Date()) / (1000 * 60 * 60 * 24))
  return NextResponse.json({ attivo: true, scade_il: data.scade_il, giorni_rimasti: giRimasti })
}
