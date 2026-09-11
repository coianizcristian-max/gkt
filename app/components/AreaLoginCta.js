'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function AreaLoginCta({ variant }) {
  const t = useTranslations('areaLoginCta')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let annullato = false
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!annullato) setLoggedIn(!!user)
    }
    check()
    return () => { annullato = true }
  }, [])

  if (variant === 'nav') {
    return loggedIn
      ? <Link href="/dashboard" className="link-accedi">{t('miaArea')}</Link>
      : <Link href="/login" className="link-accedi">{t('accedi')}</Link>
  }

  return loggedIn ? (
    <Link href="/dashboard" className="cta-card">
      <span className="cta-text">
        <span className="cta-eyebrow">{t('eyebrow')}</span>
        <strong>{t('entra')}</strong>
        <span className="cta-sub">{t('sub')}</span>
      </span>
      <span className="cta-arrow" aria-hidden="true">&rarr;</span>
    </Link>
  ) : (
    <div className="cta-guest">
      <Link href="/login" className="btn-hero">{t('accediArea')}</Link>
      <span className="cta-guest-note">{t('note')}</span>
    </div>
  )
}
