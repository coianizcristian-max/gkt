import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AnniManager from '@/app/components/AnniManager'

export const dynamic = 'force-dynamic'

export default async function AnniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: anni } = await supabase
    .from('anni_stagione').select('*').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Anni stagione</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">
          Gli anni qui presenti compaiono nel wizard di configurazione degli allenatori al primo accesso.
          Aggiungi un nuovo anno prima dell&apos;inizio di ogni stagione.
        </p>
        <AnniManager anni={anni ?? []} />
      </div>
    </>
  )
}
