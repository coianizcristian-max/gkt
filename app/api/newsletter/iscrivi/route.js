import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { mailTexts, tApi } from '@/lib/i18nServer'
import { benvenutoNewsletterHtml } from '@/lib/benvenutoNewsletterHtml'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gkseason.it').replace(/\/$/, '')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function inviaConferma(email, id, m) {
  if (!RESEND_API_KEY) return false
  const link = `${SITE_URL}/api/newsletter/conferma?id=${id}`
  const html = `<!doctype html><html lang="${m.htmlLang}"><body style="margin:0;padding:24px 0;background:#eef2f5;">
    <div style="max-width:520px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td bgcolor="#0a5a8a" style="background-color:#0a5a8a;padding:28px 32px;color:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#cfe4f2;">${m('nlEyebrow')}</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;">${m('nlTitolo')}</h1>
        </td>
      </tr></table>
      <div style="padding:28px 32px;color:#2a3b47;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 16px;">${m('nlTesto')}</p>
        <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#0a7ec2;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;">${m('nlBottone')}</a></p>
        <p style="margin:0;font-size:12px;color:#8899a8;">${m('nlDisclaimer')}</p>
      </div>
    </div></body></html>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MITTENTE, to: email, subject: m('nlSubject'), html }),
  })
  return res.ok
}

const REPLY_TO = 'supporto@gkseason.it'

/**
 * Mail di benvenuto per l'iscrizione immediata (popup demo). Non chiede
 * conferme: avvisa che l'iscrizione e' avvenuta e da' subito il link per
 * annullarla, cosi' chi si ritrova iscritto con la propria email da qualcun
 * altro puo' uscire con un clic. Se l'invio fallisce l'iscrizione resta valida.
 */
async function inviaBenvenuto(email, id, m) {
  if (!RESEND_API_KEY) return false
  const pref = m.locale && m.locale !== 'it' ? `/${m.locale}` : ''
  const unsub = `${SITE_URL}/api/newsletter/disiscrivi?id=${id}`
  const registrati = `${SITE_URL}${pref}/registrati?utm_source=newsletter&utm_medium=email&utm_campaign=benvenuto`
  const demo = `${SITE_URL}/d?utm_source=newsletter&utm_medium=email&utm_campaign=benvenuto`
  const html = benvenutoNewsletterHtml({
    m, siteUrl: SITE_URL,
    links: { registrati, demo, unsub, sito: `${SITE_URL}${pref || '/'}` },
  })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: MITTENTE, to: email, reply_to: REPLY_TO, subject: m('nlBvSubject'), html,
      headers: { 'List-Unsubscribe': `<${unsub}>` },
    }),
  })
  if (!res.ok) console.error('[newsletter/iscrivi] benvenuto non inviato:', await res.text())
  return res.ok
}

const ORIGINI = ['demo']

/**
 * Registra l'iscrizione. Due modalita':
 *  - standard (form del sito): riga inattiva + email di conferma (doppio opt-in)
 *  - immediata (popup della demo da /d): il consenso e' l'atto del visitatore
 *    che scrive l'email e preme il pulsante con l'informativa sotto al campo;
 *    la riga nasce gia' attiva e si registrano data e origine del consenso.
 */
async function salvaConsenso(id, dati) {
  const { error } = await admin.from('newsletter_iscritti').update(dati).eq('id', id)
  if (!error) return
  // Colonne consenso_il/origine non ancora create (migrazione non eseguita):
  // l'iscrizione non deve fallire per questo.
  const { attivo } = dati
  const { error: e2 } = await admin.from('newsletter_iscritti').update({ attivo }).eq('id', id)
  if (e2) throw e2
}

export async function POST(req) {
  try {
    const m = mailTexts(req)
    const { email, immediata, origine } = await req.json()
    const em = (email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(em)) return NextResponse.json({ error: tApi(req, 'Email non valida.') }, { status: 400 })

    const { data: esistente } = await admin.from('newsletter_iscritti')
      .select('id, attivo').eq('email', em).maybeSingle()

    // Già iscritto e attivo: non facciamo nulla (niente downgrade, niente email).
    if (esistente?.attivo) return NextResponse.json({ ok: true, stato: 'gia_iscritto' })

    if (immediata === true) {
      const consenso = {
        attivo: true,
        consenso_il: new Date().toISOString(),
        origine: ORIGINI.includes(origine) ? origine : 'demo',
      }
      let id = esistente?.id
      if (!id) {
        const { data: nuovo, error } = await admin.from('newsletter_iscritti')
          .insert({ email: em, attivo: true }).select('id').single()
        if (error) throw error
        id = nuovo.id
      }
      await salvaConsenso(id, consenso)
      // Qui si arriva solo se NON era gia' iscritto e attivo (quel caso esce
      // prima): la mail parte una volta sola per persona.
      try { await inviaBenvenuto(em, id, m) } catch (e) { console.error('[newsletter/iscrivi] benvenuto', e) }
      return NextResponse.json({ ok: true, stato: 'iscritto' })
    }

    // Esiste ma non confermato -> rimandiamo la conferma; non esiste -> lo creiamo inattivo.
    let id = esistente?.id
    if (!id) {
      const { data: nuovo, error } = await admin.from('newsletter_iscritti')
        .insert({ email: em, attivo: false }).select('id').single()
      if (error) throw error
      id = nuovo.id
    }
    await inviaConferma(em, id, m)
    return NextResponse.json({ ok: true, stato: 'conferma_inviata' })
  } catch (err) {
    console.error('[newsletter/iscrivi]', err)
    return NextResponse.json({ error: tApi(req, 'Errore interno.') }, { status: 500 })
  }
}
