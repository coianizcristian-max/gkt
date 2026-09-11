import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

// Fallback per-chiave: qualsiasi testo non ancora tradotto in en/de ricade
// sull'italiano, cosi' durante il rollout non vedrai MAI un testo vuoto.
function deepMerge(base, over) {
  const out = { ...base }
  for (const k of Object.keys(over || {})) {
    if (
      over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) &&
      base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], over[k])
    } else {
      out[k] = over[k]
    }
  }
  return out
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale
  }

  const italian = (await import('../messages/it.json')).default
  const messages =
    locale === 'it'
      ? italian
      : deepMerge(italian, (await import(`../messages/${locale}.json`)).default)

  return { locale, messages }
})
