'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function EserciziSedutaEditor({ esercizi: iniziali, allenamentoId }) {
  const router = useRouter()
  const [lista, setLista] = useState(iniziali ?? [])
  const [dragIdx, setDragIdx] = useState(null)
  const [openIdx, setOpenIdx] = useState(null)  // indice riga espansa
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

  // Riordino con le frecce: funziona ovunque, anche su tablet/telefono dove
  // il drag & drop nativo HTML5 non parte sul tocco.
  function moveItem(from, to) {
    if (to < 0 || to >= lista.length) return
    const nuova = [...lista]
    const [item] = nuova.splice(from, 1)
    nuova.splice(to, 0, item)
    setLista(nuova)
    setDone(false)
  }

  // Rimuove UN esercizio da QUESTA seduta. Delete sempre con filtri espliciti
  // (allenamento_id + esercizio_id): tocca solo la riga di collegamento di questa
  // seduta, non l'esercizio in libreria e nessun'altra seduta.
  async function rimuovi(e) {
    if (!confirm(`Rimuovere "${e.titolo}" da questa seduta? L'esercizio resta nella tua libreria.`)) return
    setBusy(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('allenamento_esercizi')
        .delete()
        .eq('allenamento_id', allenamentoId)
        .eq('esercizio_id', e.id)
      if (error) throw error
      setLista(prev => prev.filter(x => x.id !== e.id))
      setOpenIdx(null)
      router.refresh()
    } catch (err) { alert('Errore: ' + err.message) }
    setBusy(false)
  }

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


      {/* Lista drag & drop */}
      <div className="drag-list">
        {lista.map((e, i) => (
          <div key={e.id}>
          <div
            className={`drag-item${dragIdx === i ? ' dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(ev) => onDragOver(ev, i)}
            onDrop={onDrop}
            onDragEnd={() => setDragIdx(null)}
          >
            <span className="drag-handle" title="Trascina per riordinare">⠿</span>
            <div className="reorder-arrows">
              <button type="button" className="reorder-btn" aria-label="Sposta su"
                disabled={i === 0} onClick={() => moveItem(i, i - 1)}>▲</button>
              <button type="button" className="reorder-btn" aria-label="Sposta giù"
                disabled={i === lista.length - 1} onClick={() => moveItem(i, i + 1)}>▼</button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', width: 22, flexShrink: 0 }}>{i + 1}.</span>
            <div
              className="drag-info"
              onClick={() => setOpenIdx(prev => prev === i ? null : i)}
              style={{ cursor: 'pointer', flex: 1 }}
            >
              <b>{e.titolo}</b>
              {e.tipologia && <span className="stat-cat" style={{ marginLeft: 6 }}>{e.tipologia}</span>}
              {(e.durata_minuti || e.recupero_minuti) && (
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>
                  {e.durata_minuti ? `⏱ ${e.durata_minuti}min` : ''}
                  {e.durata_minuti && e.recupero_minuti ? ' · ' : ''}
                  {e.recupero_minuti ? `↩ ${e.recupero_minuti}min rec.` : ''}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--azzurro)', marginLeft: 8 }}>
                {openIdx === i ? '▾ chiudi' : '▸ dettaglio'}
              </span>
            </div>
            {e.immagine_url && (
              <Image src={e.immagine_url} className="drag-thumb" alt="" width={44} height={44} onClick={() => setOpenIdx(prev => prev === i ? null : i)} style={{ cursor: 'pointer' }} />
            )}
            <button type="button" className="reorder-btn" aria-label="Rimuovi dalla seduta" title="Rimuovi dalla seduta"
              onClick={() => rimuovi(e)} disabled={busy}
              style={{ color: 'var(--rosso)', borderColor: 'rgba(192,57,43,0.3)', width: 30, height: 44, fontSize: 14, flexShrink: 0 }}>
              ✕
            </button>
          </div>
          {/* Dettaglio inline espanso */}
          {openIdx === i && (
            <div style={{
              margin: '0 0 8px', padding: '14px 16px',
              background: 'var(--carta)', borderRadius: '0 0 var(--r-sm) var(--r-sm)',
              border: '1px solid var(--linea)', borderTop: 'none',
            }}>
              {(e.video_url || e.immagine_url) && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  {e.video_url && (
                    <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 6, padding: '12px 16px', borderRadius: 8, textDecoration: 'none',
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        color: '#fff', minWidth: 90, flexShrink: 0,
                      }}>
                      <span style={{ fontSize: 28 }}>▶</span>
                      <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>Guarda<br/>video</span>
                    </a>
                  )}
                  {e.immagine_url && (
                    <img src={e.immagine_url} alt="" style={{ flex: 1, minWidth: 0, maxHeight: 160, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                </div>
              )}
              {e.descrizione_breve && <p style={{ margin: '0 0 6px', fontStyle: 'italic', fontSize: 13 }}>{e.descrizione_breve}</p>}
              {e.descrizione && <p style={{ margin: '0 0 6px', fontSize: 13, whiteSpace: 'pre-wrap' }}>{e.descrizione}</p>}
              {(e.durata_minuti || e.recupero_minuti) && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 12 }}>
                  {e.durata_minuti && <span>⏱ Durata: <b>{e.durata_minuti} min</b></span>}
                  {e.recupero_minuti && <span>↩ Recupero: <b>{e.recupero_minuti} min</b></span>}
                </div>
              )}
            </div>
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
