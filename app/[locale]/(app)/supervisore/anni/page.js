import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'
import AnniManager from '@/app/components/AnniManager'

export const dynamic = 'force-dynamic'

export default async function AnniPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: anni } = await supabase
    .from('anni_stagione').select('*').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titoloAnni')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{t('anniIntro')}</p>
        <AnniManager anni={anni ?? []} />
      </div>
    </>
  )
}
