'use client'

import { useState, useRef } from 'react'
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import { trackMetaEvento } from '@/app/components/MetaPixel'
import { leggiAttribuzione } from '@/app/components/AttribuzioneUtm'
import { useTranslations, useLocale } from 'next-intl'
import Captcha from '@/app/components/Captcha'

// Turnstile: se la variabile non c'e', il captcha non viene mostrato
// (meglio nessun captcha che un widget che punta al fornitore sbagliato).
const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export default function RegistratiClient({ token, datiInvito }) {
  const router = useRouter()
  const t = useTranslations('registrati')
  const locale = useLocale()
  const [nome, setNome] = useState(datiInvito?.nomeCompleto ?? '')
  const [email, setEmail] = useState(datiInvito?.email ?? '')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [iscriviNewsletter, setIscriviNewsletter] = useState(true)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)

  const nomeBloccato = !!datiInvito?.nomeCompleto
  const emailBloccata = !!datiInvito?.email
  const tokenInvalido = token && !datiInvito
  // Selezione ruolo: solo per chi arriva senza invito (auto-registrazione).
  // Chi ha un invito ha già il ruolo deciso dal link, non deve scegliere.
  const [ruoloScelto, setRuoloScelto] = useState(datiInvito ? 'invitato' : null)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (password.length < 8) {
      setError(t('errorePassword'))
      return
    }
    if (password !== password2) {
      setError(t('passwordMismatch'))
      return
    }
    if (!email.trim()) {
      setError(t('erroreEmail'))
      return
    }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      setError(t('captchaMancante'))
      return
    }
    if (!accettaPrivacy) {
      setError(t('devAccettarePrivacy'))
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        captchaToken,
        data: { nome_completo: nome.trim(), lingua: locale, ...(token && datiInvito ? { invito_token: token } : {}) },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/benvenuto`,
      },
    })

    if (signUpError) {
      if (
        signUpError.message?.toLowerCase().includes('already registered') ||
        signUpError.message?.toLowerCase().includes('already been registered') ||
        signUpError.message?.toLowerCase().includes('email address is already')
      ) {
        if (token && datiInvito) {
          router.push(`/login?invito=${encodeURIComponent(token)}`)
          return
        }
        setError(t('emailGiaRegistrata'))
      } else {
        setError(signUpError.message)
      }
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      trackEvento('registrazione_fallita', {
        tipo_invito: datiInvito?.tipo ?? null,
        motivo: signUpError.code || signUpError.name || 'sconosciuto',
        stato_http: signUpError.status ?? null,
      })
      return
    }

    // Iscrizione newsletter
    if (iscriviNewsletter && data.user) {
      const { createClient: cc } = await import('@/lib/supabase/client')
      const sb = cc()
      await sb.from('newsletter_iscritti').upsert(
        { email: email.trim(), utente_id: data.user.id, attivo: true },
        { onConflict: 'email' }
      )
    }

    // Consuma l'invito SOLO se il nuovo utente è già autenticato come sé stesso.
    // Questo accade quando la conferma-email è DISATTIVATA: signUp apre subito
    // la sessione del nuovo utente (data.session esiste ed è la sua).
    // Se la conferma-email è ATTIVA, data.session è null e nel browser potrebbe
    // esserci ancora la sessione di un ALTRO account (es. l'allenatore che prova
    // il proprio invito): consumare adesso dirotterebbe quell'account.
    // In quel caso NON facciamo nulla qui: il token è salvato nei metadati
    // (options.data.invito_token) e verrà consumato in /auth/callback dopo la
    // conferma email, quando la sessione sarà con certezza quella dell'invitato.
    let consumaErrore = null
    if (token && datiInvito && data.user && data.session && data.session.user?.id === data.user.id) {
      try {
        const res = await fetch('/api/consuma-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          consumaErrore = body.error || 'Collegamento invito non riuscito.'
          console.warn('consuma-invito:', consumaErrore)
        }
      } catch (err) {
        consumaErrore = err?.message || 'Collegamento invito non riuscito.'
        console.warn('consuma-invito fetch error:', err)
      }
    }
    // Se la consumazione dell'invito è fallita, NON proseguire in silenzio:
    // mostra il motivo così l'utente/allenatore capisce (es. account già
    // allenatore attivo) invece di ritrovarsi col ruolo sbagliato.
    if (consumaErrore) {
      setError(consumaErrore)
      setLoading(false)
      return
    }

    if (data.session) {
      // Sessione immediata (email confirm disabilitata): vai all'app
      trackEvento('registrazione_completata', { tipo_invito: datiInvito?.tipo ?? null, richiede_conferma_email: false, ...(leggiAttribuzione() || {}) })
      trackMetaEvento('CompleteRegistration')
      router.push('/dashboard')
      router.refresh()
    } else {
      // Email di conferma richiesta
      trackEvento('registrazione_completata', { tipo_invito: datiInvito?.tipo ?? null, richiede_conferma_email: true, ...(leggiAttribuzione() || {}) })
      trackMetaEvento('CompleteRegistration')
      setMsg(t('mailConferma', { email: email.trim() }))
      setLoading(false)
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

        {tokenInvalido && (
          <div className="err" style={{ marginBottom: 16 }}>
            {t('linkInvalido')}
          </div>
        )}

        {datiInvito && (
          <div className="ok-msg" style={{ marginBottom: 16 }}>
            {t.rich('registrazioneCome', { ruolo: datiInvito.tipo === 'portiere' ? t('ruoloPortiere') : t('ruoloCollaboratore'), b: (ch) => <b>{ch}</b> })}
            {nomeBloccato ? t('nomePrecompilato') : ''}
          </div>
        )}

        {/* Selezione ruolo — solo per auto-registrazione (senza invito) */}
        {!datiInvito && !tokenInvalido && ruoloScelto !== 'allenatore' && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('chiSei')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setRuoloScelto('allenatore')}
                style={{ width: '100%' }}
              >
                {t('sonoAllenatore')}
              </button>
              <button
                type="button"
                className={ruoloScelto === 'portiere' ? 'btn' : 'btn-ghost'}
                onClick={() => setRuoloScelto('portiere')}
                style={{ width: '100%' }}
              >
                {t('sonoPortiere')}
              </button>
            </div>

            {ruoloScelto === 'portiere' && (
              <div className="ok-msg" style={{ marginTop: 14, textAlign: 'left', lineHeight: 1.5 }}>
                {t.rich('portiereInfo', { b: (ch) => <b>{ch}</b> })}
              </div>
            )}
          </div>
        )}

        {(ruoloScelto === 'allenatore' || ruoloScelto === 'invitato') && (
        <form onSubmit={handleSignup}>
          {error && <div className="err">{error}</div>}
          {msg && <div className="ok-msg">{msg}</div>}
          <div className="field">
            <label htmlFor="nome">{t('labelNome')}</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => !nomeBloccato && setNome(e.target.value)}
              readOnly={nomeBloccato}
              required
              style={nomeBloccato ? { background: '#f0f4f8', color: '#6b7e8e', cursor: 'not-allowed' } : {}}
            />
          </div>
          <div className="field">
            <label htmlFor="email">{t('labelEmail')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => !emailBloccata && setEmail(e.target.value)}
              readOnly={emailBloccata}
              required
              autoComplete="email"
              style={emailBloccata ? { background: '#f0f4f8', color: '#6b7e8e', cursor: 'not-allowed' } : {}}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t('labelPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ paddingRight: 66 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}
              >
                {showPw ? t('nascondi') : t('mostra')}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="password2">{t('confermaPassword')}</label>
            <input
              id="password2"
              type={showPw ? 'text' : 'password'}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
            <input type="checkbox" checked={accettaPrivacy} onChange={(e) => setAccettaPrivacy(e.target.checked)} required style={{ marginTop: 3 }} />
            <span>
              {t.rich('accettoPrivacy', {
                privacy: (ch) => <Link href="/privacy-policy" target="_blank" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>{ch}</Link>,
                termini: (ch) => <Link href="/termini-di-servizio" target="_blank" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>{ch}</Link>,
              })}
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
            <input type="checkbox" checked={iscriviNewsletter} onChange={(e) => setIscriviNewsletter(e.target.checked)} />
            {t('newsletter')}
          </label>
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
          <button className="btn" type="submit" disabled={loading || tokenInvalido}>
            {loading ? t('creazione') : t('creaAccount')}
          </button>
        </form>
        )}
        <p className="login-alt">
          {t('haiAccount')} <Link href="/login">{t('accedi')}</Link>
        </p>
      </div>
    </div>
  )
}
