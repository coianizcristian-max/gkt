import { NextResponse } from 'next/server'
import { mailTexts, tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Registra una richiesta di cancellazione (art. 17 GDPR) e notifica il titolare.
// NON esegue la cancellazione: quella avviene con procedura controllata manuale
// (vedi documentazione-gdpr/05-cancellazione-account-procedura.md).
const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const TITOLARE = 'info@gkseason.it'

export async function POST(request) {
  const m = mailTexts(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato.') }, { status: 401 })

    const { data: profilo } = await supabase
      .from('profili').select('ruolo, nome_completo').eq('id', user.id).maybeSingle()

    // Log della richiesta (best-effort: se la tabella non esiste ancora, non blocca).
    try {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await admin.from('richieste_cancellazione').insert({
        user_id: user.id, email: user.email, ruolo: profilo?.ruolo ?? null, stato: 'in_attesa',
      })
    } catch (e) {
      console.warn('Log richiesta cancellazione non riuscito (tabella assente?):', e?.message)
    }

    // Abbonamento a pagamento ancora vivo? Va fermato su Stripe PRIMA di
    // cancellare l'account, altrimenti Stripe continua ad addebitare.
    let avvisoStripe = ''
    try {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      const { data: abb } = await admin.from('abbonamenti')
        .select('piano, stato, scadenza, stripe_subscription_id, stripe_customer_id')
        .eq('allenatore_id', user.id).order('created_at', { ascending: false }).limit(1)
      const a = abb?.[0]
      if (a?.stripe_subscription_id && (a.stato === 'attivo' || a.stato === 'disdetto')) {
        avvisoStripe = `<p style="color:#c0392b"><strong>ATTENZIONE: abbonamento Stripe ancora attivo</strong>
          (${a.piano}, stato ${a.stato}, subscription ${a.stripe_subscription_id}, customer ${a.stripe_customer_id}).
          Annullalo su Stripe prima di cancellare l'account.</p>`
      } else if (a) {
        avvisoStripe = `<p><strong>Abbonamento:</strong> ${a.piano} / ${a.stato}${a.stripe_customer_id ? ' (customer ' + a.stripe_customer_id + ')' : ''}</p>`
      }
    } catch (e) {
      avvisoStripe = '<p><strong>Abbonamento:</strong> non verificato, controlla su Stripe.</p>'
    }

    // Notifica al titolare + conferma all'utente.
    if (RESEND_API_KEY) {
      const nome = profilo?.nome_completo || '—'
      const ruolo = profilo?.ruolo || '—'
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MITTENTE, to: TITOLARE,
          subject: 'Richiesta cancellazione account (GDPR art. 17)',
          html: `<p>Nuova richiesta di cancellazione.</p>
                 <p><strong>Utente:</strong> ${nome} (${user.email})</p>
                 <p><strong>Ruolo:</strong> ${ruolo}</p>
                 <p><strong>User ID:</strong> ${user.id}</p>
                 ${avvisoStripe}
                 <p>Da evadere entro 30 giorni con la procedura controllata.</p>`,
        }),
      }).catch((e) => console.error('Resend (titolare) fallita:', e?.message))

      // Conferma all'utente (best-effort).
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MITTENTE, to: user.email,
          subject: m('gdprSubject'),
          html: `<p>${m('gdprSaluto')}</p>
                 <p>${m('gdprCorpo', { email: TITOLARE })}</p>
                 <p>GKSeason</p>`,
        }),
      }).catch((e) => console.error('Resend (utente) fallita:', e?.message))
    } else {
      console.warn('RESEND_API_KEY assente: richiesta registrata ma email non inviate.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Errore richiesta cancellazione:', err)
    return NextResponse.json({ error: tApi(request, 'Errore interno.') }, { status: 500 })
  }
}
