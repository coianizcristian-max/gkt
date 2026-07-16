import { createClient as createPublicClient } from '@supabase/supabase-js'

// La sitemap la genera il server SENZA nessun utente loggato. Il client di
// @/lib/supabase/server si autentica coi cookie di sessione: qui non ce ne sono,
// quindi girava come anon e le RLS su profili restituivano zero righe. Nota bene:
// zero righe, non un errore — per questo il fallimento era invisibile e la sitemap
// pubblicava solo le 5 pagine statiche. Si passa dalla RPC elenco_allenatori_pubblici
// (SECURITY DEFINER), che espone solo id e created_at: nessun dato personale.
function getPublicClient() {
  return createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function sitemap() {
  const baseUrl = 'https://www.gkseason.it'

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/cerca-allenatori`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/registrati`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/newsletter`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const supabase = getPublicClient()
    const { data: allenatori, error } = await supabase.rpc('elenco_allenatori_pubblici')

    if (error) {
      console.error('[sitemap] RPC elenco_allenatori_pubblici:', error.message)
      return staticPages
    }

    const dynamicPages = (allenatori ?? []).map((a) => ({
      url: `${baseUrl}/allenatori/${a.id}`,
      lastModified: a.created_at ? new Date(a.created_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    return [...staticPages, ...dynamicPages]
  } catch (e) {
    console.error('[sitemap] eccezione:', e)
    return staticPages
  }
}
