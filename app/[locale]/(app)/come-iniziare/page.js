import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import { getDemoConfig } from '@/lib/demo'

export const dynamic = 'force-dynamic'

export default async function ComeIniziarePage() {
  const supabase = await createClient()
  const t = await getTranslations('comeIniziare')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  // La stagione demo si propone solo ai preparatori e solo se e' accesa.
  const demoCfg = await getDemoConfig()
  const demoDisponibile = demoCfg.attiva && !!demoCfg.ownerId
    && profilo?.ruolo === 'allenatore' && user.id !== demoCfg.ownerId

  const passiAllenatore = t.raw('passiAllenatore')
  const passiPortiere = t.raw('passiPortiere')
  const passi = isPortiere ? passiPortiere : passiAllenatore

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('guidaEyebrow')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <p className="sub-intro">
          {isPortiere
            ? t('introPortiere')
            : t('introAllenatore')}
        </p>
        {demoDisponibile && (
          <div className="demo-richiamo">
            <div className="demo-richiamo-badge">{t('demoBadge')}</div>
            <div>
              <div className="demo-richiamo-titolo">{t('demoTitolo')}</div>
              <div className="demo-richiamo-testo">{t('demoTesto')}</div>
            </div>
          </div>
        )}
        <div className="guida-step-grid">
          {passi.map((p, i) => (
            <div key={i} className="guida-step">
              <div className="guida-step-n">{i + 1}</div>
              <div>
                <div className="guida-step-titolo">{p.t}</div>
                <div className="guida-step-desc">{p.d}</div>
              </div>
            </div>
          ))}
        </div>

        {!isPortiere && (
          <div style={{ marginTop: 32 }}>
            <Guida titolo={c('domandeFrequenti')}>
              <p>{t.rich('faqBox', { faqLink: (ch) => <Link href="/faq" className="link-inline">{ch}</Link> })}</p>
            </Guida>
          </div>
        )}
      </div>
    </>
  )
}
