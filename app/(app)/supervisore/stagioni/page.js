import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import StagioniManager from '@/app/components/StagioniManager'
import { getOwnerId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function StagioniSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  // Ogni allenatore (o suo collaboratore) vede e gestisce SOLO le proprie stagioni (owner_id).
  const ownerId = await getOwnerId(supabase, user.id)
  const { data: stagioni } = await supabase.from('stagioni')
    .select('id, nome, societa_nome, logo_url, attiva, data_inizio, data_fine')
    .eq('owner_id', ownerId)
    .order('data_inizio', { ascending: false, nullsFirst: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Stagioni</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <StagioniManager stagioni={stagioni ?? []} ownerId={ownerId} />
      </div>
    </>
  )
}
