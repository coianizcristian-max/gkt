import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import DemoConfigEditor from '@/app/components/DemoConfigEditor'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisoreDemoPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const td = await getTranslations('demoConfig')
  const c = await getTranslations('common')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // demo_config non ha policy: si legge solo con il client di servizio
  const { data: righe } = await admin().from('demo_config').select('chiave, valore, descrizione').order('chiave')
  const cfg = Object.fromEntries((righe ?? []).map((r) => [r.chiave, r.valore]))

  // riepilogo di cosa contiene la stagione demo, per conferma visiva
  let riepilogo = null
  let stagioniDemo = []
  const { data: elenco } = await admin().auth.admin.listUsers({ page: 1, perPage: 200 })
  const ownerId = elenco?.users?.find((u) => u.email === cfg.owner_email)?.id ?? null
  if (ownerId) {
    const a = admin()
    const [{ count: nStagioni }, { count: nPortieri }, { count: nEsercizi }] = await Promise.all([
      a.from('stagioni').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId),
      a.from('portieri').select('id', { count: 'exact', head: true }).eq('allenatore_id', ownerId),
      a.from('esercizi').select('id', { count: 'exact', head: true }).eq('allenatore_id', ownerId),
    ])
    riepilogo = { ownerId, nStagioni: nStagioni ?? 0, nPortieri: nPortieri ?? 0, nEsercizi: nEsercizi ?? 0 }
    const { data: stg } = await a.from('stagioni')
      .select('id, nome, societa_nome, data_inizio, data_fine')
      .eq('owner_id', ownerId).eq('attiva', true)
      .order('created_at', { ascending: false })
    stagioniDemo = stg ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('navDemo')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{td('intro')}</p>
        <DemoConfigEditor cfg={cfg} righe={righe ?? []} riepilogo={riepilogo} stagioni={stagioniDemo} />
      </div>
    </>
  )
}
