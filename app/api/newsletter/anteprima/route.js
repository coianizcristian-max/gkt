import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { newsletterHtml } from '@/lib/newsletterHtml'

// Anteprima della VERA email (stesso render di newsletterHtml) senza inviare
// nulla. Solo supervisore. Si apre in una scheda del browser.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gkseason.it').replace(/\/$/, '')
const SOCIETA = 'GKSeason'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const testo = (msg, status = 200) => new NextResponse(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return testo('Non autenticato.', 401)
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) return testo('Non autorizzato.', 403)

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return testo('ID mancante.', 400)

  const { data: nl } = await admin.from('newsletter_invii')
    .select('titolo, contenuto, inviata_il').eq('id', id).maybeSingle()
  if (!nl) return testo('Newsletter non trovata.', 404)

  const dataStr = new Date(nl.inviata_il ?? Date.now())
    .toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = newsletterHtml({
    titolo: nl.titolo, sezioni: nl.contenuto, dataStr,
    societa: SOCIETA, unsubUrl: '#', logoUrl: `${SITE_URL}/gk_circle_white.png`,
  })
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
