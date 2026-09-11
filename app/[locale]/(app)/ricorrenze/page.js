import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { createClient, getUser } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import RicorrenzeTabs from '@/app/components/RicorrenzeTabs'
import { getStagioneAttiva } from '@/lib/tenant'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function RicorrenzePage() {
  const supabase = await createClient()
  const t = await getTranslations('ricorrenze')
  const c = await getTranslations('common')
  const user = await getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { stagione } = await getStagioneAttiva(supabase, user.id)

  // Il gating non dipende dalla stagione: partiva solo dopo il blocco sotto,
  // qui viene lanciato subito e atteso solo quando serve.
  const gatingPromise = Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])

  let categorie = []
  let ricorrenze = []
  let ricorrenzePartite = []
  if (stagione) {
    const [cat, ric, ricPar] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('ricorrenze_stagionali').select('*').eq('stagione_id', stagione.id)
        .order('giorno_settimana').order('ora_inizio'),
      supabase.from('ricorrenze_partite_stagionali').select('*').eq('stagione_id', stagione.id)
        .order('giorno_settimana').order('data_inizio_ric'),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    ricorrenze = ric.data ?? []
    ricorrenzePartite = ricPar.data ?? []
  }

  const [gatingCfg, abbAttivo] = await gatingPromise
  const canRicorrenze = isUnlocked('ricorrenze_genera', gatingCfg, abbAttivo)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('stagione', { nome: stagione?.nome ?? '—' })}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong>, cat: (ch) => <Link href="/categorie" className="link-inline">{ch}</Link> })}</p>
          <p style={{ marginTop: 10 }}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{ marginTop: 10 }}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{ marginTop: 10 }}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong>, em: (ch) => <em>{ch}</em> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP5', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        {stagione && categorie.length === 0 && (
          <div className="avviso">
            <span aria-hidden="true">⚠️</span>
            <span>{t.rich('avviso', { nome: stagione.nome, b: (ch) => <strong>{ch}</strong>, cat: (ch) => <Link href="/categorie">{ch}</Link> })}</span>
          </div>
        )}
        {stagione
          ? (canRicorrenze
            ? <RicorrenzeTabs stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} ricorrenzePartite={ricorrenzePartite} />
            : <PaywallBanner chiave="ricorrenze_genera" label={t('paywallLabel')} />)
          : <div className="empty">{c('nessunaStagione')}</div>}
      </div>
    </>
  )
}