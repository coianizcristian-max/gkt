import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Verifica dei link nelle mail di Supabase con token_hash (es. recupero
// password). A differenza di /auth/callback (?code=, flusso PKCE) NON dipende
// dal browser in cui e' stata fatta la richiesta: funziona anche se la mail
// si apre dall'app Gmail, da un altro browser o da un altro dispositivo.
//
// Modello mail "Reset password" su Supabase:
//   {{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
//
// Link non valido, scaduto o gia' usato -> /login?link=scaduto (messaggio chiaro).

const TIPI = ['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']

// Solo percorsi interni del sito (niente redirect verso altri domini)
function destinazioneSicura(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = destinazioneSicura(searchParams.get('next') ?? (type === 'recovery' ? '/reset-password' : '/dashboard'))

  if (tokenHash && TIPI.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.warn('[auth/conferma] verifica fallita:', error.code || error.message)
  }
  return NextResponse.redirect(`${origin}/login?link=scaduto`)
}
