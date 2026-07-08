import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Chiamata dall'editor del sito subito dopo ogni salvataggio/eliminazione di
// una sezione, per far vedere la modifica in home immediatamente invece di
// aspettare il refresh automatico della cache (fino a 60 secondi).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
