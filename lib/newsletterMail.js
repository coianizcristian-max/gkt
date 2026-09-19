// Mail della newsletter usate da piu' route (iscrivi, conferma).
// Invio via Resend. Nessuna di queste funzioni lancia eccezioni per un invio
// fallito: restituiscono false e scrivono nel log, cosi' l'iscrizione resta
// valida anche se la mail non parte.
import { benvenutoNewsletterHtml } from '@/lib/benvenutoNewsletterHtml'
import { confermaNewsletterHtml } from '@/lib/confermaNewsletterHtml'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const REPLY_TO = 'supporto@gkseason.it'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gkseason.it').replace(/\/$/, '')

/** Prefisso lingua negli URL del sito: IT senza prefisso, gli altri /en /de /es. */
export const prefissoLingua = (locale) => (locale && locale !== 'it' ? `/${locale}` : '')

async function invia(payload, contesto) {
  if (!RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) console.error(`[newsletter] ${contesto} non inviata:`, await res.text())
  return res.ok
}

/**
 * Mail di conferma (doppio opt-in) per il form della home. Essenziale di
 * proposito: un solo pulsante. La lingua viaggia nel link (l=) cosi' la
 * pagina e la mail di benvenuto dopo il clic restano nella stessa lingua.
 */
export async function inviaConferma(email, id, m) {
  const link = `${SITE_URL}/api/newsletter/conferma?id=${id}&l=${m.locale || 'it'}`
  const html = confermaNewsletterHtml({ m, siteUrl: SITE_URL, link })
  return invia({ from: MITTENTE, to: email, reply_to: REPLY_TO, subject: m('nlSubject'), html }, 'conferma')
}

/**
 * Mail di benvenuto.
 *  variante 'demo' (default): chi si iscrive dal popup della demo -> ha gia'
 *    visto la demo, il pulsante principale e' "Crea il tuo account".
 *  variante 'home': chi conferma dal form della home -> la demo non l'ha
 *    vista, il pulsante principale e' "Guarda la stagione demo".
 */
export async function inviaBenvenuto(email, id, m, { variante = 'demo' } = {}) {
  const pref = prefissoLingua(m.locale)
  const utm = `utm_source=newsletter&utm_medium=email&utm_campaign=benvenuto${variante === 'home' ? '_home' : ''}`
  const unsub = `${SITE_URL}/api/newsletter/disiscrivi?id=${id}&l=${m.locale || 'it'}`
  const html = benvenutoNewsletterHtml({
    m, siteUrl: SITE_URL, variante,
    links: {
      registrati: `${SITE_URL}${pref}/registrati?${utm}`,
      demo: `${SITE_URL}/d?${utm}`,
      unsub,
      sito: `${SITE_URL}${pref || '/'}`,
    },
  })
  return invia({
    from: MITTENTE, to: email, reply_to: REPLY_TO, subject: m('nlBvSubject'), html,
    headers: { 'List-Unsubscribe': `<${unsub}>` },
  }, 'benvenuto')
}

/**
 * Aggiorna la riga dell'iscritto. Se alcune colonne non esistono ancora
 * (migrazioni non eseguite) riprova togliendo prima 'fonte', poi salva almeno
 * lo stato attivo: l'iscrizione non deve mai fallire per una colonna mancante.
 */
export async function salvaConsenso(admin, id, dati) {
  const tentativi = [dati]
  if ('fonte' in dati) {
    const { fonte, ...senzaFonte } = dati
    tentativi.push(senzaFonte)
  }
  tentativi.push({ attivo: dati.attivo })
  let ultimoErrore = null
  for (const d of tentativi) {
    const { error } = await admin.from('newsletter_iscritti').update(d).eq('id', id)
    if (!error) return
    ultimoErrore = error
  }
  throw ultimoErrore
}

/** Fonte di arrivo inviata dal browser: parola breve, minuscola, oppure null. */
export function pulisciFonte(v) {
  if (typeof v !== 'string') return null
  const f = v.trim().toLowerCase().slice(0, 40)
  return /^[a-z0-9_.-]+$/.test(f) ? f : null
}
