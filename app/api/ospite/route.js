import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getDemoConfig, COOKIE_DEMO, COOKIE_DEMO_AVVISO, COOKIE_OSPITE } from '@/lib/demo'

/**
 * Ingresso "vetrina": chi arriva da un QR code o da un link pubblico viene
 * loggato come utente OSPITE e portato dritto nella stagione demo, senza
 * doversi registrare.
 *
 * Non c'e' impersonificazione: l'ospite e' un utente vero, autenticato con
 * le sue credenziali. La sola lettura arriva dall'impianto gia' esistente
 * (cookie gk_demo -> contestoDati() usa lettoreDemo(), + DemoGuardia lato
 * client), esattamente come per qualunque altro preparatore che entra in
 * demo dalla voce di menu.
 *
 * Variabili d'ambiente richieste (Vercel + .env.local):
 *   DEMO_OSPITE_EMAIL
 *   DEMO_OSPITE_PASSWORD
 *
 * Se qualcosa non e' a posto (demo spenta, credenziali mancanti, login
 * fallito) non mostriamo errori a un potenziale iscritto: lo mandiamo su
 * /registrati, che e' comunque la pagina giusta dove farlo atterrare.
 */
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const origin = request.nextUrl.origin
  const vaiA = (percorso) => NextResponse.redirect(new URL(percorso, origin))

  // Questa e' la risposta "buona": i cookie di sessione vengono scritti qui
  // sopra dal client Supabase, quindi va restituita SOLO in caso di successo.
  const risposta = vaiA('/dashboard')

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

  // 1) Sessione gia' attiva: NON la tocchiamo mai. Se un utente vero (o tu)
  //    apre il link per sbaglio, non deve ritrovarsi buttato fuori dal
  //    proprio account. Lo lasciamo dov'e'.
  const {
    data: { user: giaLoggato },
  } = await supabase.auth.getUser()
  if (giaLoggato) return vaiA('/dashboard')

  // 2) Credenziali dell'ospite.
  const email = process.env.DEMO_OSPITE_EMAIL
  const password = process.env.DEMO_OSPITE_PASSWORD
  if (!email || !password) return vaiA('/registrati')

  // 3) La demo dev'essere accesa, altrimenti l'ospite vedrebbe un'app vuota.
  const cfg = await getDemoConfig()
  if (!cfg.attiva || !cfg.ownerId) return vaiA('/registrati')

  // 4) Login dell'ospite. I cookie di sessione finiscono su `risposta`.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data?.user) return vaiA('/registrati')

  // 5) Salvagente: l'ospite non deve MAI coincidere con il proprietario della
  //    demo, altrimenti entrerebbe in scrittura sui dati dimostrativi.
  if (data.user.id === cfg.ownerId) {
    await supabase.auth.signOut()
    return vaiA('/registrati')
  }

  // 6) Salvagente: solo un profilo 'allenatore' vede la demo (stessa regola
  //    di /api/demo e di contestoDati). Se il profilo dell'ospite fosse stato
  //    cambiato, meglio non lasciarlo dentro un'app vuota.
  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profilo?.ruolo !== 'allenatore') {
    await supabase.auth.signOut()
    return vaiA('/registrati')
  }

  // 7) Accendiamo la modalita' demo, con le stesse opzioni di /api/demo.
  const opzioni = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  }
  risposta.cookies.set(COOKIE_DEMO, '1', opzioni)
  // Marchia la sessione come "vetrina": l'uscita dalla demo lo riportera' sul
  // sito pubblico invece che su una dashboard senza dati.
  risposta.cookies.set(COOKIE_OSPITE, '1', opzioni)
  // Nuovo ingresso: il popup di benvenuto deve comparire.
  risposta.cookies.set(COOKIE_DEMO_AVVISO, '', { ...opzioni, maxAge: 0 })

  return risposta
}
