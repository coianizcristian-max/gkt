import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const handleI18n = createMiddleware(routing)

// Solo queste sezioni richiedono il login. (Confronto fatto sul percorso SENZA
// prefisso lingua, calcolato piu' sotto.)
const PROTETTE = ['/dashboard', '/portieri', '/calendario', '/partite', '/statistiche', '/supervisore', '/contatti']

export async function middleware(request) {
  // 1) next-intl produce la response base (gestisce lingua, cookie NEXT_LOCALE,
  //    eventuali rewrite/redirect di locale).
  let response = handleI18n(request)

  // 2) percorso "nudo" senza il prefisso lingua, per i controlli auth.
  const pathname = request.nextUrl.pathname
  const seg = pathname.split('/')
  const hasLocale = routing.locales.includes(seg[1])
  const locale = hasLocale ? seg[1] : routing.defaultLocale
  const bare = hasLocale ? '/' + seg.slice(2).join('/') : pathname
  const barePath = bare === '' ? '/' : bare

  const isProtected = PROTETTE.some((p) => barePath === p || barePath.startsWith(p + '/'))
  const isLogin = barePath.startsWith('/login')

  // Come prima: se non e' ne' protetto ne' /login, niente chiamata all'Auth
  // server. Restituiamo la response di next-intl cosi' com'e'.
  if (!isProtected && !isLogin) {
    return response
  }

  // 3) Supabase legge/scrive i cookie SULLA response di next-intl (non su una
  //    NextResponse nuova, altrimenti si perderebbe il lavoro sulla lingua).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Prefisso da conservare nelle redirect: vuoto per l'italiano (default),
  // '/en' o '/de' per le altre.
  const prefix = locale === routing.defaultLocale ? '' : '/' + locale

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = prefix + '/login'
    return NextResponse.redirect(url)
  }

  // Eccezione: /login?invito=... deve restare raggiungibile anche con una
  // sessione attiva. E' il caso di chi apre il link di conferma in un browser
  // dove e' gia' loggato qualcun altro: rimbalzarlo sulla dashboard lo
  // riporterebbe nell'account sbagliato, senza modo di uscirne.
  const haInvito = request.nextUrl.searchParams.has('invito')

  if (user && isLogin && !haInvito) {
    const url = request.nextUrl.clone()
    url.pathname = prefix + '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Esclude /api, /auth (callback OAuth!), /d (scorciatoia QR gestita da un
  // redirect in next.config), gli interni di Next e i file statici.
  matcher: ['/((?!api|auth|d$|_next|_vercel|.*\\..*).*)'],
}
