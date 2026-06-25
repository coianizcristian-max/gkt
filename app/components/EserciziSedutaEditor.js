'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function EserciziSedutaEditor({ esercizi: iniziali, allenamentoId }) {
  const router = useRouter()
  const [lista, setLista] = useState(iniziali ?? [])
  const [dragIdx, setDragIdx] = useState(null)
  const [popup, setPopup] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Calcolo totale durata + recupero
  const totaleMinuti = lista.reduce((tot, e) => {
    return tot + (parseFloat(e.durata_minuti) || 0) + (parseFloat(e.recupero_minuti) || 0)
  }, 0)
  const totaleLabel = totaleMinuti > 0
    ? totaleMinuti >= 60
      ? `${Math.floor(totaleMinuti / 60)}h ${Math.round(totaleMinuti % 60)}min`
      : `${Math.round(totaleMinuti)} min`
    : null

  // Drag & drop
  function onDragStart(i) { setDragIdx(i) }
  function onDragOver(e, i) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const nuova = [...lista]
    const [item] = nuova.splice(dragIdx, 1)
    nuova.splice(i, 0, item)
    setLista(nuova)
    setDragIdx(i)
    setDone(false)
  }
  function onDrop() { setDragIdx(null) }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    try {
      await supabase.from('allenamento_esercizi').delete().eq('allenamento_id', allenamentoId)
      if (lista.length > 0) {
        const rows = lista.map((e, i) => ({ allenamento_id: allenamentoId, esercizio_id: e.id, ordine: i }))
        const { error } = await supabase.from('allenamento_esercizi').insert(rows)
        if (error) throw error
      }
      setDone(true)
      router.refresh()
    } catch (err) { alert('Errore: ' + err.message) }
    setBusy(false)
  }

  if (lista.length === 0) {
    return <div className="empty">Nessun esercizio inserito per questa seduta.</div>
  }

  return (
    <div>
      {/* Popup dettaglio esercizio */}
      {popup && (
        <div className="modal-overlay" onClick={() => setPopup(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', padding: '20px 20px 12px' }}>
              <button
                onClick={() => setPopup(null)}
                style={{
                  position: 'absolute', top: -14, right: -14,
                  width: 30, height: 30, borderRadius: '50%',
                  background: '#e74c3c', border: '2px solid #fff',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
              >✕</button>
              <h3 style={{ margin: 0 }}>{popup.titolo}</h3>
            </div>
            {popup.tipologia && <div className="stat-cat" style={{ marginBottom: 8 }}>{popup.tipologia}</div>}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {popup.video_url && (
                <a
                  href={popup.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '16px 20px', borderRadius: 8, textDecoration: 'none',
                    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                    color: '#fff', minWidth: 110, flexShrink: 0, cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span style={{ fontSize: 36, lineHeight: 1 }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>Guarda<br/>video</span>
                </a>
              )}
              {popup.immagine_url && (
                <img src={popup.immagine_url} alt="" style={{ flex: 1, minWidth: 0, borderRadius: 8, objectFit: 'cover', maxHeight: 200 }} />
              )}
            </div>
            {popup.descrizione_breve && <p><em>{popup.descrizione_breve}</em></p>}
            {popup.descrizione && <p style={{ whiteSpace: 'pre-wrap' }}>{popup.descrizione}</p>}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
              {popup.durata_minuti && <span>⏱ Durata: <b>{popup.durata_minuti} min</b></span>}
              {popup.recupero_minuti && <span>↩ Recupero: <b>{popup.recupero_minuti} min</b></span>}
            </div>

          </div>
        </div>
      )}

      {/* Lista drag & drop */}
      <div className="drag-list">
        {lista.map((e, i) => (
          <div
            key={e.id}
            className={`drag-item${dragIdx === i ? ' dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(ev) => onDragOver(ev, i)}
            onDrop={onDrop}
            onDragEnd={() => setDragIdx(null)}
          >
            <span className="drag-handle" title="Trascina per riordinare">⠿</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', width: 22, flexShrink: 0 }}>{i + 1}.</span>
            <button
              type="button"
              onClick={() => setPopup(e)}
              style={{ display: 'contents', cursor: 'pointer' }}
            >
              <div className="drag-info">
                <b>{e.titolo}</b>
                {e.tipologia && <span className="stat-cat" style={{ marginLeft: 6 }}>{e.tipologia}</span>}
                {(e.durata_minuti || e.recupero_minuti) && (
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>
                    {e.durata_minuti ? `⏱ ${e.durata_minuti}min` : ''}
                    {e.durata_minuti && e.recupero_minuti ? ' · ' : ''}
                    {e.recupero_minuti ? `↩ ${e.recupero_minuti}min rec.` : ''}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--azzurro)', marginLeft: 8 }}>Tocca per dettaglio</span>
              </div>
            </button>
            {e.immagine_url && (
              <img src={e.immagine_url} className="drag-thumb" alt="" onClick={() => setPopup(e)} style={{ cursor: 'pointer' }} />
            )}
          </div>
        ))}
      </div>

      {/* Totale durata */}
      {totaleLabel && (
        <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--carta)', borderRadius: 'var(--r)', border: '1px solid var(--linea)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏱</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Durata totale stimata: {totaleLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Somma di durata + recupero per ogni esercizio con tempi impostati
              {lista.some(e => !e.durata_minuti && !e.recupero_minuti) && ' · alcuni esercizi non hanno durata'}
            </div>
          </div>
        </div>
      )}

      {/* Salva ordine */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-ghost" type="button" onClick={salva} disabled={busy}>
          {busy ? 'Salvataggio...' : '💾 Salva ordine'}
        </button>
        {done && <span style={{ color: 'var(--campo)', fontSize: 13, fontWeight: 600 }}>✓ Ordine salvato</span>}
      </div>
    </div>
  )
}
