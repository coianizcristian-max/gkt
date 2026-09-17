import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const AMMESSE = ['attiva', 'data_taglio', 'avvisi_ingresso', 'owner_email', 'stagione_id']

/** Scrive demo_config. Solo supervisori. */
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

  const patch = await request.json().catch(() => ({}))
  const righe = Object.entries(patch)
    .filter(([k]) => AMMESSE.includes(k))
    .map(([chiave, valore]) => ({ chiave, valore: String(valore ?? ''), updated_at: new Date().toISOString(), updated_by: user.id }))

  if (righe.length === 0) return NextResponse.json({ error: 'Nessun parametro valido.' }, { status: 400 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await admin.from('demo_config').upsert(righe, { onConflict: 'chiave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
