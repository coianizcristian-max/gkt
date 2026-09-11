import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'
import FaqManager from '@/app/components/FaqManager'

export const dynamic = 'force-dynamic'

export default async function SupervisoreFaqPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: faq } = await supabase
    .from('faq_interne').select('*').order('target').order('categoria').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('eyebrow')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{t('faqIntro')}</p>
        <FaqManager faq={faq ?? []} />
      </div>
    </>
  )
}
