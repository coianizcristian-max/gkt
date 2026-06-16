import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Suggerimenti from '@/app/components/Suggerimenti'

export const dynamic = 'force-dynamic'

export default async function SuggerimentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'

  let iniziali = []
  if (isStaff) {
    const { data } = await supabase.from('suggerimenti')
      .select('id, testo, stato, created_at').order('created_at', { ascending: false })
    iniziali = data ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Suggerimenti e migliorie</h1>
      </div>
      <div className="content">
        <Suggerimenti isStaff={isStaff} iniziali={iniziali} />
      </div>
    </>
  )
}
