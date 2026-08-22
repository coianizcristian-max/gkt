import { createBrowserClient } from '@supabase/ssr'

// Su iPad/Safari capita che una connessione keep-alive rimasta "stantia" (dopo
// sospensione del device o app in background) faccia fallire la PRIMA richiesta
// con "TypeError: Load failed" (l'equivalente Safari del "Failed to fetch" di
// Chrome), senza che il browser ritenti. Avvolgiamo la fetch con un retry sul
// solo errore di RETE:
//  - una fetch che LANCIA significa che nessuna risposta HTTP è arrivata (di
//    norma la richiesta non è nemmeno partita, connessione morta) → ritentare è
//    sicuro e apre una connessione nuova, che di solito va a buon fine;
//  - una risposta 4xx/5xx NON lancia, quindi non viene ritentata: nessun rischio
//    di doppio salvataggio per errori applicativi.
async function fetchConRetry(input, init) {
  const tentativi = 3
  let ultimoErrore
  for (let i = 0; i < tentativi; i++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      ultimoErrore = err
      if (i < tentativi - 1) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1))) // 300ms, poi 600ms
      }
    }
  }
  throw ultimoErrore
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: fetchConRetry } }
  )
}
