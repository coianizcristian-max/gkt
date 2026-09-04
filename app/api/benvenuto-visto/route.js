import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  await supabase.from('profili').update({ benvenuto_visto: true }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
