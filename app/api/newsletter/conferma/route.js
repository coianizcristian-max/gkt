import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { mailTexts, LOCALES } from '@/lib/i18nServer'
import { inviaBenvenuto, salvaConsenso, prefissoLingua } from '@/lib/newsletterMail'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Clic sul pulsante della mail di conferma (form della home).
 * Attiva l'iscrizione, registra data e origine del consenso, manda la mail
 * di benvenuto (variante 'home') e porta alla pagina /iscrizione-newsletter del sito.
 * Un secondo clic sullo stesso link non rimanda la mail di benvenuto.
 */
export async function GET(req) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const l = url.searchParams.get('l')
  const m = mailTexts(LOCALES.includes(l) ? l : req)
  const vai = (esito) =>
    NextResponse.redirect(new URL(`${prefissoLingua(m.locale)}/iscrizione-newsletter?esito=${esito}`, req.url))

  if (!id || !UUID_RE.test(id)) return vai('errore')

  try {
    const { data: riga, error } = await admin.from('newsletter_iscritti')
      .select('id, email, attivo').eq('id', id).maybeSingle()
    if (error || !riga) return vai('errore')

    // Gia' confermato: niente da fare, niente seconda mail.
    if (riga.attivo) return vai('confermata')

    await salvaConsenso(admin, id, {
      attivo: true,
      consenso_il: new Date().toISOString(),
      origine: 'home',
    })
    try { await inviaBenvenuto(riga.email, id, m, { variante: 'home' }) }
    catch (e) { console.error('[newsletter/conferma] benvenuto', e) }

    return vai('confermata')
  } catch (e) {
    console.error('[newsletter/conferma]', e)
    return vai('errore')
  }
}
