'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '98743d70-a876-400c-a1c4-ee8af4ea495e'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)

  // Avvisi dai redirect (?scaduto=1 dal logout per inattività, ?reset=1 dopo il
  // cambio password). Letti da window per non richiedere un boundary Suspense.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('scaduto')) setInfo('Sessione scaduta per inattività: accedi di nuovo.')
    else if (p.get('reset')) setInfo('Password aggiornata. Ora puoi accedere.')
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Completa la verifica di sicurezza (captcha).')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (error) {
      setError('Email o password non corretti.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      trackEvento('login_fallito')
      return
    }
    trackEvento('login_riuscito')

    // Collega un eventuale invito: sia quello salvato nei metadati durante la
    // registrazione (link di conferma aperto in un altro browser), sia quello
    // passato in ?invito= (utente GIÀ registrato che arriva da un NUOVO invito,
    // es. nuovo preparatore la stagione successiva). In entrambi i casi agiamo
    // solo sul proprio account, appena autenticati come sé stessi.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const invitoQuery = new URLSearchParams(window.location.search).get('invito')
      const invToken = invitoQuery || user?.user_metadata?.invito_token
      if (invToken) {
        await fetch('/api/consuma-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invToken }),
        })
        if (user?.user_metadata?.invito_token) {
          await supabase.auth.updateUser({ data: { invito_token: null } })
        }
      }
    } catch (err) {
      console.warn('consuma-invito post-login:', err)
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function recuperaPassword() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Scrivi prima la tua email nel campo qui sopra, poi tocca "Password dimenticata?".')
      return
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Completa prima la verifica di sicurezza (captcha) qui sotto.')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      captchaToken,
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (error) setError('Non è stato possibile inviare la mail. Riprova tra poco.')
    else setInfo('Ti abbiamo inviato una mail per reimpostare la password. Controlla anche spam e promozioni.')
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKSeason</b>
            <span>Gestione portieri</span>
          </div>
        </div>
        <form onSubmit={handleLogin}>
          {error && <div className="err">{error}</div>}
          {info && <div className="ok-msg">{info}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                style={{ paddingRight: 66 }} />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                {showPw ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <button type="button" onClick={recuperaPassword}
              style={{ background: 'none', border: 0, padding: 0, fontSize: 13, color: 'var(--azzurro, #0a7ec2)', fontWeight: 600, cursor: 'pointer' }}>
              Password dimenticata?
            </button>
          </div>
          {HCAPTCHA_SITE_KEY && (
            <div className="field" style={{ display: 'flex', justifyContent: 'center' }}>
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={(t) => setCaptchaToken(t)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>
        <p className="login-alt">
          Non hai un account? <Link href="/registrati">Registrati</Link>
        </p>
        <p className="login-back"><Link href="/">&larr; Torna al sito</Link></p>
      </div>
    </div>
  )
}
