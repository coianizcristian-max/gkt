import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
 * Variabile d'ambiente richiesta (Vercel + .env.local):
 *   DEMO_OSPITE_EMAIL
 *
 * NIENTE PASSWORD: il progetto ha hCaptcha attivo sull'Auth, quindi ogni
 * signInWithPassword fatto dal server viene rifiutato ("captcha protection:
 * request disallowed"), perche' lato server non c'e' nessun captcha da
 * risolvere. Apriamo la sessione con la service_role: generiamo un token
 * monouso per l'ospite (generateLink, che NON invia mail) e lo consumiamo
 * con verifyOtp. Il captcha non tocca questo percorso.
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

  // 1) Identita' dell'ospite.
  const email = process.env.DEMO_OSPITE_EMAIL
  if (!email) return vaiA('/registrati')

  // 2) La demo dev'essere accesa, altrimenti l'ospite vedrebbe un'app vuota.
  const cfg = await getDemoConfig()
  if (!cfg.attiva || !cfg.ownerId) return vaiA('/registrati')

  // 3) Sessione gia' attiva. Due casi molto diversi:
  //
  //    a) e' un utente VERO (o tu): non tocchiamo niente, non deve ritrovarsi
  //       buttato fuori dal proprio account perche' ha aperto il QR.
  //    b) e' gia' la sessione VETRINA: i cookie di Supabase sopravvivono alla
  //       chiusura della scheda, quindi senza questo ramo /d entrerebbe in
  //       silenzio per sempre, senza piu' mostrare il popup di benvenuto.
  //       Qui la riarmiamo: demo accesa e popup di nuovo da mostrare.
  const {
    data: { user: giaLoggato },
  } = await supabase.auth.getUser()

  if (giaLoggato) {
    const eOspite =
      (giaLoggato.email || '').toLowerCase() === email.toLowerCase() &&
      giaLoggato.id !== cfg.ownerId
    if (!eOspite) return vaiA('/dashboard')
    accendiDemo(risposta)
    return risposta
  }

  // 4) Sessione dell'ospite, senza password e senza captcha:
  //    a) con la service_role generiamo un token monouso per quell'email
  //       (generateLink NON manda nessuna mail, restituisce solo il token);
  //    b) lo consumiamo con verifyOtp sul client utente, che scrive i
  //       cookie di sessione su `risposta`.
  let hashedToken = null
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )
    const { data: link, error: errLink } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (errLink) return vaiA('/registrati')
    hashedToken = link?.properties?.hashed_token ?? null
  } catch {
    return vaiA('/registrati')
  }
  if (!hashedToken) return vaiA('/registrati')

  const { data, error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  })
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

  // 7) Accendiamo la modalita' demo.
  accendiDemo(risposta)

  return risposta
}

/**
 * Cookie dell'ingresso vetrina, con le stesse opzioni usate da /api/demo.
 * Ogni passaggio da /d riarma il popup di benvenuto, cosi' il visitatore lo
 * vede sempre (e tu puoi riprovare senza chiudere la finestra in incognito).
 */
function accendiDemo(risposta) {
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
  // Popup di benvenuto di nuovo da mostrare.
  risposta.cookies.set(COOKIE_DEMO_AVVISO, '', { ...opzioni, maxAge: 0 })
}
