'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegistratiClient({ token, datiInvito }) {
  const router = useRouter()
  const [nome, setNome] = useState(datiInvito?.nomeCompleto ?? '')
  const [email, setEmail] = useState(datiInvito?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const nomeBloccato = !!datiInvito?.nomeCompleto
  const emailBloccata = !!datiInvito?.email

  // Se il token non è valido (assente o non trovato), mostriamo avviso
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
      // Messaggi più chiari per gli errori comuni
      if (signUpError.message?.toLowerCase().includes('already registered') ||
          signUpError.message?.toLowerCase().includes('already been registered') ||
          signUpError.message?.toLowerCase().includes('email address is already')) {
        setError('Questa email è già registrata. Vai alla pagina di accesso.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
    } else {
      setMsg('Account creato! Controlla la tua email per confermare l\'indirizzo, poi accedi.')
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKT</b>
            <span>Gestione portieri</span>
          </div>
        </div>

        {tokenInvalido && (
          <div className="err" style={{ marginBottom: 16 }}>
            Il link d&apos;invito non è valido o è già stato utilizzato. Contatta il tuo allenatore per riceverne uno nuovo.
          </div>
        )}

        {datiInvito && (
          <div className="ok-msg" style={{ marginBottom: 16 }}>
            Stai completando la registrazione come <b>{datiInvito.tipo === 'portiere' ? 'portiere' : 'collaboratore'}</b>.
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
