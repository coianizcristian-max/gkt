import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import VersioniManager from '@/app/components/VersioniManager'

export const dynamic = 'force-dynamic'

export default async function VersioniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: versioni } = await supabase
    .from('versioni')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisore</div>
        <h1>Versioni e changelog</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">
          Ogni versione pubblicata mostrerà un popup agli utenti al loro primo accesso successivo al rilascio.
          Crea una nuova versione prima di fare deploy in produzione, poi pubblicala.
        </p>
        <VersioniManager versioni={versioni ?? []} />
      </div>
    </>
  )
}
