'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import NuovoEsercizioModal from '@/app/components/NuovoEsercizioModal'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Popup anteprima esercizio ────────────────────────────────────────────────
function EsercizioPreview({ esercizio, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const e = esercizio
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,43,0.55)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', pointerEvents: 'all', boxShadow: '0 8px 40px rgba(20,32,43,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--linea)', position: 'sticky', top: 0, background: '#fff', borderRadius: '16px 16px 0 0' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{e.titolo}</span>
            <button onClick={onClose} type="button" style={{ background: 'var(--carta)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ padding: '18px 20px' }}>
            {e.immagine_url && <img src={e.immagine_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 14, objectFit: 'cover', maxHeight: 240 }} />}
            {e.tipologia && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--azzurro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{e.tipologia}</p>}
            {(e.durata_minuti || e.recupero_minuti) && (
              <div style={{ display: 'flex', gap: 16, margin: '0 0 12px', fontSize: 14 }}>
                {e.durata_minuti && <span>⏱ Durata: <b>{e.durata_minuti} min</b></span>}
                {e.recupero_minuti && <span>↩ Recupero: <b>{e.recupero_minuti} min</b></span>}
              </div>
            )}
            {e.descrizione_breve && <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{e.descrizione_breve}</p>}
            {e.descrizione && <p style={{ margin: '0 0 8px', color: 'var(--ink-soft)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{e.descrizione}</p>}
            {e.note && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-soft)', borderTop: '1px solid var(--linea)', paddingTop: 8, whiteSpace: 'pre-wrap' }}>📝 {e.note}</p>}
            {e.video_url && (
              <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 16px', background: '#ff0000', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                ▶ Guarda il video
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Vista libreria: selezione esercizi ──────────────────────────────────────
function LibreriaView({ libreriaMia, libreriaPubblica, eserciziResponsabile = [], sel, onToggle, attributiDisponibili }) {
  const [fonte, setFonte] = useState('mia')
  const [soloPref, setSoloPref] = useState(false)
  const [tipologiaAttiva, setTipologiaAttiva] = useState(null)
  const [showNuovoModal, setShowNuovoModal] = useState(false)
  const [preferiti, setPreferiti] = useState(new Set())
  const [preview, setPreview] = useState(null)
  const [cerca, setCerca] = useState('')
  const [filtroAttr, setFiltroAttr] = useState(new Set())
  const [modoFiltro, setModoFiltro] = useState('almeno') // 'almeno' | 'tutti'

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      const { data } = await supabase.from('esercizi_preferiti').select('esercizio_id')
      if (data) setPreferiti(new Set(data.map((r) => r.esercizio_id)))
    }
    carica()
  }, [])

  async function togglePreferito(ev, esercizioId) {
    ev.stopPropagation()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isPreferito = preferiti.has(esercizioId)
    if (isPreferito) {
      await supabase.from('esercizi_preferiti').delete().eq('esercizio_id', esercizioId).eq('allenatore_id', user.id)
      setPreferiti((s) => { const n = new Set(s); n.delete(esercizioId); return n })
    } else {
      await supabase.from('esercizi_preferiti').insert({ esercizio_id: esercizioId, allenatore_id: user.id })
      setPreferiti((s) => new Set(s).add(esercizioId))
    }
  }

  function toggleAttr(id) {
    setFiltroAttr(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
    setTipologiaAttiva(null)
  }

  const listaPubblica = soloPref ? libreriaPubblica.filter((e) => preferiti.has(e.id)) : libreriaPubblica
  const listaBase = fonte === 'mia' ? libreriaMia : fonte === 'responsabile' ? eserciziResponsabile : listaPubblica

  // Filtra per attributi
  const listaDopoAttr = filtroAttr.size === 0 ? listaBase : listaBase.filter(e => {
    const eAttr = new Set((e.esercizio_attributi ?? []).map(a => a.attributo_id))
    if (modoFiltro === 'tutti') return [...filtroAttr].every(id => eAttr.has(id))
    return [...filtroAttr].some(id => eAttr.has(id))
  })

  // Filtra per testo
  const lista = cerca.trim()
    ? listaDopoAttr.filter(e => {
        const q = cerca.toLowerCase()
        return (e.titolo || '').toLowerCase().includes(q) ||
               (e.descrizione_breve || '').toLowerCase().includes(q)
      })
    : listaDopoAttr

  const gruppi = {}
  for (const e of lista) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()

  return (
    <>
      {preview && <EsercizioPreview esercizio={preview} onClose={() => setPreview(null)} />}

      {/* Tab fonte */}
      <div className="sub-nav">
        <button type="button" className={`sub-nav-link ${fonte === 'mia' ? 'active' : ''}`}
          onClick={() => { setFonte('mia'); setSoloPref(false); setTipologiaAttiva(null); setCerca(''); setFiltroAttr(new Set()) }}>
          La mia libreria ({libreriaMia.length})
        </button>
        <button type="button" className={`sub-nav-link ${fonte === 'pubblica' ? 'active' : ''}`}
          onClick={() => { setFonte('pubblica'); setTipologiaAttiva(null); setCerca(''); setFiltroAttr(new Set()) }}>
          Libreria pubblica ({libreriaPubblica.length})
        </button>
        {eserciziResponsabile.length > 0 && (
          <button type="button" className={`sub-nav-link ${fonte === 'responsabile' ? 'active' : ''}`}
            onClick={() => { setFonte('responsabile'); setTipologiaAttiva(null); setCerca(''); setFiltroAttr(new Set()) }}>
            🔗 Del responsabile ({eserciziResponsabile.length})
          </button>
        )}
      </div>

      {fonte === 'pubblica' && (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 4px', alignItems: 'center' }}>
          <button type="button" onClick={() => setSoloPref((v) => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: soloPref ? '#fff8e6' : 'var(--carta)',
            border: soloPref ? '1.5px solid var(--giallo, #e8a72c)' : '1.5px solid var(--linea)',
            borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: soloPref ? 700 : 400,
            color: soloPref ? 'var(--giallo, #e8a72c)' : 'var(--ink-soft)',
          }}>
            <span>★</span>
            {soloPref ? `Solo preferiti (${preferiti.size})` : `Preferiti (${preferiti.size})`}
          </button>
        </div>
      )}

      {/* Bottone crea nuovo esercizio */}
      {fonte === 'mia' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn" type="button" onClick={() => setShowNuovoModal(true)}>
            ✏️ Crea nuovo esercizio
          </button>
        </div>
      )}

      {/* Ricerca testuale */}
      <div style={{ margin: '8px 0 4px' }}>
        <input
          type="search"
          value={cerca}
          onChange={(e) => { setCerca(e.target.value); setTipologiaAttiva(null) }}
          placeholder="Cerca per titolo o descrizione..."
          style={{ width: '100%', padding: '7px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--linea)', fontSize: 14, background: 'var(--carta)', boxSizing: 'border-box' }}
        />
      </div>

      {/* Filtro attributi */}
      {attributiDisponibili.length > 0 && (
        <div style={{ margin: '8px 0 4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginRight: 2 }}>Attributi:</span>
            {attributiDisponibili.map((a) => (
              <button key={a.id} type="button" onClick={() => toggleAttr(a.id)} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: filtroAttr.has(a.id) ? '2px solid var(--campo)' : '1.5px solid var(--linea)',
                background: filtroAttr.has(a.id) ? 'rgba(46,158,91,0.12)' : 'var(--carta)',
                color: filtroAttr.has(a.id) ? 'var(--campo)' : 'var(--ink-soft)',
                fontWeight: filtroAttr.has(a.id) ? 700 : 400,
              }}>
                {a.nome}
              </button>
            ))}
            {filtroAttr.size > 1 && (
              <button type="button" onClick={() => setModoFiltro(v => v === 'almeno' ? 'tutti' : 'almeno')} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: '1.5px solid var(--linea)', background: 'var(--carta)', color: 'var(--ink-soft)',
              }}>
                {modoFiltro === 'almeno' ? 'almeno uno ▾' : 'tutti ▾'}
              </button>
            )}
            {filtroAttr.size > 0 && (
              <button type="button" onClick={() => { setFiltroAttr(new Set()); setTipologiaAttiva(null) }} style={{
                padding: '3px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: 'none', background: 'none', color: 'var(--ink-soft)', textDecoration: 'underline',
              }}>
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="empty">
          {cerca.trim() || filtroAttr.size > 0
            ? 'Nessun esercizio corrisponde ai filtri.'
            : fonte === 'mia'
              ? <a href="/esercizi" className="link-inline">Vai alla libreria esercizi per crearne</a>
              : soloPref ? 'Nessun preferito. Clicca ★ per salvare.' : 'Nessun esercizio pubblico disponibile.'}
        </div>
      ) : (
        <>
          {/* Tab tipologie */}
          <div className="sub-nav" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {chiavi.map((k) => (
              <button
                key={k}
                type="button"
                className={`sub-nav-link ${(tipologiaAttiva ?? chiavi[0]) === k ? 'active' : ''}`}
                onClick={() => setTipologiaAttiva(k)}
                style={{ fontSize: 12 }}
              >
                {k} ({gruppi[k].length})
              </button>
            ))}
          </div>
          {(() => {
            const k = tipologiaAttiva ?? chiavi[0]
            return (
              <div className="elenco-blocco" key={k}>
                <div className="es-grid">
                  {(gruppi[k] ?? []).map((e) => {
                    const selezionato = sel.has(e.id)
                    return (
                      <div key={e.id} className={`es-tile ${selezionato ? 'selezionato' : ''}`} style={{ position: 'relative' }}>
                        <button type="button" style={{ display: 'contents' }} onClick={() => setPreview(e)}>
                          {e.immagine_url && <div className="es-tile-img"><img src={e.immagine_url} alt="" /></div>}
                          <div className="es-tile-body">
                            <div className="es-tile-titolo">{e.titolo}</div>
                            {e.autore_nome && <div className="es-tile-autore">{e.autore_nome}</div>}
                            {e.descrizione_breve && <div className="es-tile-desc">{e.descrizione_breve}</div>}
                            {(e.durata_minuti || e.recupero_minuti) && (
                              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-soft)', display: 'flex', gap: 6 }}>
                                {e.durata_minuti && <span>⏱ {e.durata_minuti}min</span>}
                                {e.recupero_minuti && <span>↩ {e.recupero_minuti}min</span>}
                              </div>
                            )}
                            {e.video_url && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--azzurro)' }}>▶ Video disponibile</div>}
                          </div>
                        </button>
                        {/* Bottone + / ✓ */}
                        <button
                          type="button"
                          onClick={() => onToggle(e.id)}
                          title={selezionato ? 'Rimuovi dalla seduta' : 'Aggiungi alla seduta'}
                          style={{
                            position: 'absolute', bottom: 6, right: 6,
                            width: 28, height: 28, borderRadius: '50%',
                            border: 'none', cursor: 'pointer',
                            background: selezionato ? 'var(--azzurro)' : 'var(--campo)',
                            color: '#fff', fontSize: 18, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                          }}
                        >
                          {selezionato ? '✓' : '+'}
                        </button>
                        {/* Stella preferiti — solo libreria pubblica */}
                        {fonte === 'pubblica' && (
                          <button type="button" onClick={(ev) => togglePreferito(ev, e.id)}
                            title={preferiti.has(e.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                            style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: preferiti.has(e.id) ? 'var(--giallo, #e8a72c)' : '#ccc', padding: 2 }}>
                            {preferiti.has(e.id) ? '★' : '☆'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </>
      )}
      {showNuovoModal && (
        <NuovoEsercizioModal
          onSaved={(esercizio) => {
            libreriaMia.push(esercizio)
            onToggle(esercizio.id)
            setShowNuovoModal(false)
          }}
          onClose={() => setShowNuovoModal(false)}
        />
      )}
    </>
  )
}

// ─── Vista ordine: drag & drop + popup anteprima + stima + PDF ───────────────
function OrdineView({ ordine, tuttiEsercizi, onOrdineChange, allenamentoId }) {
  const dragIdx = useRef(null)
  const overIdx = useRef(null)
  const [preview, setPreview] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(false)

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

  const stimaMinuti = ordine.reduce((tot, eid) => {
    const e = byId[eid]; if (!e) return tot
    return tot + (parseFloat(e.durata_minuti) || 0) + (parseFloat(e.recupero_minuti) || 0)
  }, 0)
  const stimaLabel = stimaMinuti > 0
    ? stimaMinuti >= 60 ? `${Math.floor(stimaMinuti / 60)}h ${Math.round(stimaMinuti % 60)}min` : `${Math.round(stimaMinuti)} min`
    : null

  async function esportaPdf() {
    setPdfBusy(true)
    try {
      const res = await fetch(`/api/esercizi-pdf?allenamento=${allenamentoId}`)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `allenamento-esercizi.pdf`
      a.click(); URL.revokeObjectURL(url)
    } catch (err) { alert('Errore generazione PDF: ' + err.message) }
    setPdfBusy(false)
  }

  if (ordine.length === 0) {
    return <div className="empty">Nessun esercizio selezionato. Vai in &ldquo;Libreria&rdquo; per aggiungerne.</div>
  }

  return (
    <div>
      {preview && <EsercizioPreview esercizio={preview} onClose={() => setPreview(null)} />}
      <div className="drag-list">
        {ordine.map((eid, i) => {
          const e = byId[eid]; if (!e) return null
          return (
            <div key={eid} className="drag-item" draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(ev) => onDragOver(ev, i)}
              onDrop={onDrop}>
              <span className="drag-handle">⠿</span>
              <button type="button" onClick={() => setPreview(e)} style={{ display: 'contents', cursor: 'pointer' }}>
                <div className="drag-info">
                  <b>{e.titolo}</b>
                  {e.tipologia && <span className="stat-cat">{e.tipologia}</span>}
                  {(e.durata_minuti || e.recupero_minuti) && (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 6 }}>
                      {e.durata_minuti ? `⏱ ${e.durata_minuti}min` : ''}
                      {e.durata_minuti && e.recupero_minuti ? ' · ' : ''}
                      {e.recupero_minuti ? `↩ ${e.recupero_minuti}min rec.` : ''}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--azzurro)', marginLeft: 8 }}>Tocca per anteprima</span>
                </div>
              </button>
              {e.immagine_url && <img src={e.immagine_url} className="drag-thumb" alt="" />}
            </div>
          )
        })}
      </div>

      {/* Stima tempo */}
      {stimaLabel && (
        <div style={{ marginTop: 14, padding: '10px 16px', background: 'var(--carta)', borderRadius: 'var(--r)', border: '1px solid var(--linea)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏱</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Stima tempo: {stimaLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Durata + recupero degli esercizi con tempi impostati
              {ordine.some((eid) => byId[eid] && !byId[eid]?.durata_minuti && !byId[eid]?.recupero_minuti) ? ' · alcuni esercizi non hanno durata' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Esporta PDF */}
      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn-ghost" onClick={esportaPdf} disabled={pdfBusy} style={{ fontSize: 14 }}>
          {pdfBusy ? 'Generazione PDF...' : '📄 Esporta seduta in PDF'}
        </button>
      </div>
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function AllenamentoEsercizi({ allenamentoId, libreriaMia = [], libreriaPubblica = [], eserciziResponsabile = [], selezionatiIniziali, selezionatiEsercizi = [], attributiDisponibili = [] }) {
  const router = useRouter()
  const [tab, setTab] = useState('libreria')
  const [sel, setSel] = useState(new Set(selezionatiIniziali))
  const [ordine, setOrdine] = useState(selezionatiIniziali)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const idInLibreria = new Set([...libreriaMia, ...libreriaPubblica, ...eserciziResponsabile].map(e => e.id))
  const esExtra = selezionatiEsercizi.filter(e => !idInLibreria.has(e.id))
  const tuttiEsercizi = [...libreriaMia, ...libreriaPubblica, ...eserciziResponsabile, ...esExtra]

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
      const rows = ordine.filter((id) => sel.has(id)).map((eid, i) => ({ allenamento_id: allenamentoId, esercizio_id: eid, ordine: i }))
      if (rows.length) {
        const { error: iErr } = await supabase.from('allenamento_esercizi').insert(rows)
        if (iErr) throw iErr
      }
      setDone(true); setTab('ordine'); router.refresh()
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
          eserciziResponsabile={eserciziResponsabile}
          sel={sel}
          onToggle={toggle}
          attributiDisponibili={attributiDisponibili}
        />
      )}
      {tab === 'ordine' && (
        <OrdineView
          ordine={ordine.filter((id) => sel.has(id))}
          tuttiEsercizi={tuttiEsercizi}
          onOrdineChange={(newOrd) => { setOrdine(newOrd); setDone(false) }}
          allenamentoId={allenamentoId}
        />
      )}

      {/* Bottone salva fisso in basso a destra */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--carta, #fff)', borderRadius: 40,
        boxShadow: '0 4px 20px rgba(20,32,43,0.18)',
        padding: '8px 16px 8px 14px',
        border: '1px solid var(--linea)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>
          {sel.size} selezionati
        </span>
        <button className="btn" onClick={salva} disabled={busy} type="button" style={{ borderRadius: 30, padding: '8px 20px' }}>
          {busy ? 'Salvataggio...' : done ? '✓ Salvato' : 'Salva esercizi'}
        </button>
      </div>
    </div>
  )
}
