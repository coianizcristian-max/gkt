import { createClient as createPublicClient } from '@supabase/supabase-js'

// La sitemap gira SENZA utente loggato: usa la RPC elenco_allenatori_pubblici
// (SECURITY DEFINER, espone solo id e created_at) per bypassare le RLS.
const BASE = 'https://www.gkseason.it'
const LOCALES = ['it', 'en', 'de', 'es']
const DEFAULT = 'it'

function url(locale, path) {
  const prefix = locale === DEFAULT ? '' : `/${locale}`
  const p = path === '/' ? '' : path
  return `${BASE}${prefix}${p}` || BASE
}

// Mappa hreflang { it, en, de, x-default } per un dato percorso.
function languages(path) {
  const out = {}
  for (const l of LOCALES) out[l] = url(l, path)
  out['x-default'] = url(DEFAULT, path)
  return out
}

function getPublicClient() {
  return createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function sitemap() {
  const staticDefs = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/cerca-allenatori', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/domande-frequenti', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/registrati', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/newsletter', changeFrequency: 'monthly', priority: 0.4 },
  ]

  const staticPages = staticDefs.map((d) => ({
    url: url(DEFAULT, d.path),
    lastModified: new Date(),
    changeFrequency: d.changeFrequency,
    priority: d.priority,
    alternates: { languages: languages(d.path) },
  }))

  try {
    const supabase = getPublicClient()
    const { data: allenatori, error } = await supabase.rpc('elenco_allenatori_pubblici')

    if (error) {
      console.error('[sitemap] RPC elenco_allenatori_pubblici:', error.message)
      return staticPages
    }

    const dynamicPages = (allenatori ?? []).map((a) => {
      const path = `/allenatori/${a.id}`
      return {
        url: url(DEFAULT, path),
        lastModified: a.created_at ? new Date(a.created_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages: languages(path) },
      }
    })

    return [...staticPages, ...dynamicPages]
  } catch (e) {
    console.error('[sitemap] eccezione:', e)
    return staticPages
  }
}
