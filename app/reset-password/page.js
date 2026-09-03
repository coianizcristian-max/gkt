'use client'

// Recupero password. L'utente arriva qui dal link della mail DOPO essere
// passato da /auth/callback (che ha già scambiato il code e aperto la sessione
// di recupero). Qui scrive la nuova password e la salviamo con updateUser.
//
// Il link di recupero viene inviato da /login → recuperaPassword() con
// redirectTo = /auth/callback?next=/reset-password.
// Ricorda: aggiungi https://gkseason.it/auth/callback (e l'eventuale dominio
// Vercel) tra i Redirect URL consentiti in Supabase → Authentication → URL.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Sessione già presente (arrivo dal callback) → possiamo cambiare password.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true) })
    // Fallback per link in modalità implicit (hash nell'URL).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setPronto(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function salva(e) {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return }
    if (pw !== pw2) { setError('Le due password non coincidono.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { setError('Errore nel salvataggio. Riprova.'); setLoading(false); return }
    await supabase.auth.signOut()
    router.push('/login?reset=1')
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKSeason</b>
            <span>Recupero password</span>
          </div>
        </div>

        {!pronto ? (
          <div className="err">
            Link non valido o scaduto. Torna alla pagina di accesso e richiedi di nuovo il recupero password.
          </div>
        ) : (
          <form onSubmit={salva}>
            {error && <div className="err">{error}</div>}
            <div className="field">
              <label htmlFor="pw">Nuova password</label>
              <div style={{ position: 'relative' }}>
                <input id="pw" type={showPw ? 'text' : 'password'} value={pw}
                  onChange={(e) => setPw(e.target.value)} required autoComplete="new-password"
                  style={{ paddingRight: 66 }} />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                  {showPw ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="pw2">Conferma password</label>
              <input id="pw2" type={showPw ? 'text' : 'password'} value={pw2}
                onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Salvataggio…' : 'Salva nuova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
