import { createClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const baseUrl = 'https://gkt2026.vercel.app'

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/cerca-allenatori`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/registrati`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/newsletter`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const supabase = await createClient()
    const { data: allenatori } = await supabase
      .from('profili')
      .select('id, updated_at')
      .in('ruolo', ['allenatore', 'staff'])
      .eq('disponibile', true)

    const dynamicPages = (allenatori ?? []).map((a) => ({
      url: `${baseUrl}/allenatori/${a.id}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    return [...staticPages, ...dynamicPages]
  } catch {
    return staticPages
  }
}
