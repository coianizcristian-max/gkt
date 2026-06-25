'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VersioniManager({ versioni }) {
  const router = useRouter()
  const [nuova, setNuova] = useState({ numero: '', titolo: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editNote, setEditNote] = useState('')

  async function crea() {
    if (!nuova.numero.trim()) return
    setBusy(true)
    const supabase = createClient()
    const noteArray = nuova.note
      .split('\n')
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
    await supabase.from('versioni').insert({
      numero: nuova.numero.trim(),
      titolo: nuova.titolo.trim() || null,
      note: noteArray,
      pubblicata: false,
    })
    setNuova({ numero: '', titolo: '', note: '' })
    setBusy(false)
    router.refresh()
  }

  async function togglePubblica(id, attuale) {
    const supabase = createClient()
    await supabase.from('versioni').update({ pubblicata: !attuale }).eq('id', id)
    router.refresh()
  }

  async function salvaNote(id) {
    const supabase = createClient()
    const noteArray = editNote
      .split('\n')
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
    await supabase.from('versioni').update({ note: noteArray }).eq('id', id)
    setEditId(null)
    router.refresh()
  }

  async function elimina(id) {
    if (!confirm('Eliminare questa versione?')) return
    const supabase = createClient()
    await supabase.from('versioni').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">

      {/* Form nuova versione */}
      <div className="scheda" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>+ Nuova versione</h3>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Numero versione *</label>
            <input
              value={nuova.numero}
              onChange={e => setNuova(p => ({ ...p, numero: e.target.value }))}
              placeholder="es. 1.1.0"
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Titolo (opzionale)</label>
            <input
              value={nuova.titolo}
              onChange={e => setNuova(p => ({ ...p, titolo: e.target.value }))}
              placeholder="es. Aggiornamento estate 2026"
            />
          </div>
        </div>
        <div className="field">
          <label>Note (una per riga, inizia con - oppure scrivi direttamente)</label>
          <textarea
            rows={6}
            value={nuova.note}
            onChange={e => setNuova(p => ({ ...p, note: e.target.value }))}
            placeholder={"- Fix statistiche portieri\n- Aggiunto drag&drop esercizi\n- Nuovo wizard stagione"}
          />
        </div>
        <button className="btn" onClick={crea} disabled={busy || !nuova.numero.trim()} type="button">
          {busy ? 'Salvataggio...' : 'Crea versione'}
        </button>
      </div>

      {/* Lista versioni esistenti */}
      {versioni.map(v => (
        <div key={v.id} className="elenco-blocco" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>v{v.numero}</span>
            {v.titolo && <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{v.titolo}</span>}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: v.pubblicata ? 'rgba(46,158,91,0.1)' : 'rgba(200,200,200,0.2)',
              color: v.pubblicata ? 'var(--campo)' : 'var(--ink-soft)',
            }}>
              {v.pubblicata ? '✓ Pubblicata' : 'Bozza'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 'auto' }}>
              {new Date(v.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>

          {editId === v.id ? (
            <div>
              <textarea
                rows={6}
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-mini" onClick={() => salvaNote(v.id)} type="button">Salva</button>
                <button className="btn-mini" onClick={() => setEditId(null)} type="button">Annulla</button>
              </div>
            </div>
          ) : (
            <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: 13 }}>
              {(v.note ?? []).map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn-mini"
              onClick={() => { setEditId(v.id); setEditNote((v.note ?? []).join('\n')) }}
              type="button"
              disabled={editId === v.id}
            >
              Modifica note
            </button>
            <button
              className={`btn-mini ${v.pubblicata ? '' : 'btn-del'}`}
              onClick={() => togglePubblica(v.id, v.pubblicata)}
              type="button"
            >
              {v.pubblicata ? 'Ritira' : '📢 Pubblica'}
            </button>
            <button className="btn-mini btn-del" onClick={() => elimina(v.id)} type="button">
              Elimina
            </button>
          </div>
        </div>
      ))}

      {versioni.length === 0 && (
        <div className="empty">Nessuna versione ancora. Creane una prima di fare deploy.</div>
      )}
    </div>
  )
}
