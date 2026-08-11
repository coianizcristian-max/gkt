'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o password non corretti.')
      setLoading(false)
      trackEvento('login_fallito')
      return
    }
    trackEvento('login_riuscito')

    // Se l'utente porta un invito ancora da collegare nei metadati (tipico:
    // ha aperto il link di conferma email in un browser diverso da quello di
    // registrazione, quindi il collegamento automatico in /auth/callback non è
    // scattato), consumalo ORA che è autenticato come SÉ STESSO. Sicuro: agisce
    // solo sul proprio account e solo se il token è presente.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const invToken = user?.user_metadata?.invito_token
      if (invToken) {
        await fetch('/api/consuma-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invToken }),
        })
        await supabase.auth.updateUser({ data: { invito_token: null } })
      }
    } catch (err) {
      console.warn('consuma-invito post-login:', err)
    }

    router.push('/dashboard')
    router.refresh()
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
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
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
