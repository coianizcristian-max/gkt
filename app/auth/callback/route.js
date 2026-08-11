import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { consumaInvito } from '@/lib/consumaInvito'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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
          await consumaInvito(token, user)
          // Rimuovi il token dai metadati così non può essere riusato.
          const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
          const meta = { ...(user.user_metadata || {}) }
          delete meta.invito_token
          await admin.auth.admin.updateUserById(user.id, { user_metadata: meta })
        }
      } catch (e) {
        // Non bloccante: l'utente è comunque autenticato e può entrare.
        console.warn('consuma-invito da callback fallito (non bloccante):', e)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    // Scambio fallito (tipico: link di conferma aperto in un browser diverso
    // da quello usato per registrarsi). L'email risulta comunque già
    // confermata lato server: mostriamo comunque la pagina di conferma,
    // che inviterà ad accedere invece che all'area riservata.
    if (next === '/benvenuto') return NextResponse.redirect(`${origin}/benvenuto`)
  }
  return NextResponse.redirect(`${origin}/login`)
}
