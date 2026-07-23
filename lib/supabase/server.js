import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// cache(): all createClient() calls within the SAME request/render share this
// one client instance instead of creating a new one each time. Never persists
// across requests or users — React's cache() is scoped per request only.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // chiamato da un Server Component: ignorabile, il refresh
            // della sessione e' gestito dal middleware.
          }
        },
      },
    }
  )
})

// Layout e pagina chiamano entrambi supabase.auth.getUser() nella stessa
// request: senza cache() sarebbero due round-trip di rete identici verso
// l'Auth server. Qui restiamo su getUser() (non getClaims()) perche' il
// risultato decide quasi sempre un redirect di accesso (serve certezza),
// non solo l'id.
export const getUser = cache(async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
