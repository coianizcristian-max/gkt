import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function getAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function checkSupervisore(supabase, user) {
  if (!user) return false
  const { data } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  return !!data?.supervisore
}

// POST: crea coupon
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!await checkSupervisore(supabase, user))
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { codice, durata_gg } = await request.json()
  if (!codice?.trim()) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })

  const admin = getAdmin()
  const { error } = await admin.from('coupon').insert({
    codice: codice.trim().toUpperCase(),
    durata_gg: Number(durata_gg) || 30,
    attivo: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// PATCH: toggle attivo
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!await checkSupervisore(supabase, user))
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id, attivo } = await request.json()
  const admin = getAdmin()
  const { error } = await admin.from('coupon').update({ attivo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
