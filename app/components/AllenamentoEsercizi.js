'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Vista libreria: selezione esercizi per l'allenamento ────────────────────
function LibreriaView({ libreriaMia, libreriaPubblica, sel, onToggle }) {
  const [fonte, setFonte] = useState('mia')
  const [soloPref, setSoloPref] = useState(false)
  const [preferiti, setPreferiti] = useState(new Set())

  // Carica preferiti dal DB al mount
  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      const { data } = await supabase.from('esercizi_preferiti').select('esercizio_id')
      if (data) setPreferiti(new Set(data.map((r) => r.esercizio_id)))
    }
    carica()
  }, [])

  async function togglePreferito(e, esercizioId) {
    e.stopPropagation() // non selezionare l'esercizio
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isPreferito = preferiti.has(esercizioId)
    if (isPreferito) {
      await supabase.from('esercizi_preferiti')
        .delete().eq('esercizio_id', esercizioId).eq('allenatore_id', user.id)
      setPreferiti((s) => { const n = new Set(s); n.delete(esercizioId); return n })
    } else {
      await supabase.from('esercizi_preferiti')
        .insert({ esercizio_id: esercizioId, allenatore_id: user.id })
      setPreferiti((s) => new Set(s).add(esercizioId))
    }
  }

  const listaPubblica = soloPref
    ? libreriaPubblica.filter((e) => preferiti.has(e.id))
    : libreriaPubblica

  const lista = fonte === 'mia' ? libreriaMia : listaPubblica
  const gruppi = {}
  for (const e of lista) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()

  return (
    <>
      <div className="sub-nav">
        <button type="button" className={`sub-nav-link ${fonte === 'mia' ? 'active' : ''}`}
          onClick={() => { setFonte('mia'); setSoloPref(false) }}>
          La mia libreria ({libreriaMia.length})
        </button>
        <button type="button" className={`sub-nav-link ${fonte === 'pubblica' ? 'active' : ''}`}
          onClick={() => setFonte('pubblica')}>
          Libreria pubblica ({libreriaPubblica.length})
        </button>
      </div>

      {/* Filtro preferiti — solo nella tab pubblica */}
      {fonte === 'pubblica' && (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 4px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setSoloPref((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: soloPref ? '#fff8e6' : 'var(--carta)',
              border: soloPref ? '1.5px solid var(--giallo, #e8a72c)' : '1.5px solid var(--linea)',
              borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
              fontSize: 13, fontWeight: soloPref ? 700 : 400,
              color: soloPref ? 'var(--giallo, #e8a72c)' : 'var(--ink-soft)',
            }}
          >
            <span>★</span>
            {soloPref ? `Solo preferiti (${preferiti.size})` : `Preferiti (${preferiti.size})`}
          </button>
          {soloPref && preferiti.size === 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Clicca ★ su un esercizio per aggiungerlo ai preferiti
            </span>
          )}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="empty">
          {fonte === 'mia'
            ? <a href="/esercizi" className="link-inline">Vai alla libreria esercizi per crearne</a>
            : soloPref
              ? 'Nessun esercizio preferito. Clicca ★ su un esercizio per salvarlo.'
              : 'Nessun esercizio pubblico disponibile.'}
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
                  {/* Stella preferito — solo nella libreria pubblica */}
                  {fonte === 'pubblica' && (
                    <button
                      type="button"
                      onClick={(ev) => togglePreferito(ev, e.id)}
                      title={preferiti.has(e.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 18, lineHeight: 1,
                        color: preferiti.has(e.id) ? 'var(--giallo, #e8a72c)' : '#ccc',
                        filter: preferiti.has(e.id) ? 'none' : 'opacity(0.5)',
                        padding: 2,
                      }}
                    >
                      {preferiti.has(e.id) ? '★' : '☆'}
                    </button>
                  )}
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
