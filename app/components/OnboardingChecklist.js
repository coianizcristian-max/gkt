import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function OnboardingChecklist({ checks }) {
  const t = await getTranslations('onboarding')
  const tutti = checks.every((c) => c.ok)
  if (tutti) return null

  const completati = checks.filter((c) => c.ok).length

  return (
    <div className="onboarding-box">
      <div className="onboarding-head">
        <div className="onboarding-icon">🚀</div>
        <div>
          <div className="onboarding-titolo">{t('titolo')}</div>
          <div className="onboarding-prog">{t('passi', { fatti: completati, tot: checks.length })}</div>
        </div>
        <div className="onboarding-bar-wrap">
          <div className="onboarding-bar" style={{ width: `${Math.round((completati / checks.length) * 100)}%` }} />
        </div>
      </div>
      <div className="onboarding-steps">
        {checks.map((c, i) => (
          <div key={i} className={`onboarding-step ${c.ok ? 'ok' : ''}`}>
            <span className="onboarding-check">{c.ok ? '✓' : (i + 1)}</span>
            <div className="onboarding-step-body">
              <div className="onboarding-step-titolo">{c.titolo}</div>
              {!c.ok && <div className="onboarding-step-desc">{c.desc}</div>}
            </div>
            {!c.ok && c.href && (
              <Link href={c.href} className="btn-mini" style={{ flexShrink: 0 }}>{t('vai')}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
