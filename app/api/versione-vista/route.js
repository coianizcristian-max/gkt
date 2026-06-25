import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const { versione_id } = await request.json()
  if (!versione_id) return NextResponse.json({ error: 'versione_id mancante.' }, { status: 400 })

  await supabase.from('versioni_viste').upsert(
    { user_id: user.id, versione_id },
    { onConflict: 'user_id,versione_id' }
  )

  return NextResponse.json({ ok: true })
}
