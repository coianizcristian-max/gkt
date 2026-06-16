import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfiloForm from '@/app/components/ProfiloForm'

export const dynamic = 'force-dynamic'

export default async function ProfiloPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili')
    .select('id, ruolo, nome_completo, telefono, bio, foto_url, esperienze, certificati')
    .eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Il mio profilo</h1>
      </div>
      <div className="content">
        <ProfiloForm profilo={profilo} userId={user.id} />
      </div>
    </>
  )
}
