import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import SidebarOrdineEditor from '@/app/components/SidebarOrdineEditor'

export const dynamic = 'force-dynamic'

export default async function SidebarOrdinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: ordine } = await supabase
    .from('sidebar_ordine').select('chiave, ordine, label').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Ordine sidebar</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <SidebarOrdineEditor ordineIniziale={ordine ?? []} />
      </div>
    </>
  )
}
