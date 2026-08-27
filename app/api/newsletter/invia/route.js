import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { newsletterHtml } from '@/lib/newsletterHtml'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const REPLY_TO = 'supporto@gkseason.it'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gkseason.it').replace(/\/$/, '')
const SOCIETA = 'GKSeason'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }

export async function POST(req) {
  try {
    // Solo supervisore
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })
    const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
    if (!profilo?.supervisore) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Invio email non configurato (RESEND_API_KEY mancante).' }, { status: 503 })
    }

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID newsletter mancante.' }, { status: 400 })

    const { data: nl } = await admin.from('newsletter_invii')
      .select('id, titolo, contenuto, inviata_il, pubblicata').eq('id', id).maybeSingle()
    if (!nl) return NextResponse.json({ error: 'Newsletter non trovata.' }, { status: 404 })
    if (!nl.pubblicata) return NextResponse.json({ error: 'Pubblica la newsletter prima di inviarla.' }, { status: 400 })

    const { data: iscritti } = await admin.from('newsletter_iscritti')
      .select('id, email').eq('attivo', true)
    const destinatari = (iscritti ?? []).filter((i) => i.email)
    if (destinatari.length === 0) return NextResponse.json({ error: 'Nessun iscritto attivo.' }, { status: 400 })

    const dataStr = new Date(nl.inviata_il ?? Date.now())
      .toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

    let sent = 0
    // Resend /emails/batch: max 100 messaggi per richiesta.
    for (const gruppo of chunk(destinatari, 100)) {
      const payload = gruppo.map((i) => {
        const unsubUrl = `${SITE_URL}/api/newsletter/disiscrivi?id=${i.id}`
        return {
          from: MITTENTE,
          to: i.email,
          reply_to: REPLY_TO,
          subject: nl.titolo || 'Newsletter',
          html: newsletterHtml({ titolo: nl.titolo, sezioni: nl.contenuto, dataStr, societa: SOCIETA, unsubUrl, logoUrl: `${SITE_URL}/gk_circle.png` }),
          headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
        }
      })
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        sent += gruppo.length
      } else {
        console.error('[newsletter/invia] batch fallito:', await res.text())
      }
    }

    await admin.from('newsletter_invii')
      .update({ email_inviata_il: new Date().toISOString(), email_destinatari: sent }).eq('id', id)

    return NextResponse.json({ ok: true, sent, total: destinatari.length })
  } catch (err) {
    console.error('[newsletter/invia]', err)
    return NextResponse.json({ error: 'Errore interno durante l\'invio.' }, { status: 500 })
  }
}
