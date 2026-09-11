import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SitoEditor from '@/app/components/SitoEditor'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SupervisorePage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: sezioni } = await supabase
    .from('sito_sezioni').select('*').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titoloSito')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{t('sitoIntro')}</p>
        <SitoEditor sezioni={sezioni ?? []} />
      </div>
    </>
  )
}
