import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

  const { voci } = await request.json() // [{ chiave, ordine, label }]
  if (!Array.isArray(voci)) return NextResponse.json({ error: 'Payload non valido.' }, { status: 400 })

  const { error } = await supabase
    .from('sidebar_ordine')
    .upsert(voci.map((v) => ({ chiave: v.chiave, ordine: v.ordine, label: v.label })),
      { onConflict: 'chiave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
