'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MODULI_PERMESSI, LIVELLI, permessiDiDefault } from '@/lib/permessi'
import PaywallBanner from '@/app/components/PaywallBanner'

// Modal per copiare il link su mobile
function LinkModal({ url, onClose }) {
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      const el = document.getElementById('link-invito-input')
      if (el) { el.select(); el.setSelectionRange(0, 99999) }
    }
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="popup-close" onClick={onClose} type="button">X</button>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Link di invito</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
          Copia questo link e invialo. Chi lo apre potrà registrarsi e verrà collegato automaticamente.
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
          <button className="btn" onClick={copia} type="button" style={{ flexShrink: 0 }}>
            {copiato ? '✓ Copiato' : 'Copia'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InvitiManager({ inviti: invitiIniziali, portieri, stagioneId, canStaff = true }) {
  const router = useRouter()
  const [inviti, setInviti] = useState(invitiIniziali)
  const [tipo, setTipo] = useState('')
  const [portiereId, setPortiereId] = useState('')
  const [permessi, setPermessi] = useState(permessiDiDefault)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalUrl, setModalUrl] = useState(null)

  const linkOf = (token) => `${window.location.origin}/registrazione?invito=${token}`

  const nomePortiere = (id) => {
    const p = portieri.find((x) => x.id === id)
    return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : ''
  }

  async function crea() {
    setError('')
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Genera token univoco
      const token = crypto.randomUUID()

      const payload = {
        token,
        stagione_id: stagioneId,
        tipo,
        stato: 'attivo',
      }

      // Campi extra per tipo portiere
      if (tipo === 'portiere') {
        if (!portiereId) { setError('Seleziona un portiere.'); setBusy(false); return }
        payload.portiere_id = portiereId
      }

      // Staff/preparatore: funzionalità a pagamento
      if ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff) {
        setError('Invito staff/preparatore non disponibile con il tuo piano.')
        setBusy(false)
        return
      }

      // Campi extra per tipo collaboratore
      if (tipo === 'collaboratore') {
        payload.permessi = permessi
      }

      // Tipo preparatore: nessun campo extra (il legame avviene lato consuma-invito)

      const { error: insErr } = await supabase.from('inviti').insert(payload)
      if (insErr) { setError(insErr.message); setBusy(false); return }

      // Ricarica lista inviti
      const { data: nuoviInviti } = await supabase
        .from('inviti')
        .select('*')
        .eq('stagione_id', stagioneId)
        .order('created_at', { ascending: false })

      setInviti(nuoviInviti ?? [])
      setTipo('')
      setPortiereId('')
      setPermessi(permessiDiDefault)
      setModalUrl(linkOf(token))
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  async function revoca(id) {
    const supabase = createClient()
    await supabase.from('inviti').update({ stato: 'revocato' }).eq('id', id)
    setInviti(prev => prev.map(i => i.id === id ? { ...i, stato: 'revocato' } : i))
  }

  async function elimina(id) {
    const supabase = createClient()
    await supabase.from('inviti').delete().eq('id', id)
    setInviti(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="lista-editor">
      {modalUrl && <LinkModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      <p className="sub-intro">
        Crea un link d&apos;invito da inviare a un portiere, a un membro dello staff o a un preparatore collaboratore.
        Il portiere accede alle sue statistiche. Lo staff condivide le funzionalità dell&apos;allenatore principale.
        Il preparatore mantiene la propria area autonoma e condivide la libreria esercizi.
      </p>

      <div className="scheda">
        {error && <div className="err">{error}</div>}
        <div className="form-grid">

          {/* Selezione tipo */}
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
              <option value="collaboratore">{canStaff ? 'Staff / Collaboratore' : '🔒 Staff / Collaboratore — a pagamento'}</option>
              <option value="preparatore">{canStaff ? 'Preparatore (supervisione)' : '🔒 Preparatore (supervisione) — a pagamento'}</option>
            </select>
          </div>

          {!canStaff && (tipo === 'collaboratore' || tipo === 'preparatore') && (
            <PaywallBanner chiave="inviti_staff" label="Invito staff/preparatore" />
          )}

          {/* Portiere: selezione portiere */}
          {tipo === 'portiere' && (
            <div className="field"><label>Portiere</label>
              <select value={portiereId} onChange={(e) => setPortiereId(e.target.value)}>
                <option value="">— Seleziona portiere —</option>
                {portieri.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Collaboratore: permessi */}
          {tipo === 'collaboratore' && (
            <div className="field">
              <label>Permessi collaboratore</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {MODULI_PERMESSI.map((mod) => (
                  <div key={mod.chiave} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{mod.label}</span>
                    <select
                      value={permessi[mod.chiave] ?? 'nessuno'}
                      onChange={(e) => setPermessi(prev => ({ ...prev, [mod.chiave]: e.target.value }))}
                      style={{ fontSize: 13, padding: '4px 8px' }}
                    >
                      {LIVELLI.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preparatore: messaggio informativo */}
          {tipo === 'preparatore' && (
            <div className="field" style={{ background: 'rgba(10,126,194,0.04)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                🔗 Il preparatore manterrà la propria area autonoma con le sue stagioni e squadre.
                Una volta collegato, potrà vedere la tua libreria esercizi e tu potrai accedere
                alla sua area per seguire il suo lavoro.
              </p>
            </div>
          )}

          <div className="field">
            <button
              className="btn"
              onClick={crea}
              disabled={busy || !tipo || (tipo === 'portiere' && !portiereId) || ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff)}
              type="button"
            >
              {busy ? 'Creazione...' : 'Crea invito e copia link'}
            </button>
          </div>
        </div>
      </div>

      <div className="elenco-blocco">
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MODULI_PERMESSI, LIVELLI, permessiDiDefault } from '@/lib/permessi'
import PaywallBanner from '@/app/components/PaywallBanner'

// Modal per copiare il link su mobile
function LinkModal({ url, onClose }) {
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      const el = document.getElementById('link-invito-input')
      if (el) { el.select(); el.setSelectionRange(0, 99999) }
    }
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="popup-close" onClick={onClose} type="button">X</button>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Link di invito</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
          Copia questo link e invialo. Chi lo apre potrà registrarsi e verrà collegato automaticamente.
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
          <button className="btn" onClick={copia} type="button" style={{ flexShrink: 0 }}>
            {copiato ? '✓ Copiato' : 'Copia'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InvitiManager({ inviti: invitiIniziali, portieri, stagioneId, canStaff = true }) {
  const router = useRouter()
  const [inviti, setInviti] = useState(invitiIniziali)
  const [tipo, setTipo] = useState('')
  const [portiereId, setPortiereId] = useState('')
  const [permessi, setPermessi] = useState(permessiDiDefault)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalUrl, setModalUrl] = useState(null)

  const linkOf = (token) => `${window.location.origin}/registrati?invito=${token}`

  const nomePortiere = (id) => {
    const p = portieri.find((x) => x.id === id)
    return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : ''
  }

  async function crea() {
    setError('')
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Genera token univoco
      const token = crypto.randomUUID()

      const payload = {
        token,
        stagione_id: stagioneId,
        tipo,
        stato: 'attivo',
      }

      // Campi extra per tipo portiere
      if (tipo === 'portiere') {
        if (!portiereId) { setError('Seleziona un portiere.'); setBusy(false); return }
        payload.portiere_id = portiereId
      }

      // Staff/preparatore: funzionalità a pagamento
      if ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff) {
        setError('Invito staff/preparatore non disponibile con il tuo piano.')
        setBusy(false)
        return
      }

      // Campi extra per tipo collaboratore
      if (tipo === 'collaboratore') {
        payload.permessi = permessi
      }

      // Tipo preparatore: nessun campo extra (il legame avviene lato consuma-invito)

      const { error: insErr } = await supabase.from('inviti').insert(payload)
      if (insErr) { setError(insErr.message); setBusy(false); return }

      // Ricarica lista inviti
      const { data: nuoviInviti } = await supabase
        .from('inviti')
        .select('*')
        .eq('stagione_id', stagioneId)
        .order('created_at', { ascending: false })

      setInviti(nuoviInviti ?? [])
      setTipo('')
      setPortiereId('')
      setPermessi(permessiDiDefault)
      setModalUrl(linkOf(token))
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  async function revoca(id) {
    const supabase = createClient()
    await supabase.from('inviti').update({ stato: 'revocato' }).eq('id', id)
    setInviti(prev => prev.map(i => i.id === id ? { ...i, stato: 'revocato' } : i))
  }

  async function elimina(id) {
    const supabase = createClient()
    await supabase.from('inviti').delete().eq('id', id)
    setInviti(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="lista-editor">
      {modalUrl && <LinkModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      <p className="sub-intro">
        Crea un link d&apos;invito da inviare a un portiere, a un membro dello staff o a un preparatore collaboratore.
        Il portiere accede alle sue statistiche. Lo staff condivide le funzionalità dell&apos;allenatore principale.
        Il preparatore mantiene la propria area autonoma e condivide la libreria esercizi.
      </p>

      <div className="scheda">
        {error && <div className="err">{error}</div>}
        <div className="form-grid">

          {/* Selezione tipo */}
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
              <option value="collaboratore">{canStaff ? 'Staff / Collaboratore' : '🔒 Staff / Collaboratore — a pagamento'}</option>
              <option value="preparatore">{canStaff ? 'Preparatore (supervisione)' : '🔒 Preparatore (supervisione) — a pagamento'}</option>
            </select>
          </div>

          {!canStaff && (tipo === 'collaboratore' || tipo === 'preparatore') && (
            <PaywallBanner chiave="inviti_staff" label="Invito staff/preparatore" />
          )}

          {/* Portiere: selezione portiere */}
          {tipo === 'portiere' && (
            <div className="field"><label>Portiere</label>
              <select value={portiereId} onChange={(e) => setPortiereId(e.target.value)}>
                <option value="">— Seleziona portiere —</option>
                {portieri.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Collaboratore: permessi */}
          {tipo === 'collaboratore' && (
            <div className="field">
              <label>Permessi collaboratore</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {MODULI_PERMESSI.map((mod) => (
                  <div key={mod.chiave} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{mod.label}</span>
                    <select
                      value={permessi[mod.chiave] ?? 'nessuno'}
                      onChange={(e) => setPermessi(prev => ({ ...prev, [mod.chiave]: e.target.value }))}
                      style={{ fontSize: 13, padding: '4px 8px' }}
                    >
                      {LIVELLI.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preparatore: messaggio informativo */}
          {tipo === 'preparatore' && (
            <div className="field" style={{ background: 'rgba(10,126,194,0.04)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                🔗 Il preparatore manterrà la propria area autonoma con le sue stagioni e squadre.
                Una volta collegato, potrà vedere la tua libreria esercizi e tu potrai accedere
                alla sua area per seguire il suo lavoro.
              </p>
            </div>
          )}

          <div className="field">
            <button
              className="btn"
              onClick={crea}
              disabled={busy || !tipo || (tipo === 'portiere' && !portiereId) || ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff)}
              type="button"
            >
              {busy ? 'Creazione...' : 'Crea invito e copia link'}
            </button>
          </div>
        </div>
      </div>

      <div className="elenco-blocco">
        <h3>Inviti creati</h3>
        {inviti.length === 0 && <p className="sub-intro">Nessun invito.</p>}
        {inviti.map((inv) => (
          <div className={`lista-riga ${inv.stato === 'attivo' ? '' : 'assente'}`} key={inv.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {inv.tipo === 'portiere' ? 'Portiere' : inv.tipo === 'collaboratore' ? '👤 Staff' : '🔗 Preparatore'}
                {inv.portiere_id ? ` · ${nomePortiere(inv.portiere_id)}` : ''}
                {inv.tipo === 'preparatore' && inv.nome_consumatore ? ` · ${inv.nome_consumatore}` : ''}
              </div>
              {inv.email_invitato
                ? <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontSize: 12 }}>{inv.email_invitato}</span>
                : null}
              <small>
                {inv.stato === 'attivo' ? '🟢 attivo' : inv.stato === 'consumato' ? '✅ usato' : '🔴 revocato'}
                {inv.consumato_da && !inv.nome_consumatore ? ' · collegato' : inv.consumato_da && inv.tipo !== 'preparatore' ? ' · collegato' : ''}
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
