import { createClient } from '@/lib/supabase/server'
import RegistratiClient from './RegistratiClient'

export const dynamic = 'force-dynamic'

export default async function RegistratiPage({ searchParams }) {
  const params = await searchParams
  const token = params?.invito ?? null
  let datiInvito = null

  if (token) {
    const supabase = await createClient()
    const { data: invito } = await supabase
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
