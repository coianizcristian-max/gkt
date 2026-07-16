import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()
    // NB: la tabella profili NON ha updated_at, ha solo created_at.
    // Prima qui si leggeva updated_at: PostgREST rispondeva errore, data restava null,
    // e la sitemap pubblicava solo le pagine statiche. In silenzio, perche' l'errore
    // non veniva mai controllato. Da qui il controllo esplicito su error.
    const { data: allenatori, error } = await supabase
      .from('profili')
      .select('id, created_at')
      .in('ruolo', ['allenatore', 'staff'])
      .eq('disponibile', true)

    if (error) {
      console.error('[sitemap] errore lettura profili:', error.message)
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
