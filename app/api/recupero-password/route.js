import { NextResponse } from 'next/server'

// Richiesta di reimpostazione password fatta dal SERVER, non dal browser.
//
// Perche': il client Supabase del browser usa il flusso PKCE e in quel caso il
// token nella mail nasce col prefisso "pkce_", legato al browser che ha fatto la
// richiesta: il link funziona solo li'. Chiamando /auth/v1/recover dal server il
// token e' normale, quindi il link della mail vale in qualsiasi browser, anche
// aprendola dall'app Gmail.
export async function POST(request) {
  let corpo
  try { corpo = await request.json() } catch { corpo = {} }
  const email = String(corpo?.email ?? '').trim().toLowerCase()
  const captchaToken = corpo?.captchaToken || null
  if (!email) return NextResponse.json({ error: 'email mancante' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const origine = new URL(request.url).origin

  try {
    const res = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${origine}/auth/callback?next=/reset-password`)}`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        ...(captchaToken ? { gotrue_meta_security: { captcha_token: captchaToken } } : {}),
      }),
    })
    if (!res.ok) {
      const dettaglio = await res.text()
      console.warn('[recupero-password] Supabase:', res.status, dettaglio)
      // Non si rivela se l'indirizzo esiste: l'unico errore utile e' il limite di invii.
      const troppe = res.status === 429 || dettaglio.includes('rate_limit')
      return NextResponse.json({ error: troppe ? 'troppe_richieste' : 'errore' }, { status: troppe ? 429 : 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[recupero-password] errore rete:', err?.message)
    return NextResponse.json({ error: 'errore' }, { status: 500 })
  }
}
