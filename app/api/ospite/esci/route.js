import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { COOKIE_DEMO, COOKIE_DEMO_AVVISO, COOKIE_OSPITE } from '@/lib/demo'

/**
 * Uscita dell'utente vetrina.
 *
 * Un ospite che esce dalla demo non deve finire sulla propria dashboard,
 * perche' l'account vetrina non ha dati: vedrebbe un'app vuota e penserebbe
 * che GKSeason sia vuoto. Qui invece chiudiamo la sessione, ripuliamo i
 * cookie e lo riportiamo sulla home pubblica, dove c'e' l'invito a
 * registrarsi.
 *
 * E' una GET perche' e' una semplice navigazione del browser (il pulsante
 * nella fascia gialla). Non tocca dati: l'unica cosa che fa e' chiudere una
 * sessione condivisa di sola lettura.
 */
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const risposta = NextResponse.redirect(new URL('/', request.nextUrl.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            risposta.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // scope 'local' OBBLIGATORIO: l'account ospite e' condiviso da tutti i
    // visitatori. Il default ('global') chiudeva le sessioni di TUTTI quelli
    // che in quel momento stavano guardando la demo.
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Se il signout fallisce reindirizziamo comunque: i cookie qui sotto
    // vengono cancellati in ogni caso.
  }

  risposta.cookies.delete(COOKIE_DEMO)
  risposta.cookies.delete(COOKIE_DEMO_AVVISO)
  risposta.cookies.delete(COOKIE_OSPITE)

  return risposta
}
