import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import SetupWizard from '@/app/components/SetupWizard'

export const dynamic = 'force-dynamic'

export default async function NuovaStagionePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)

  const { data: anni } = await supabase
    .from('anni_stagione').select('id, nome')
    .eq('attivo', true).order('ordine', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagioni</div>
        <h1>Nuova stagione</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <SetupWizard
          anniDisponibili={anni ?? []}
          ownerId={ownerId}
          redirectAfter="/supervisore/stagioni"
          isNuova={true}
        />
      </div>
    </>
  )
}
