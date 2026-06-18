'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PERMESSI = [
  { k: 'vede_valutazioni', label: 'Puo vedere le valutazioni' },
  { k: 'modifica_valutazioni', label: 'Puo inserire/modificare valutazioni' },
  { k: 'vede_statistiche', label: 'Puo vedere le statistiche' },
]

export default function InvitiManager({ inviti, portieri, stagioneId }) {
  const router = useRouter()
  const [tipo, setTipo] = useState('portiere')
  const [portiereId, setPortiereId] = useState(portieri[0]?.id ?? '')
  const [emailInvitato, setEmailInvitato] = useState('')
  const [perm, setPerm] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function crea() {
    setBusy(true); setError('')
    const supabase = createClient()

    // Controlla se esiste già un invito attivo per questo portiere
    if (tipo === 'portiere' && portiereId) {
      const esistente = inviti.find(
        (inv) => inv.stato === 'attivo' && inv.tipo === 'portiere' && inv.portiere_id === portiereId
      )
      if (esistente) {
        setError('Esiste già un invito attivo per questo portiere. Revocalo prima di crearne uno nuovo.')
        setBusy(false)
        return
      }
    }

    const token = (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now()
    ).replace(/-/g, '')

    const row = {
      token,
      tipo,
      stagione_id: stagioneId,
      stato: 'attivo',
      portiere_id: tipo === 'portiere' ? (portiereId || null) : null,
      email_invitato: emailInvitato.trim() || null,
      permessi: tipo === 'collaboratore' ? perm : {},
    }
    const { error } = await supabase.from('inviti').insert(row)
    if (error) setError(error.message)
    else setEmailInvitato('')
    setBusy(false)
    router.refresh()
  }

  async function revoca(id) {
    const supabase = createClient()
    await supabase.from('inviti').update({ stato: 'revocato' }).eq('id', id)
    router.refresh()
  }
  async function elimina(id) {
    if (!confirm('Eliminare questo invito?')) return
    const supabase = createClient()
    await supabase.from('inviti').delete().eq('id', id)
    router.refresh()
  }
  function linkOf(token) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/registrati?invito=${token}`
  }
  async function copia(token) {
    try { await navigator.clipboard.writeText(linkOf(token)); alert('Link copiato negli appunti.') }
    catch { window.prompt('Copia il link:', linkOf(token)) }
  }

  const nomePortiere = (id) => {
    const p = portieri.find((x) => x.id === id)
    return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : ''
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Crea un link d&apos;invito da inviare al portiere o collaboratore. Chi lo apre si registra e l&apos;account
        viene collegato automaticamente per la stagione corrente. Se inserisci l&apos;email, verrà pre-compilata
        nel modulo di registrazione (non modificabile).
      </p>
      <div className="scheda">
        {error && <div className="err">{error}</div>}
        <div className="form-grid">
          <div className="field"><label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="portiere">Portiere</option>
              <option value="collaboratore">Collaboratore</option>
            </select></div>
          {tipo === 'portiere' && (
            <div className="field"><label>Portiere</label>
              <select value={portiereId} onChange={(e) => setPortiereId(e.target.value)}>
                {portieri.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>)}
              </select></div>
          )}
          <div className="field"><label>Email invitato (opzionale)</label>
            <input
              type="email"
              value={emailInvitato}
              onChange={(e) => setEmailInvitato(e.target.value)}
              placeholder="es. mario.rossi@email.com"
            />
          </div>
        </div>
        {tipo === 'collaboratore' && (
          <div className="elenco-blocco">
            <h3>Permessi</h3>
            {PERMESSI.map((pm) => (
              <label className="es-pick" key={pm.k}>
                <input type="checkbox" checked={!!perm[pm.k]} onChange={(e) => setPerm((s) => ({ ...s, [pm.k]: e.target.checked }))} />
                <span>{pm.label}</span>
              </label>
            ))}
          </div>
        )}
        <div className="form-actions">
          <button className="btn" onClick={crea} disabled={busy || (tipo === 'portiere' && !portiereId)} type="button">
            {busy ? 'Creazione...' : 'Crea invito'}
          </button>
        </div>
      </div>

      <div className="elenco-blocco">
        <h3>Inviti creati</h3>
        {inviti.length === 0 && <p className="sub-intro">Nessun invito.</p>}
        {inviti.map((inv) => (
          <div className={`lista-riga ${inv.stato !== 'attivo' ? 'assente' : ''}`} key={inv.id}>
            <div style={{ flex: 1 }}>
              <div>
                <b>{inv.tipo === 'portiere' ? 'Portiere' : 'Collaboratore'}</b>
                {inv.portiere_id ? ` \u00b7 ${nomePortiere(inv.portiere_id)}` : ''}
                {inv.email_invitato ? <span style={{ color: '#6b7e8e', marginLeft: 6, fontSize: 12 }}>{inv.email_invitato}</span> : null}
              </div>
              <small>
                {inv.stato}
                {inv.consumato_da ? ' \u00b7 usato' : ''}
              </small>
            </div>
            {inv.stato === 'attivo' && (
              <button className="btn-mini" onClick={() => copia(inv.token)} type="button">Copia link</button>
            )}
            {inv.stato === 'attivo' && (
              <button className="btn-mini" onClick={() => revoca(inv.id)} type="button">Revoca</button>
            )}
            <button className="btn-mini btn-del" onClick={() => elimina(inv.id)} type="button">Elimina</button>
          </div>
        ))}
      </div>
    </div>
  )
}
