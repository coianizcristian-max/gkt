import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { consumaInvito } from '@/lib/consumaInvito'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  // Token invito propagato dal link di conferma: va conservato in TUTTE le
  // uscite, cosi' /benvenuto sa a quale invito si riferisce la conferma.
  const invito = searchParams.get('invito')
  const q = invito ? `?invito=${encodeURIComponent(invito)}` : ''

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Scambio riuscito: la sessione ora è quella dell'utente invitato,
      // loggato come SÉ STESSO. È l'unico momento sicuro per consumare
      // l'invito: qui non può in alcun modo toccare un altro account.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const token = user?.user_metadata?.invito_token
        if (user && token) {
          const res = await consumaInvito(token, user)
          // Rimuovi il token dai metadati se la consumazione è riuscita oppure
          // se l'invito è esaurito (già consumato / inesistente): tenerlo
          // farebbe ritentare a vuoto a ogni login. Se invece l'errore è
          // temporaneo lo teniamo, così il login successivo può ritentare
          // (altrimenti l'utente resterebbe 'allenatore' per sempre).
          if (!res?.ok) {
            console.error('consumaInvito da callback NON riuscito:', res?.status, res?.error)
          }
          const esaurito = res?.status === 404 || res?.status === 410
          if (res?.ok || esaurito) {
            const admin = createAdminClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            )
            const meta = { ...(user.user_metadata || {}) }
            delete meta.invito_token
            await admin.auth.admin.updateUserById(user.id, { user_metadata: meta })
          }
        }
      } catch (e) {
        // Non bloccante: l'utente è comunque autenticato e può entrare.
        console.warn('consuma-invito da callback fallito (non bloccante):', e)
      }
      return NextResponse.redirect(`${origin}${next}${next.includes('?') ? '' : q}`)
    }

    // Scambio fallito (tipico: link di conferma aperto in un browser diverso
    // da quello usato per registrarsi). L'email risulta comunque già
    // confermata lato server: mostriamo comunque la pagina di conferma,
    // che inviterà ad accedere invece che all'area riservata.
    if (next === '/benvenuto') return NextResponse.redirect(`${origin}/benvenuto${q}`)
    // Link di recupero password non valido (aperto in un altro browser,
    // superato da una richiesta piu' recente, scaduto): spiegalo in pagina.
    if (next === '/reset-password') return NextResponse.redirect(`${origin}/login?link=scaduto`)
  }
  return NextResponse.redirect(`${origin}/login${q}`)
}
