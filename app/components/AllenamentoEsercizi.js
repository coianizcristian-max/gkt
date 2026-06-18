'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Vista libreria: selezione esercizi per l'allenamento ────────────────────
function LibreriaView({ libreriaMia, libreriaPubblica, sel, onToggle }) {
  const [fonte, setFonte] = useState('mia')
  const lista = fonte === 'mia' ? libreriaMia : libreriaPubblica
  const gruppi = {}
  for (const e of lista) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()

  return (
    <>
      <div className="sub-nav">
        <button type="button" className={`sub-nav-link ${fonte === 'mia' ? 'active' : ''}`} onClick={() => setFonte('mia')}>
          La mia libreria ({libreriaMia.length})
        </button>
        <button type="button" className={`sub-nav-link ${fonte === 'pubblica' ? 'active' : ''}`} onClick={() => setFonte('pubblica')}>
          Libreria pubblica ({libreriaPubblica.length})
        </button>
      </div>
      {lista.length === 0 ? (
        <div className="empty">
          {fonte === 'mia'
            ? <></>
            : 'Nessun esercizio pubblico disponibile.'}
          {fonte === 'mia' && <>Nessun esercizio in libreria. Creane in <a href="/esercizi" className="link-inline">Esercizi</a>.</>}
        </div>
      ) : (
        chiavi.map((k) => (
          <div className="elenco-blocco" key={k}>
            <h3>{k}</h3>
            <div className="es-grid">
              {gruppi[k].map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`es-tile ${sel.has(e.id) ? 'selezionato' : ''}`}
                  onClick={() => onToggle(e.id)}
                >
                  {e.immagine_url && (
                    <div className="es-tile-img">
                      <img src={e.immagine_url} alt="" />
                    </div>
                  )}
                  <div className="es-tile-body">
                    <div className="es-tile-titolo">{e.titolo}</div>
                    {e.autore_nome && <div className="es-tile-autore">{e.autore_nome}</div>}
                    {e.descrizione_breve && <div className="es-tile-desc">{e.descrizione_breve}</div>}
                  </div>
                  {sel.has(e.id) && <div className="es-tile-check">✓</div>}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}

// ─── Vista ordine: drag & drop degli esercizi selezionati ───────────────────
function OrdineView({ ordine, tuttiEsercizi, onOrdineChange }) {
  const dragIdx = useRef(null)
  const overIdx = useRef(null)

  const byId = {}
  for (const e of tuttiEsercizi) byId[e.id] = e

  function onDragStart(i) { dragIdx.current = i }
  function onDragOver(e, i) { e.preventDefault(); overIdx.current = i }
  function onDrop() {
    if (dragIdx.current === null || overIdx.current === null) return
    const newOrd = [...ordine]
    const [moved] = newOrd.splice(dragIdx.current, 1)
    newOrd.splice(overIdx.current, 0, moved)
    dragIdx.current = null; overIdx.current = null
    onOrdineChange(newOrd)
  }

  if (ordine.length === 0) {
    return <div className="empty">Nessun esercizio selezionato. Vai in &ldquo;Libreria&rdquo; per aggiungerne.</div>
  }

  return (
    <div className="drag-list">
      {ordine.map((eid, i) => {
        const e = byId[eid]
        if (!e) return null
        return (
          <div
            key={eid}
            className="drag-item"
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(ev) => onDragOver(ev, i)}
            onDrop={onDrop}
          >
            <span className="drag-handle">⠿</span>
            <div className="drag-info">
              <b>{e.titolo}</b>
              {e.tipologia && <span className="stat-cat">{e.tipologia}</span>}
            </div>
            {e.immagine_url && <img src={e.immagine_url} className="drag-thumb" alt="" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principale ───────────────────────────────────────────────────
export default function AllenamentoEsercizi({ allenamentoId, libreriaMia = [], libreriaPubblica = [], selezionatiIniziali }) {
  const router = useRouter()
  const [tab, setTab] = useState('libreria') // 'libreria' | 'ordine'
  const [sel, setSel] = useState(new Set(selezionatiIniziali))
  const [ordine, setOrdine] = useState(selezionatiIniziali) // array ordinato di id
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const tuttiEsercizi = [...libreriaMia, ...libreriaPubblica]

  const toggle = useCallback((id) => {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) {
        n.delete(id)
        setOrdine((o) => o.filter((x) => x !== id))
      } else {
        n.add(id)
        setOrdine((o) => [...o, id])
      }
      return n
    })
    setDone(false)
  }, [])

  async function salva() {
    setBusy(true); setError(''); setDone(false)
    const supabase = createClient()
    try {
      await supabase.from('allenamento_esercizi').delete().eq('allenamento_id', allenamentoId)
      const rows = ordine.filter((id) => sel.has(id)).map((eid, i) => ({
        allenamento_id: allenamentoId, esercizio_id: eid, ordine: i,
      }))
      if (rows.length) {
        const { error: iErr } = await supabase.from('allenamento_esercizi').insert(rows)
        if (iErr) throw iErr
      }
      setDone(true); router.refresh()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="lista-editor">
      {error && <div className="err">{error}</div>}
      <div className="sub-nav">
        <button type="button" className={`sub-nav-link ${tab === 'libreria' ? 'active' : ''}`} onClick={() => setTab('libreria')}>
          Libreria ({sel.size} selezionati)
        </button>
        <button type="button" className={`sub-nav-link ${tab === 'ordine' ? 'active' : ''}`} onClick={() => setTab('ordine')}>
          Ordine e anteprima
        </button>
      </div>

      {tab === 'libreria' && (
        <LibreriaView
          libreriaMia={libreriaMia}
          libreriaPubblica={libreriaPubblica}
          sel={sel}
          onToggle={toggle}
        />
      )}
      {tab === 'ordine' && (
        <OrdineView
          ordine={ordine.filter((id) => sel.has(id))}
          tuttiEsercizi={tuttiEsercizi}
          onOrdineChange={(newOrd) => { setOrdine(newOrd); setDone(false) }}
        />
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <span className="sub-intro" style={{ marginRight: 'auto' }}>{sel.size} esercizi</span>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva esercizi'}
        </button>
      </div>
    </div>
  )
}
