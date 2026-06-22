import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import CategorieManager from '@/app/components/CategorieManager'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function CategorieSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)
  const { stagione } = await getStagioneAttiva(supabase, user.id)
  const { data: categorie } = await supabase.from('squadre').select('id, nome, ordine').eq('owner_id', ownerId).order('ordine')
  let attive = []
  if (stagione) {
    const { data } = await supabase.from('stagione_categorie').select('squadra_id').eq('stagione_id', stagione.id)
    attive = (data ?? []).map((r) => r.squadra_id)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Categorie</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <CategorieManager
          categorie={categorie ?? []}
          attive={attive}
          stagioneId={stagione?.id ?? null}
          stagioneNome={stagione?.nome ?? null}
          ownerId={ownerId}
        />
      </div>
    </>
  )
}
