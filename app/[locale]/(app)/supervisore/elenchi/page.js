import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'
import ElenchiManager from '@/app/components/ElenchiManager'

export const dynamic = 'force-dynamic'

export default async function ElenchiSupPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: voci } = await supabase.from('elenco_voci').select('*').order('elenco').order('ordine')
  const gruppi = {}
  for (const v of voci ?? []) (gruppi[v.elenco] ??= []).push(v)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('eyebrow')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <ElenchiManager gruppi={gruppi} />
      </div>
    </>
  )
}
