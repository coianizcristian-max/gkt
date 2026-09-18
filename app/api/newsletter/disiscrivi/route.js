import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { mailTexts, LOCALES } from '@/lib/i18nServer'
import { prefissoLingua } from '@/lib/newsletterMail'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Link "Disiscriviti" / "Annulla l'iscrizione" nelle mail e intestazione
 * List-Unsubscribe. Disattiva l'iscrizione (non cancella la riga) e porta
 * alla pagina /iscrizione-newsletter del sito. La lingua arriva da l= se presente
 * (mail di benvenuto), altrimenti dal browser.
 */
export async function GET(req) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const l = url.searchParams.get('l')
  const locale = mailTexts(LOCALES.includes(l) ? l : req).locale
  const vai = (esito) =>
    NextResponse.redirect(new URL(`${prefissoLingua(locale)}/iscrizione-newsletter?esito=${esito}`, req.url))

  if (!id || !UUID_RE.test(id)) return vai('errore')
  const { error } = await admin.from('newsletter_iscritti').update({ attivo: false }).eq('id', id)
  if (error) return vai('errore')
  return vai('disiscritto')
}
