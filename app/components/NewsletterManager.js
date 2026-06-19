'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Template A: solo testo (multi-sezione)
// Template B: testo + foto alternate

const TEMPLATE_A = 'testo'
const TEMPLATE_B = 'testo_foto'

function EditorSezione({ sezione, idx, onUpdate, onRemove }) {
  return (
    <div style={{ border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Sezione {idx + 1} — {sezione.tipo === 'foto' ? '📷 Foto' : '📝 Testo'}</span>
        <button type="button" className="btn-mini btn-del" onClick={onRemove}>Rimuovi</button>
      </div>
      {sezione.tipo === 'testo' && (
        <textarea rows="4" value={sezione.testo} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
          placeholder="Scrivi il testo di questa sezione..." style={{ width: '100%', boxSizing: 'border-box' }} />
      )}
      {sezione.tipo === 'foto' && (
        <div>
          <input type="url" value={sezione.foto_url ?? ''} onChange={(e) => onUpdate({ ...sezione, foto_url: e.target.value })}
            placeholder="URL immagine (es. https://...)" style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }} />
          <textarea rows="2" value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
            placeholder="Didascalia (opzionale)" style={{ width: '100%', boxSizing: 'border-box' }} />
          {sezione.foto_url && <img src={sezione.foto_url} alt="" style={{ maxWidth: '100%', marginTop: 6, borderRadius: 'var(--r-sm)', maxHeight: 160, objectFit: 'cover' }} />}
        </div>
      )}
    </div>
  )
}

function EditorNL({ onSaved, onCancel }) {
  const [titolo, setTitolo] = useState('')
  const [template, setTemplate] = useState(TEMPLATE_A)
  const [sezioni, setSezioni] = useState([{ tipo: 'testo', testo: '' }])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function addSezione(tipo) { setSezioni((s) => [...s, { tipo, testo: '', foto_url: '' }]) }
  function updateSezione(i, s) { setSezioni((arr) => arr.map((x, idx) => idx === i ? s : x)) }
  function removeSezione(i) { setSezioni((arr) => arr.filter((_, idx) => idx !== i)) }

  async function salva(pubblicata) {
    if (!titolo.trim()) { setErr('Inserisci il titolo'); return }
    setBusy(true); setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('newsletter_invii').insert({
      titolo: titolo.trim(), contenuto: sezioni, pubblicata,
      inviata_il: pubblicata ? new Date().toISOString() : null,
    })
    if (error) { setErr(error.message); setBusy(false); return }
    setBusy(false); if (onSaved) onSaved()
  }

  return (
    <div className="scheda">
      <h3 style={{ marginTop: 0 }}>Nuova newsletter</h3>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label>Titolo</label>
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="es. Aggiornamenti di marzo 2026" />
      </div>
      <div className="field">
        <label>Template</label>
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value={TEMPLATE_A}>📝 Solo testo (multi-sezione)</option>
          <option value={TEMPLATE_B}>📷 Testo + foto alternate</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Sezioni</div>
        {sezioni.map((s, i) => (
          <EditorSezione key={i} sezione={s} idx={i}
            onUpdate={(ns) => updateSezione(i, ns)}
            onRemove={() => removeSezione(i)} />
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-ghost" onClick={() => addSezione('testo')}>+ Sezione testo</button>
          {template === TEMPLATE_B && (
            <button type="button" className="btn-ghost" onClick={() => addSezione('foto')}>+ Sezione foto</button>
          )}
        </div>
      </div>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>}
        <button type="button" className="btn-ghost" onClick={() => salva(false)} disabled={busy}>Salva bozza</button>
        <button type="button" className="btn" onClick={() => salva(true)} disabled={busy}>
          {busy ? 'Pubblicazione...' : 'Pubblica'}
        </button>
      </div>
    </div>
  )
}

export default function NewsletterManager({ invii, iscritti }) {
  const router = useRouter()
  const [crea, setCrea] = useState(false)

  async function pubblica(id) {
    const supabase = createClient()
    await supabase.from('newsletter_invii').update({ pubblicata: true, inviata_il: new Date().toISOString() }).eq('id', id)
    router.refresh()
  }
  async function elimina(id) {
    if (!confirm('Eliminare questa newsletter?')) return
    const supabase = createClient()
    await supabase.from('newsletter_invii').delete().eq('id', id)
    router.refresh()
  }

  const totIscritti = iscritti.filter((i) => i.attivo).length

  return (
    <div className="lista-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="sub-intro" style={{ margin: 0 }}>
          <b>{totIscritti}</b> iscritti attivi alla newsletter.
        </p>
        <button className="btn-azione" type="button" onClick={() => setCrea(true)}>+ Nuova newsletter</button>
      </div>

      {crea && <EditorNL onSaved={() => { setCrea(false); router.refresh() }} onCancel={() => setCrea(false)} />}

      {/* Lista invii */}
      <div className="elenco-blocco">
        <h3>Newsletter</h3>
        {invii.length === 0 && <p className="sub-intro">Nessuna newsletter creata.</p>}
        {invii.map((n) => (
          <div key={n.id} className={`lista-riga ${n.pubblicata ? '' : 'assente'}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{n.titolo}</div>
              <small style={{ color: 'var(--ink-soft)' }}>
                {n.pubblicata
                  ? `✅ Pubblicata il ${new Date(n.inviata_il).toLocaleDateString('it-IT')}`
                  : '📝 Bozza'}
                {' · '}{(n.contenuto ?? []).length} sezioni
              </small>
            </div>
            {!n.pubblicata && (
              <button type="button" className="btn-mini" onClick={() => pubblica(n.id)}>Pubblica</button>
            )}
            <button type="button" className="btn-mini btn-del" onClick={() => elimina(n.id)}>Elimina</button>
          </div>
        ))}
      </div>

      {/* Lista iscritti */}
      <div className="elenco-blocco">
        <h3>Iscritti ({totIscritti})</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13, color: 'var(--ink-soft)' }}>
          {iscritti.map((i) => (
            <div key={i.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--linea)', opacity: i.attivo ? 1 : 0.4 }}>
              {i.email} {!i.attivo && '(disiscritto)'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
