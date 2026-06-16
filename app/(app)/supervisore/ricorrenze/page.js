import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import RicorrenzeManager from '@/app/components/RicorrenzeManager'

export const dynamic = 'force-dynamic'

export default async function RicorrenzeSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { data: stagione } = await supabase.from('stagioni')
    .select('id, nome, data_inizio, data_fine').eq('attiva', true).maybeSingle()

  let categorie = []
  let ricorrenze = []
  if (stagione) {
    const [cat, ric] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('ricorrenze_stagionali').select('*').eq('stagione_id', stagione.id),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    ricorrenze = ric.data ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        {stagione
          ? <RicorrenzeManager stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
