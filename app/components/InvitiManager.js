'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MODULI_PERMESSI, LIVELLI, permessiDiDefault } from '@/lib/permessi'

// Modal per copiare il link su mobile
function LinkModal({ url, onClose }) {
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      // fallback: seleziona l'input
      const el = document.getElementById('link-invito-input')
      if (el) { el.select(); el.setSelectionRange(0, 99999) }
    }
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="popup-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Link di invito</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
          Copia questo link e invialo al portiere. Chi lo apre potrà registrarsi e verrà collegato automaticamente.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="link-invito-input"
            readOnly
            value={url}
            onClick={(e) => e.target.select()}
            style={{
              flex: 1, padding: '10px 12px', border: '1px solid var(--linea)',
              borderRadius: 'var(--r-sm)', fontSize: 13, background: 'var(--carta)',
              fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          />
          <button className="btn" onClick={copia} type="button" style={{ width: 'auto', padding: '10px 16px', flexShrink: 0 }}>
            {copiato ? '✓ Copiato' : 'Copia'}
          </button>
        </div>
        {copiato && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--campo)', fontWeight: 600 }}>
            ✓ Link copiato negli appunti!
          </p>
        )}
      </div>
    </div>
  )
}

export default function InvitiManager({ inviti, portieri, stagioneId }) {
  const router = useRouter()
  const [tipo, setTipo] = useState('')
  const [portiereId, setPortiereId] = useState(portieri[0]?.id ?? '')
  const [emailInvitato, setEmailInvitato] = useState('')
  const [perm, setPerm] = useState(permessiDiDefault())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalUrl, setModalUrl] = useState(null)

  async function crea() {
    setBusy(true); setError('')
    const supabase = createClient()

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
    const { error: insertErr } = await supabase.from('inviti').insert(row)
    if (insertErr) { setError(insertErr.message); setBusy(false); return }

    setEmailInvitato('')
    setBusy(false)
    router.refresh()

    // Apri direttamente il modal con il link appena creato
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    setModalUrl(`${origin}/registrati?invito=${token}`)
  }

  async function revoca(id) {
    const supabase = createClient()
    await supabase.from('inviti').update({ stato: 'revocato' }).eq('id', id)
    router.refresh()
  }

  async function elimina(id) {
    const inv = inviti.find((i) => i.id === id)
    const msg = inv?.consumato_da
      ? 'Questo invito è già stato usato. Eliminarlo rimuove solo il record ma NON revoca l\'accesso. Continuare?'
      : 'Eliminare questo invito?'
    if (!confirm(msg)) return
    const supabase = createClient()
    await supabase.from('inviti').delete().eq('id', id)
    router.refresh()
  }

  function linkOf(token) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/registrati?invito=${token}`
  }

  const nomePortiere = (id) => {
    const p = portieri.find((x) => x.id === id)
    return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : ''
  }

  return (
    <div className="lista-editor">
      {modalUrl && <LinkModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      <p className="sub-intro">
        Crea un link d&apos;invito da inviare a un portiere o a un membro dello staff. Il portiere accede alle sue statistiche e alla sua pagina che legge i dati inseriti dall&apos;allenatore. Lo staff condivide automaticamente le stesse funzionalità sbloccate dall&apos;abbonamento dell&apos;allenatore principale.
      </p>
      <div className="scheda">
        {error && <div className="err">{error}</div>}
        <div className="form-grid">
          <div className="field" style={{
            border: tipo ? 'none' : '2px solid var(--azzurro)',
            borderRadius: tipo ? 0 : 'var(--r)',
            padding: tipo ? 0 : '10px 12px',
            background: tipo ? 'transparent' : 'rgba(10,126,194,0.04)',
            transition: 'all 0.2s',
          }}>
            {!tipo && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azzurro)', marginBottom: 6 }}>
                👆 Seleziona chi stai invitando per continuare
              </div>
            )}
            <label>Tipo <span style={{ color: 'var(--rosso)' }}>*</span></label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              style={{ border: tipo ? '' : '1px solid var(--azzurro)', fontWeight: tipo ? 'normal' : '600' }}>
              <option value="" disabled>— Seleziona tipo —</option>
              <option value="portiere">Portiere</option>
              <option value="collaboratore">Staff / Collaboratore</option>
            </select>
          </div>
          {tipo === 'portiere' && (
            <div className="field"><label>Portiere</label>
              <select value={portiereId} onChange={(e) => setPortiereId(e.target.value)}>
                {portieri.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>)}
              </select></div>
          )}
          <div className="field"><label>Email invitato (opzionale)</label>
            <input type="email" value={emailInvitato} onChange={(e) => setEmailInvitato(e.target.value)}
              placeholder="es. mario.rossi@email.com" />
          </div>
        </div>
        {tipo === 'collaboratore' && (
          <div className="elenco-blocco">
            <h3>Permessi per modulo</h3>
            <p className="sub-intro" style={{ marginTop: -6 }}>
              Scegli cosa può vedere e modificare questo collaboratore in ogni sezione.
            </p>
            {Object.entries(MODULI_PERMESSI).map(([k, info]) => (
              <div key={k} className="lista-riga" style={{ flexWrap: 'wrap', gap: 10 }}>
                <span style={{ flex: '1 1 140px', fontWeight: 600, fontSize: 13 }}>{info.label}</span>
                <select value={perm[k] ?? 'modifica'} onChange={(e) => setPerm((s) => ({ ...s, [k]: e.target.value }))}>
                  {LIVELLI.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
        <div className="form-actions">
          <button className="btn" onClick={crea} disabled={busy || !tipo || (tipo === 'portiere' && !portiereId)} type="button">
            {busy ? 'Creazione...' : 'Crea invito e copia link'}
          </button>
        </div>
      </div>

      <div className="elenco-blocco">
        <h3>Inviti creati</h3>
        {inviti.length === 0 && <p className="sub-intro">Nessun invito.</p>}
        {inviti.map((inv) => (
          <div className={`lista-riga ${inv.stato === 'attivo' ? '' : 'assente'}`} key={inv.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {inv.tipo === 'portiere' ? 'Portiere' : '👤 Staff'}
                {inv.portiere_id ? ` · ${nomePortiere(inv.portiere_id)}` : ''}
                {inv.email_invitato
                  ? <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontSize: 12 }}>{inv.email_invitato}</span>
                  : null}
              </div>
              <small>
                {inv.stato === 'attivo' ? '🟢 attivo' : inv.stato === 'consumato' ? '✅ usato' : '⛔ revocato'}
                {inv.consumato_da ? ' · collegato' : ''}
              </small>
            </div>
            {inv.stato === 'attivo' && (
              <button className="btn-mini" onClick={() => setModalUrl(linkOf(inv.token))} type="button">
                📋 Link
              </button>
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
