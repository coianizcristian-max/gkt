import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AttributiManager from '@/app/components/AttributiManager'

export const dynamic = 'force-dynamic'

export default async function AttributiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: attributi } = await supabase.from('attributi_definizioni')
    .select('*').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Attributi portiere</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <AttributiManager attributi={attributi ?? []} />
      </div>
    </>
  )
}
