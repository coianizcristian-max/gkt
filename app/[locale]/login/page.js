'use client'

import { useState, useEffect, useRef } from 'react'
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import { useTranslations, useLocale } from 'next-intl'
import Captcha from '@/app/components/Captcha'

// Turnstile: se la variabile non c'e', il captcha non viene mostrato
// (meglio nessun captcha che un widget che punta al fornitore sbagliato).
const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

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
  // Recupero password: messaggio accanto al link e pausa di 60 s dopo l'invio,
  // cosi' non partono piu' mail (ogni nuova richiesta annulla il link prima).
  const [recMsg, setRecMsg] = useState(null) // { tipo: 'ok' | 'err', testo }
  const [recInvio, setRecInvio] = useState(false)
  const [recAttesa, setRecAttesa] = useState(0)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    // Link della mail non valido: da /auth/conferma o /auth/callback (?link=scaduto)
    // oppure rimandato qui da Supabase con l'errore nell'hash (#error_code=otp_expired)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (p.get('link') === 'scaduto' || h.get('error_code') || h.get('error')) {
      setError(t('linkScaduto'))
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    else if (p.get('scaduto')) setInfo(t('infoScaduto'))
    else if (p.get('reset')) setInfo(t('infoReset'))
  }, [t])

  // conto alla rovescia della pausa dopo l'invio della mail di recupero
  useEffect(() => {
    if (recAttesa <= 0) return
    const id = setTimeout(() => setRecAttesa((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [recAttesa])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (CAPTCHA_SITE_KEY && !captchaToken) {
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
        // Azzera il token nei metadati se la consumazione è riuscita OPPURE se
        // l'invito è ormai esaurito (già consumato / inesistente): in quel caso
        // ritentare a ogni login è inutile e genera un 410 a ripetizione.
        // In tutti gli altri casi (es. errore temporaneo) il token resta:
        // è il "paracadute" per riprovare al login successivo.
        const esaurito = resInv.status === 404 || resInv.status === 410
        if ((resInv.ok || esaurito) && user?.user_metadata?.invito_token) {
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
    if (recInvio || recAttesa > 0) return
    setError('')
    setInfo('')
    setRecMsg(null)
    if (!email.trim()) {
      setRecMsg({ tipo: 'err', testo: t('recuperaSenzaEmail') })
      return
    }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      setRecMsg({ tipo: 'err', testo: t('recuperaCaptcha') })
      return
    }
    setRecInvio(true)
    // la richiesta passa dal server: cosi' il link della mail vale in ogni
    // browser (vedi app/api/recupero-password/route.js)
    const res = await fetch('/api/recupero-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), captchaToken }),
    })
    const error = res.ok ? null : { troppe: res.status === 429 }
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    setRecInvio(false)
    if (error) {
      setRecMsg({ tipo: 'err', testo: error.troppe ? t('recuperaTroppe') : t('recuperaErrore') })
    } else {
      setRecMsg({ tipo: 'ok', testo: t('recuperaInviata') })
      setRecAttesa(60)
    }
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
            <button type="button" onClick={recuperaPassword} disabled={recInvio || recAttesa > 0}
              style={{ background: 'none', border: 0, padding: 0, fontSize: 13, color: recAttesa > 0 ? 'var(--ink-soft)' : 'var(--azzurro, #0a7ec2)', fontWeight: 600, cursor: recAttesa > 0 ? 'default' : 'pointer' }}>
              {recInvio ? t('recuperaInvio') : recAttesa > 0 ? t('recuperaAttendi', { s: recAttesa }) : t('passwordDimenticata')}
            </button>
            {recMsg && (
              <div className={recMsg.tipo === 'ok' ? 'ok-msg' : 'err'} style={{ textAlign: 'left', marginTop: 8, marginBottom: 0 }}>
                {recMsg.testo}
              </div>
            )}
          </div>
          {CAPTCHA_SITE_KEY && (
            <div className="field" style={{ display: 'flex', justifyContent: 'center' }}>
              <Captcha
                ref={captchaRef}
                sitekey={CAPTCHA_SITE_KEY}
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
