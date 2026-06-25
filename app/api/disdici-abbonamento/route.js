import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  // Trova abbonamento attivo
  const { data: abb, error: selErr } = await supabase
    .from('abbonamenti')
    .select('id, piano, scadenza')
    .eq('allenatore_id', user.id)
    .eq('stato', 'attivo')
    .maybeSingle()

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })
  if (!abb) return NextResponse.json({ error: 'Nessun abbonamento attivo da disdire.' }, { status: 404 })
  if (abb.piano === 'lifetime') {
    return NextResponse.json({ error: 'Il piano Lifetime non può essere disdetto.' }, { status: 400 })
  }

  // Imposta stato = 'disdetto' — rimane attivo fino alla scadenza
  const { error: updErr } = await supabase
    .from('abbonamenti')
    .update({ stato: 'disdetto' })
    .eq('id', abb.id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    scadenza: abb.scadenza,
  })
}
