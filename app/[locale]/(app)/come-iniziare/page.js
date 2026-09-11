import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'

export const dynamic = 'force-dynamic'

export default async function ComeIniziarePage() {
  const supabase = await createClient()
  const t = await getTranslations('comeIniziare')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

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
