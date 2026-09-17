import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDemoConfig, COOKIE_DEMO, COOKIE_DEMO_AVVISO } from '@/lib/demo'

/**
 * Gestisce l'ingresso e l'uscita dalla modalita' demo.
 * Il cookie e' httpOnly e di sessione: sparisce chiudendo il browser.
 * Nessuna scrittura sui dati: l'unico campo toccato e' il contatore
 * degli avvisi sul profilo di chi guarda.
 */
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const { azione } = await request.json().catch(() => ({}))
  const store = await cookies()

  // Uscire dalla demo e' sempre permesso, senza altri controlli.
  if (azione === 'esci') {
    store.delete(COOKIE_DEMO)
    store.delete(COOKIE_DEMO_AVVISO)
    return NextResponse.json({ ok: true, demo: false })
  }

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, demo_avvisi_visti').eq('id', user.id).maybeSingle()

  // La demo e' riservata ai preparatori.
  if (profilo?.ruolo !== 'allenatore') {
    return NextResponse.json({ error: 'Modalita' + "'" + ' demo non disponibile.' }, { status: 403 })
  }

  const cfg = await getDemoConfig()
  if (!cfg.attiva || !cfg.ownerId) {
    return NextResponse.json({ error: 'Modalita' + "'" + ' demo non attiva.' }, { status: 403 })
  }
  // L'utente proprietario della demo non entra in sola lettura: usa i suoi dati.
  if (user.id === cfg.ownerId) {
    return NextResponse.json({ error: 'Sei gia' + "'" + ' il proprietario della stagione demo.' }, { status: 400 })
  }

  if (azione === 'entra') {
    store.set(COOKIE_DEMO, '1', {
      httpOnly: true, sameSite: 'lax', path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    // nuovo ingresso: il popup di benvenuto deve tornare a comparire
    store.delete(COOKIE_DEMO_AVVISO)
    return NextResponse.json({ ok: true, demo: true })
  }

  if (azione === 'avviso-visto') {
    // Solo per questo ingresso: al prossimo accesso alla demo il popup torna.
    store.set(COOKIE_DEMO_AVVISO, '1', {
      httpOnly: true, sameSite: 'lax', path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Azione non riconosciuta.' }, { status: 400 })
}
