import Link from 'next/link'

export default function OnboardingChecklist({ checks }) {
  const tutti = checks.every((c) => c.ok)
  if (tutti) return null

  const completati = checks.filter((c) => c.ok).length

  return (
    <div className="onboarding-box">
      <div className="onboarding-head">
        <div className="onboarding-icon">🚀</div>
        <div>
          <div className="onboarding-titolo">Configurazione iniziale</div>
          <div className="onboarding-prog">{completati}/{checks.length} passi completati</div>
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
              <Link href={c.href} className="btn-mini" style={{ flexShrink: 0 }}>Vai →</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
