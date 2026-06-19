import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

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

    const admin = getAdmin()

    // Cerca il coupon
    const { data: coupon } = await admin.from('coupon')
      .select('id, codice, durata_gg, attivo').eq('codice', codice.trim().toUpperCase()).maybeSingle()
    if (!coupon || !coupon.attivo) return NextResponse.json({ error: 'Codice non valido o scaduto' }, { status: 404 })

    // Controlla se già usato da questo utente
    const { data: gia } = await admin.from('coupon_utilizzi')
      .select('id, scade_il').eq('coupon_id', coupon.id).eq('utente_id', user.id).maybeSingle()
    if (gia) {
      const scade = new Date(gia.scade_il)
      if (scade > new Date()) return NextResponse.json({ error: 'Hai già usato questo coupon. Scade il ' + scade.toLocaleDateString('it-IT') }, { status: 409 })
    }

    // Attiva coupon
    const scade_il = new Date()
    scade_il.setDate(scade_il.getDate() + coupon.durata_gg)

    await admin.from('coupon_utilizzi').upsert({
      coupon_id: coupon.id,
      utente_id: user.id,
      scade_il: scade_il.toISOString(),
    }, { onConflict: 'utente_id,coupon_id' })

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
