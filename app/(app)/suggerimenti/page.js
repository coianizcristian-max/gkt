import { createClient } from '@/lib/supabase/server'
import Suggerimenti from '@/app/components/Suggerimenti'

export const dynamic = 'force-dynamic'

export default async function SuggerimentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profilo = null
  if (user) {
    const { data } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    profilo = data
  }
  const isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'

  let iniziali = []
  let miei = []

  if (isStaff) {
    // Staff: tutti i suggerimenti, con nome mittente (loggato) o nome/email (anonimo)
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, categoria, stato, created_at, utente_id, nome, email, profili(nome_visualizzato)')
      .order('created_at', { ascending: false })
    iniziali = (data ?? []).map((s) => ({
      ...s,
      mittente: s.profili?.nome_visualizzato ?? null,
    }))
  } else if (user) {
    // Portiere o utente loggato: solo i propri
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, categoria, stato, created_at')
      .eq('utente_id', user.id)
      .order('created_at', { ascending: false })
    miei = data ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">GKT</div>
        <h1>Suggerimenti e migliorie</h1>
      </div>
      <div className="content">
        <Suggerimenti isStaff={isStaff} isLoggedIn={!!user} iniziali={iniziali} miei={miei} />
      </div>
    </>
  )
}
