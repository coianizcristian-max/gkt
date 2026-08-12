import { createClient as createAdminClient } from '@supabase/supabase-js'
import RegistratiClient from './RegistratiClient'

export const dynamic = 'force-dynamic'

export default async function RegistratiPage({ searchParams }) {
  const params = await searchParams
  const token = params?.invito ?? null
  let datiInvito = null

  if (token) {
    // Leggiamo l'invito con il client ADMIN (service_role): chi apre il link di
    // invito NON è autenticato, quindi con il client normale la SELECT sulla
    // tabella `inviti` può essere bloccata dalle policy RLS, facendo comparire
    // "invito non valido / già usato" a un visitatore anonimo anche quando
    // l'invito è perfettamente attivo. Il client admin gira solo lato server:
    // la service_role key non viene mai esposta al browser.
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: invito } = await admin
      .from('inviti')
      .select('id, tipo, stato, portiere_id, email_invitato, portieri(nome, cognome)')
      .eq('token', token)
      .maybeSingle()

    if (invito && invito.stato === 'attivo') {
      datiInvito = {
        tipo: invito.tipo,
        nomeCompleto: invito.portieri
          ? `${invito.portieri.nome} ${invito.portieri.cognome ?? ''}`.trim()
          : null,
        email: invito.email_invitato ?? null,
      }
    }
  }

  return <RegistratiClient token={token} datiInvito={datiInvito} />
}
