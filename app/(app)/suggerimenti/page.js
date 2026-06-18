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
  let miei = []

  if (isStaff) {
    // Staff: tutti i suggerimenti, con nome mittente
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, stato, esito, created_at, utente_id, profili(nome_visualizzato)')
      .order('created_at', { ascending: false })
    iniziali = (data ?? []).map((s) => ({
      ...s,
      mittente: s.profili?.nome_visualizzato ?? null,
    }))
  } else {
    // Portiere: solo i propri
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, stato, esito, created_at')
      .eq('utente_id', user.id)
      .order('created_at', { ascending: false })
    miei = data ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Suggerimenti e migliorie</h1>
      </div>
      <div className="content">
        <Suggerimenti isStaff={isStaff} iniziali={iniziali} miei={miei} />
      </div>
    </>
  )
}
