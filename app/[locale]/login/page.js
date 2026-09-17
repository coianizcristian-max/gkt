'use client'

import { useState, useEffect, useRef } from 'react'
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import { useTranslations, useLocale } from 'next-intl'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '98743d70-a876-400c-a1c4-ee8af4ea495e'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('scaduto')) setInfo(t('infoScaduto'))
    else if (p.get('reset')) setInfo(t('infoReset'))
  }, [t])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError(t('captchaMancante'))
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (error) {
      setError(t('erroreCredenziali'))
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      // Perche' e' fallito: senza questo, in PostHog vedi solo QUANTI login
      // falliscono, non se e' password sbagliata, email non confermata o
      // captcha. NB: si registra solo il codice tecnico dell'errore, mai
      // email o password.
      trackEvento('login_fallito', {
        motivo: error.code || error.name || 'sconosciuto',
        stato_http: error.status ?? null,
      })
      return
    }
    trackEvento('login_riuscito')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const invitoQuery = new URLSearchParams(window.location.search).get('invito')
      const invToken = invitoQuery || user?.user_metadata?.invito_token
      if (invToken) {
        const resInv = await fetch('/api/consuma-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invToken }),
        })
        // Azzera il token nei metadati SOLO se la consumazione è riuscita,
        // altrimenti perderemmo il "paracadute" per ritentare al prossimo login.
        if (resInv.ok && user?.user_metadata?.invito_token) {
          await supabase.auth.updateUser({ data: { invito_token: null } })
        }
      }
    } catch (err) {
      console.warn('consuma-invito post-login:', err)
    }

    // Default = lingua con cui l'utente sta navigando ORA (rilevata dal browser
    // o scelta con la bandierina). Solo se ha una preferenza salvata su profilo
    // quella vince: cosi' chi non l'ha mai impostata non viene buttato in italiano.
    let linguaPref = locale
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const { data: prof } = await supabase.from('profili').select('lingua').eq('id', u.id).maybeSingle()
        if (prof?.lingua) linguaPref = prof.lingua
      }
    } catch (e) {}
    router.push('/dashboard', { locale: linguaPref })
    router.refresh()
  }

  async function recuperaPassword() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError(t('recuperaSenzaEmail'))
      return
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError(t('recuperaCaptcha'))
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      captchaToken,
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (error) setError(t('recuperaErrore'))
    else setInfo(t('recuperaInviata'))
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKSeason</b>
            <span>{t('sottotitolo')}</span>
          </div>
        </div>
        <form onSubmit={handleLogin}>
          {error && <div className="err">{error}</div>}
          {info && <div className="ok-msg">{info}</div>}
          <div className="field">
            <label htmlFor="email">{t('email')}</label>
            <input id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">{t('password')}</label>
            <div style={{ position: 'relative' }}>
              <input id="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                style={{ paddingRight: 66 }} />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                {showPw ? t('nascondi') : t('mostra')}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <button type="button" onClick={recuperaPassword}
              style={{ background: 'none', border: 0, padding: 0, fontSize: 13, color: 'var(--azzurro, #0a7ec2)', fontWeight: 600, cursor: 'pointer' }}>
              {t('passwordDimenticata')}
            </button>
          </div>
          {HCAPTCHA_SITE_KEY && (
            <div className="field" style={{ display: 'flex', justifyContent: 'center' }}>
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={(tok) => setCaptchaToken(tok)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? t('accesso') : t('entra')}
          </button>
        </form>
        <p className="login-alt">
          {t('nonHaiAccount')} <Link href="/registrati">{t('registrati')}</Link>
        </p>
        <p className="login-back"><Link href="/">{t('tornaAlSito')}</Link></p>
      </div>
    </div>
  )
}
