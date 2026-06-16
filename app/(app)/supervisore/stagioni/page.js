import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import StagioniManager from '@/app/components/StagioniManager'

export const dynamic = 'force-dynamic'

export default async function StagioniSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { data: stagioni } = await supabase.from('stagioni')
    .select('id, nome, societa_nome, logo_url, attiva, data_inizio, data_fine')
    .order('data_inizio', { ascending: false, nullsFirst: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <StagioniManager stagioni={stagioni ?? []} />
      </div>
    </>
  )
}
