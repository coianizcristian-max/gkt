import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const OK = ['it', 'en', 'de', 'es']

// Salva la lingua preferita dell'utente autenticato su profili.lingua.
// Usa il client admin (service_role) per bypassare le RLS, ma agisce SOLO
// sulla riga dell'utente loggato (scoped su user.id).
export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  let lingua = null
  try { lingua = (await req.json())?.lingua } catch (e) { lingua = null }
  if (!OK.includes(lingua)) return NextResponse.json({ ok: false }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { error } = await admin.from('profili').update({ lingua }).eq('id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
