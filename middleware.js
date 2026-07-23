import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Solo queste sezioni richiedono il login. Il resto (/, /login, /auth, /cerca-allenatori) e' pubblico.
const PROTETTE = ['/dashboard', '/portieri', '/calendario', '/partite', '/statistiche', '/supervisore', '/contatti']
const PUBBLICHE = ['/', '/login', '/auth', '/cerca-allenatori', '/allenatori', '/registrati', '/suggerimenti', '/newsletter']

export async function middleware(request) {
  const path = request.nextUrl.pathname
  const isProtected = PROTETTE.some((p) => path === p || path.startsWith(p + '/'))
  const isLogin = path.startsWith('/login')

  // Il risultato di getUser() serve solo per le due redirect qui sotto: se il
  // percorso non e' ne' protetto ne' /login, nessuna delle due puo' scattare,
  // quindi evitiamo del tutto la chiamata (e la relativa richiesta di rete
  // verso l'Auth server quando esiste una sessione).
  if (!isProtected && !isLogin) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
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

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
