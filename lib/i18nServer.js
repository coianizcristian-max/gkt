// ---------------------------------------------------------------------------
// GKSeason — lingua lato SERVER (route handlers: PDF, email, risposte JSON).
//
// Il middleware next-intl NON gira su /api (e' escluso dal matcher), quindi in
// una route non esiste il contesto di next-intl. Qui ricaviamo la lingua dalla
// richiesta, in ordine di affidabilita':
//   1) ?locale=xx passato esplicitamente dal client (il piu' affidabile)
//   2) cookie NEXT_LOCALE (lo scrive il middleware next-intl navigando)
//   3) prefisso lingua nel Referer (es. /en/dashboard -> 'en')
//   4) Accept-Language del browser
//   5) italiano
//
// Tutto e' avvolto in try/catch: qualunque imprevisto ricade sull'italiano,
// cioe' sul comportamento che il sito ha oggi. Nessuna route puo' rompersi
// per colpa di questo file.
// ---------------------------------------------------------------------------

import { API, PDF, MAIL } from './serverMessages'

export const LOCALES = ['it', 'en', 'de', 'es']
export const DEFAULT_LOCALE = 'it'

// Locale -> tag BCP-47 per toLocaleDateString / toLocaleTimeString.
const INTL_TAG = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

function daAcceptLanguage(header) {
  if (!header) return null
  // "de-DE,de;q=0.9,en;q=0.8" -> ['de','de','en']
  const preferite = header
    .split(',')
    .map((p) => p.split(';')[0].trim().slice(0, 2).toLowerCase())
  return preferite.find((l) => LOCALES.includes(l)) || null
}

/** Ricava la lingua dell'utente da una Request di un route handler. */
export function localeFromRequest(request) {
  try {
    if (!request) return DEFAULT_LOCALE

    // 1) parametro esplicito
    const url = new URL(request.url)
    const q = url.searchParams.get('locale')
    if (LOCALES.includes(q)) return q

    // 2) cookie scritto dal middleware next-intl
    const cookie = request.cookies?.get?.('NEXT_LOCALE')?.value
    if (LOCALES.includes(cookie)) return cookie

    // 3) prefisso lingua della pagina da cui arriva la chiamata
    const referer = request.headers?.get?.('referer')
    if (referer) {
      const seg = new URL(referer).pathname.split('/')[1]
      if (LOCALES.includes(seg)) return seg
    }

    // 4) lingua del browser
    const al = daAcceptLanguage(request.headers?.get?.('accept-language'))
    if (al) return al
  } catch {
    // ignorato di proposito: si ricade sul default
  }
  return DEFAULT_LOCALE
}

function interpola(testo, vars) {
  if (!vars) return testo
  return String(testo).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m))
}

/**
 * Traduce un messaggio di API. La chiave E' il testo italiano: se manca la
 * traduzione si ottiene l'italiano, mai undefined.
 *   return NextResponse.json({ error: tApi(request, 'Non autenticato') }, ...)
 */
export function tApi(request, testoItaliano, vars) {
  const locale = localeFromRequest(request)
  if (locale === DEFAULT_LOCALE) return interpola(testoItaliano, vars)
  const voce = API[testoItaliano]
  return interpola((voce && voce[locale]) || testoItaliano, vars)
}

/**
 * Etichette dei PDF. Uso:
 *   const t = pdfLabels(request)    // oppure pdfLabels(locale)
 *   t('durata')            -> 'Duration'
 *   t('esercizioN', {n:3}) -> 'Drill 3'
 *   t.locale               -> 'en'
 *   t.raw('mesi')          -> array dei mesi abbreviati
 */
export function pdfLabels(requestOrLocale) {
  const locale = typeof requestOrLocale === 'string' && LOCALES.includes(requestOrLocale)
    ? requestOrLocale
    : localeFromRequest(requestOrLocale)
  const dict = PDF[locale] || PDF[DEFAULT_LOCALE]
  const fallback = PDF[DEFAULT_LOCALE]

  const t = (chiave, vars) => {
    const v = dict[chiave] != null ? dict[chiave] : fallback[chiave]
    return typeof v === 'string' ? interpola(v, vars) : v != null ? v : chiave
  }
  t.locale = locale
  t.intlTag = INTL_TAG[locale] || INTL_TAG[DEFAULT_LOCALE]
  t.raw = (chiave) => (dict[chiave] != null ? dict[chiave] : fallback[chiave])
  return t
}

/** Testi delle email all'utente. Stesso contratto di pdfLabels. */
export function mailTexts(requestOrLocale) {
  const locale = typeof requestOrLocale === 'string' && LOCALES.includes(requestOrLocale)
    ? requestOrLocale
    : localeFromRequest(requestOrLocale)
  const dict = MAIL[locale] || MAIL[DEFAULT_LOCALE]
  const fallback = MAIL[DEFAULT_LOCALE]

  const t = (chiave, vars) => interpola(dict[chiave] != null ? dict[chiave] : fallback[chiave], vars)
  t.locale = locale
  t.htmlLang = locale
  return t
}

/** Tag BCP-47 per le date, a partire da una request o da un locale. */
export function intlTag(requestOrLocale) {
  const locale = typeof requestOrLocale === 'string' && LOCALES.includes(requestOrLocale)
    ? requestOrLocale
    : localeFromRequest(requestOrLocale)
  return INTL_TAG[locale] || INTL_TAG[DEFAULT_LOCALE]
}
