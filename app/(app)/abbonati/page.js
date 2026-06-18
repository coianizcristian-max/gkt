import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AbbonatoClient from './AbbonatoClient'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function AbbonatiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
  if (!isStaff) redirect('/')

  const { tuttoFree } = await getGatingConfig(supabase)
  // Se tutto è free non ha senso abbonarsi — redirect alla home
  if (tuttoFree) redirect('/')

  const abbonamentoAttivo = await hasAbbonamento(supabase, user.id)

  // Dettaglio abbonamento corrente
  let abbonamento = null
  if (abbonamentoAttivo) {
    const { data } = await supabase.from('abbonamenti')
      .select('piano, stato, scadenza, created_at')
      .eq('allenatore_id', user.id).eq('stato', 'attivo').maybeSingle()
    abbonamento = data
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Abbonamento GKT</h1>
      </div>
      <div className="content">
        <AbbonatoClient abbonamento={abbonamento} userId={user.id} />
      </div>
    </>
  )
}
