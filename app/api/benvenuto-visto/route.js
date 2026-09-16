import { NextResponse } from 'next/server'
import { tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato.') }, { status: 401 })

  // Client admin: un portiere non può aggiornare il proprio profilo via RLS,
  // quindi con il client normale l'update fallirebbe in silenzio e il popup
  // di benvenuto ricomparirebbe a ogni accesso. Scriviamo solo sul suo id.
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await admin.from('profili').update({ benvenuto_visto: true }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
