import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'
import { Link } from '@/i18n/routing'
import StagioniAllenatoreManager from '@/app/components/StagioniAllenatoreManager'
import Guida from '@/app/components/Guida'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function StagioniPage() {
  const supabase = await createClient()
  const t = await getTranslations('stagioni')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const ownerId = await getOwnerId(supabase, user.id)

  const [{ data: stagioni }, { data: profiloCorrente }] = await Promise.all([
    supabase.from('stagioni')
      .select('id, nome, societa_nome, attiva, data_inizio, data_fine')
      .eq('owner_id', ownerId)
      .order('data_inizio', { ascending: false, nullsFirst: false }),
    supabase.from('profili').select('stagione_corrente_id').eq('id', user.id).maybeSingle(),
  ])

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">{c('areaRiservata')}</div>
          <h1>{t('titolo')}</h1>
        </div>
        <Link href="/stagioni/nuova" className="btn-azione">{t('nuova')}</Link>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        <StagioniAllenatoreManager stagioni={stagioni ?? []} ownerId={ownerId} stagioneCorrenteId={profiloCorrente?.stagione_corrente_id ?? null} />
      </div>
    </>
  )
}
