import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'
import { getStagioneAttiva } from '@/lib/tenant'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function NuovoAllenamentoPage({ searchParams }) {
  const sp = await searchParams
  const defaultData = sp?.data ?? ''
  const supabase = await createClient()
  const t = await getTranslations('calendario')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user?.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let categorie = []
  if (stagione) {
    const { data } = await supabase.from('stagione_categorie')
      .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id)
    categorie = (data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/calendario">{t('titolo')}</Link> · {c('stagione', { nome: stagione?.nome ?? '—' })}</div>
        <h1>{t('nuovoTitolo')}</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0
          ? <AllenamentoForm categorie={categorie} stagioneId={stagione.id} defaultData={defaultData} />
          : <div className="empty">{c('setupStagioneCategoria')}</div>}
      </div>
    </>
  )
}
