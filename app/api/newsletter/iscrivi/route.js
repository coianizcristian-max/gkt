import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gkseason.it').replace(/\/$/, '')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function inviaConferma(email, id) {
  if (!RESEND_API_KEY) return false
  const link = `${SITE_URL}/api/newsletter/conferma?id=${id}`
  const html = `<!doctype html><html><body style="margin:0;padding:24px 0;background:#eef2f5;">
    <div style="max-width:520px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td bgcolor="#0a5a8a" style="background-color:#0a5a8a;padding:28px 32px;color:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#cfe4f2;">GKSeason &middot; Newsletter</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;">Conferma la tua iscrizione</h1>
        </td>
      </tr></table>
      <div style="padding:28px 32px;color:#2a3b47;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 16px;">Ci sei quasi! Clicca il pulsante qui sotto per confermare l'iscrizione alla newsletter GKSeason.</p>
        <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#0a7ec2;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;">Conferma iscrizione</a></p>
        <p style="margin:0;font-size:12px;color:#8899a8;">Se non hai richiesto tu questa iscrizione, ignora pure questa email: senza conferma non riceverai nulla.</p>
      </div>
    </div></body></html>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MITTENTE, to: email, subject: 'Conferma la tua iscrizione alla newsletter GKSeason', html }),
  })
  return res.ok
}

export async function POST(req) {
  try {
    const { email } = await req.json()
    const em = (email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(em)) return NextResponse.json({ error: 'Email non valida.' }, { status: 400 })

    const { data: esistente } = await admin.from('newsletter_iscritti')
      .select('id, attivo').eq('email', em).maybeSingle()

    // Già iscritto e attivo: non facciamo nulla (niente downgrade, niente email).
    if (esistente?.attivo) return NextResponse.json({ ok: true, stato: 'gia_iscritto' })

    // Esiste ma non confermato -> rimandiamo la conferma; non esiste -> lo creiamo inattivo.
    let id = esistente?.id
    if (!id) {
      const { data: nuovo, error } = await admin.from('newsletter_iscritti')
        .insert({ email: em, attivo: false }).select('id').single()
      if (error) throw error
      id = nuovo.id
    }
    await inviaConferma(em, id)
    return NextResponse.json({ ok: true, stato: 'conferma_inviata' })
  } catch (err) {
    console.error('[newsletter/iscrivi]', err)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
