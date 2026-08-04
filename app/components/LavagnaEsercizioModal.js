'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Converte un dataURL (PNG) in Blob per l'upload su Storage
function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',')
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/*
 * mode = 'create' : disegna un nuovo esercizio, poi compila i campi e salva
 * mode = 'view'   : rivede (sola lettura) lo schema di un esercizio esistente
 */
export default function LavagnaEsercizioModal({ mode = 'create', esercizio = null, allenatoreId, tipologie = [], onSaved, onClose }) {
  const iframeRef = useRef(null)
  const [fase, setFase] = useState('disegno') // 'disegno' | 'dettagli' | 'salvataggio'
  const [dati, setDati] = useState(null)       // { name, schema, immagine_url }
  const [error, setError] = useState('')
  const [f, setF] = useState({
    tipologia: tipologie[0] ?? '',
    durata_minuti: '',
    recupero_minuti: '',
    descrizione_breve: '',
    descrizione: '',
    pubblico: false,
  })
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const src = mode === 'view' ? '/lavagna.html?mode=view' : '/lavagna.html?embed=1'

  useEffect(() => {
    async function onMsg(ev) {
      const iframe = iframeRef.current
      if (!iframe || ev.source !== iframe.contentWindow) return
      const d = ev.data || {}
      if (d.type === 'gk-ready') {
        // in modalità view (o modifica) carica lo schema esistente
        if (esercizio?.schema_json) {
          iframe.contentWindow.postMessage(
            { type: 'gk-load', schema: esercizio.schema_json, name: esercizio.titolo || '' },
            '*'
          )
        }
      }
      if (d.type === 'gk-save' && mode === 'create') {
        setError('')
        setFase('salvataggio')
        try {
          const supabase = createClient()
          let immagine_url = null
          if (d.thumbnail) {
            const blob = dataUrlToBlob(d.thumbnail)
            const path = `esercizi/${allenatoreId}/lavagna-${Date.now()}.png`
            const { error: upErr } = await supabase.storage.from('sito').upload(path, blob, {
              upsert: true, contentType: 'image/png',
            })
            if (upErr) throw upErr
            immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
          }
          setDati({ name: d.name, schema: d.schema, immagine_url })
          setFase('dettagli')
        } catch (err) {
          setError('Errore nel salvataggio dello schema: ' + err.message)
          setFase('disegno')
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [mode, esercizio, allenatoreId])

  async function salvaEsercizio() {
    if (!dati) return
    setError('')
    setFase('salvataggio')
    try {
      const supabase = createClient()
      const payload = {
        allenatore_id: allenatoreId,
        titolo: dati.name.trim(),
        schema_json: dati.schema,
        immagine_url: dati.immagine_url,
        tipologia: f.tipologia || null,
        durata_minuti: f.durata_minuti !== '' ? parseFloat(f.durata_minuti) : null,
        recupero_minuti: f.recupero_minuti !== '' ? parseFloat(f.recupero_minuti) : null,
        descrizione_breve: f.descrizione_breve || null,
        descrizione: f.descrizione || null,
        pubblico: !!f.pubblico,
      }
      const { data, error: insErr } = await supabase
        .from('esercizi')
        .insert(payload)
        .select('id, titolo, tipologia, descrizione_breve, immagine_url, pubblico, allenatore_id, durata_minuti, recupero_minuti, schema_json')
        .single()
      if (insErr) throw insErr
      if (onSaved) onSaved(data)
    } catch (err) {
      setError('Errore nel salvataggio: ' + err.message)
      setFase('dettagli')
    }
  }

  const wide = fase === 'disegno' || mode === 'view'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(6,16,24,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2vh 2vw' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: wide ? '96vw' : 'min(680px,96vw)', maxWidth: wide ? 1240 : 680, height: wide ? '94vh' : 'auto', maxHeight: '94vh', background: '#fff', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #e4ebef', flex: 'none' }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>
            {mode === 'view'
              ? `Schema — ${esercizio?.titolo || 'Esercizio'}`
              : fase === 'dettagli' ? 'Completa l’esercizio' : 'Crea esercizio con la lavagna'}
          </h3>
          <button onClick={onClose} type="button" aria-label="Chiudi" style={{ border: 0, background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>

        {/* FASE DISEGNO / VISTA — la lavagna in un iframe */}
        {(fase === 'disegno' || mode === 'view') && (
          <div style={{ flex: 1, minHeight: 0, background: '#0d1620' }}>
            <iframe
              ref={iframeRef}
              src={src}
              title="Lavagna esercizi"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          </div>
        )}

        {/* FASE DETTAGLI — compila i restanti campi dell’esercizio */}
        {fase !== 'disegno' && mode === 'create' && (
          <div style={{ padding: '18px', overflowY: 'auto' }}>
            {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
              {dati?.immagine_url && (
                <img
                  src={dati.immagine_url}
                  alt=""
                  style={{ width: 160, borderRadius: 10, border: '1px solid var(--line, #e4ebef)', flex: 'none' }}
                />
              )}
              <div style={{ minWidth: 200, flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft, #7f8f9b)', fontWeight: 600 }}>Titolo</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{dati?.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft, #7f8f9b)' }}>
                  Lo schema disegnato è salvato con l’esercizio. Aggiungi le informazioni che ti servono e conferma.
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Tipologia</label>
                <select value={f.tipologia} onChange={upd('tipologia')}>
                  <option value="">—</option>
                  {tipologie.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Durata (min)</label>
                <input type="number" min="0" step="0.5" value={f.durata_minuti} onChange={upd('durata_minuti')} placeholder="es. 15" />
              </div>
              <div className="field">
                <label>Recupero (min)</label>
                <input type="number" min="0" step="0.5" value={f.recupero_minuti} onChange={upd('recupero_minuti')} placeholder="es. 3" />
              </div>
              <div className="field field-full">
                <label>Descrizione breve</label>
                <input value={f.descrizione_breve} onChange={upd('descrizione_breve')} placeholder="Una riga di sintesi" />
              </div>
              <div className="field field-full">
                <label>Descrizione completa</label>
                <textarea rows={3} value={f.descrizione} onChange={upd('descrizione')} placeholder="Descrizione dettagliata dell'esercizio..." />
              </div>
              <div className="field field-full">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.pubblico} onChange={(e) => setF((s) => ({ ...s, pubblico: e.target.checked }))} />
                  Rendi pubblico (visibile ad altri allenatori nella libreria pubblica)
                </label>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button className="btn-ghost" type="button" onClick={() => setFase('disegno')} disabled={fase === 'salvataggio'}>
                ← Torna al disegno
              </button>
              <button className="btn" type="button" onClick={salvaEsercizio} disabled={fase === 'salvataggio'}>
                {fase === 'salvataggio' ? 'Salvataggio...' : '💾 Salva in libreria'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
