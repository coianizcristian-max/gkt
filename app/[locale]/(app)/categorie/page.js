import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CategorieManager from '@/app/components/CategorieManager'
import Guida from '@/app/components/Guida'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function CategoriePage() {
  const supabase = await createClient()
  const t = await getTranslations('categorie')
  const c = await getTranslations('common')
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
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
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
