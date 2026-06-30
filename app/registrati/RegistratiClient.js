'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'

export default function RegistratiClient({ token, datiInvito }) {
  const router = useRouter()
  const [nome, setNome] = useState(datiInvito?.nomeCompleto ?? '')
  const [email, setEmail] = useState(datiInvito?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [iscriviNewsletter, setIscriviNewsletter] = useState(true)
  const [loading, setLoading] = useState(false)

  const nomeBloccato = !!datiInvito?.nomeCompleto
  const emailBloccata = !!datiInvito?.email
  const tokenInvalido = token && !datiInvito

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.')
      return
    }
    if (!email.trim()) {
      setError('Inserisci un indirizzo email.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome_completo: nome.trim() } },
    })

    if (signUpError) {
      if (
        signUpError.message?.toLowerCase().includes('already registered') ||
        signUpError.message?.toLowerCase().includes('already been registered') ||
        signUpError.message?.toLowerCase().includes('email address is already')
      ) {
        setError('Questa email è già registrata. Vai alla pagina di accesso.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      trackEvento('registrazione_fallita', { tipo_invito: datiInvito?.tipo ?? null })
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

    // Se c'è un token invito valido, consumalo subito (collegamento portiere/collaboratore)
    if (token && datiInvito && data.user) {
      try {
        const res = await fetch('/api/consuma-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!res.ok) {
          const body = await res.json()
          console.warn('consuma-invito:', body.error)
          // Non blocchiamo la registrazione per questo — l'utente è già creato
        }
      } catch (err) {
        console.warn('consuma-invito fetch error:', err)
      }
    }

    if (data.session) {
      // Sessione immediata (email confirm disabilitata): vai all'app
      trackEvento('registrazione_completata', { tipo_invito: datiInvito?.tipo ?? null, richiede_conferma_email: false })
      router.push('/portieri')
      router.refresh()
    } else {
      // Email di conferma richiesta
      trackEvento('registrazione_completata', { tipo_invito: datiInvito?.tipo ?? null, richiede_conferma_email: true })
      setMsg("Account creato! Controlla la tua email per confermare l'indirizzo, poi accedi.")
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
            <span>Gestione portieri</span>
          </div>
        </div>

        {tokenInvalido && (
          <div className="err" style={{ marginBottom: 16 }}>
            Il link d&apos;invito non è valido o è già stato utilizzato.
            Contatta il tuo allenatore per riceverne uno nuovo.
          </div>
        )}

        {datiInvito && (
          <div className="ok-msg" style={{ marginBottom: 16 }}>
            Registrazione come <b>{datiInvito.tipo === 'portiere' ? 'portiere' : 'collaboratore'}</b>.
            {nomeBloccato ? ' Il nome è pre-compilato e non modificabile.' : ''}
          </div>
        )}

        <form onSubmit={handleSignup}>
          {error && <div className="err">{error}</div>}
          {msg && <div className="ok-msg">{msg}</div>}
          <div className="field">
            <label htmlFor="nome">Nome e cognome</label>
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
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
            <input type="checkbox" checked={iscriviNewsletter} onChange={(e) => setIscriviNewsletter(e.target.checked)} />
            Iscrivimi alla newsletter GKSeason (puoi disiscriverti in qualsiasi momento)
          </label>
          <button className="btn" type="submit" disabled={loading || tokenInvalido}>
            {loading ? 'Creazione…' : 'Crea account'}
          </button>
        </form>
        <p className="login-alt">
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </div>
    </div>
  )
}
