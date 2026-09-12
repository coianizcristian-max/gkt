import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Registra la scelta cookie dell'utente per poterla DIMOSTRARE (accountability,
// art. 5.2 e 7 GDPR). Minimizzazione: nessun IP, nessun user-agent; solo un
// consent_id casuale, la scelta, la versione, e user_id se l'utente è loggato.
// Best-effort: non blocca mai il banner.
export async function POST(req) {
  try {
    const { consent_id, scelta, versione, categorie } = await req.json()
    if (scelta !== 'accepted' && scelta !== 'rejected') {
      return NextResponse.json({ error: 'Scelta non valida.' }, { status: 400 })
    }

    let userId = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {}

    try {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await admin.from('consensi_cookie').insert({
        consent_id: consent_id ?? null,
        user_id: userId,
        scelta,
        versione: versione ?? null,
        categorie: categorie ?? null,
      })
    } catch (e) {
      console.warn('Log consenso cookie non riuscito (tabella assente?):', e?.message)
      return NextResponse.json({ ok: true, logged: false })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, logged: false })
  }
}
