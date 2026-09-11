import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'
import VersioniManager from '@/app/components/VersioniManager'

export const dynamic = 'force-dynamic'

export default async function VersioniPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: versioni } = await supabase
    .from('versioni')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('titoloVersioni')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{t('versioniIntro')}</p>
        <VersioniManager versioni={versioni ?? []} />
      </div>
    </>
  )
}
