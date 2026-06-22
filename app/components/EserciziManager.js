'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Popup dettaglio esercizio
function EsercizioPopup({ esercizio, onClose }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ margin: '0 0 6px' }}>{esercizio.titolo}</h2>
        {esercizio.tipologia && <span className="stat-cat" style={{ marginBottom: 12, display: 'inline-block' }}>{esercizio.tipologia}</span>}
        {esercizio.immagine_url && (
          <img src={esercizio.immagine_url} alt="" style={{ width: '100%', borderRadius: 'var(--r)', marginBottom: 14, maxHeight: 280, objectFit: 'cover' }} />
        )}
        {esercizio.descrizione_breve && <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 10px' }}>{esercizio.descrizione_breve}</p>}
        {esercizio.descrizione && <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{esercizio.descrizione}</p>}
        {esercizio.note && <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>Note: {esercizio.note}</p>}
        {esercizio.video_url && (
          <a href={esercizio.video_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 14px', background: '#ff0000', color: '#fff', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            ▶ Guarda il video
          </a>
        )}
      </div>
    </div>
  )
}

// Tile singolo esercizio nella libreria
function EsercizioTile({ esercizio, onDetail, onEdit }) {
  return (
    <div className="es-lib-tile">
      <button className="es-lib-img-wrap" type="button" onClick={() => onDetail(esercizio)} title="Vedi dettaglio">
        {esercizio.immagine_url
          ? <img src={esercizio.immagine_url} alt="" />
          : <div className="es-lib-no-img">📋</div>}
      </button>
      <div className="es-lib-info">
        <button className="es-lib-titolo" type="button" onClick={() => onDetail(esercizio)}>{esercizio.titolo}</button>
        {esercizio.pubblico && <span style={{ fontSize: 10, color: 'var(--azzurro)', fontWeight: 600, marginLeft: 4 }}>PUB</span>}
      </div>
      <button className="btn-mini es-lib-edit" type="button" onClick={() => onDetail(esercizio)}>Dettaglio</button>
      {onEdit && <button className="btn-mini es-lib-edit" type="button" onClick={() => onEdit(esercizio)}>Modifica</button>}
    </div>
  )
}

export default function EserciziManager({ esercizi, eserciziPubblici = [], tipologie, allenatoreId }) {
  const router = useRouter()
  const [editing, setEditing] = useState(null)
  const [popup, setPopup] = useState(null)
  const [tabAttivo, setTabAttivo] = useState(null)
  const [sezione, setSezione] = useState('miei') // 'miei' | 'pubblici'

  // Ragruppa per tipologia — sezione corrente
  const lista = sezione === 'miei' ? esercizi : eserciziPubblici
  const gruppi = {}
  for (const e of lista) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()
  const tabCorrente = tabAttivo ?? chiavi[0] ?? null

  if (editing) {
    return (
      <div className="lista-editor">
        <button className="btn-ghost" onClick={() => setEditing(null)} type="button" style={{ marginBottom: 12 }}>← Torna alla libreria</button>
        <EsercizioForm
          esercizio={editing === 'new' ? null : editing}
          tipologie={tipologie}
          allenatoreId={allenatoreId}
          onSaved={() => { setEditing(null); router.refresh() }}
          onCancel={() => setEditing(null)}
        />
      </div>
    )
  }

  return (
    <div className="lista-editor">
      {popup && <EsercizioPopup esercizio={popup} onClose={() => setPopup(null)} />}

      {/* Selettore sezione */}
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button type="button"
          className={`sub-nav-link ${sezione === 'miei' ? 'active' : ''}`}
          onClick={() => { setSezione('miei'); setTabAttivo(null) }}>
          I miei esercizi ({esercizi.length})
        </button>
        <button type="button"
          className={`sub-nav-link ${sezione === 'pubblici' ? 'active' : ''}`}
          onClick={() => { setSezione('pubblici'); setTabAttivo(null) }}>
          ★ Pubblici preferiti ({eserciziPubblici.length})
        </button>
      </div>

      {/* Azioni — solo nella sezione miei */}
      {sezione === 'miei' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn-azione" onClick={() => setEditing('new')} type="button">+ Nuovo esercizio</button>
        </div>
      )}

      {lista.length === 0 && (
        <div className="empty">
          {sezione === 'miei'
            ? 'Nessun esercizio in libreria. Creane uno con il pulsante sopra.'
            : 'Nessun esercizio pubblico preferito. Salva gli esercizi con ★ dalla libreria pubblica in un allenamento per trovarli qui.'}
        </div>
      )}

      {chiavi.length > 0 && (
        <>
          {/* Tab tipologie */}
          <div className="sub-nav" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {chiavi.map((k) => (
              <button key={k} type="button"
                className={`sub-nav-link ${tabCorrente === k ? 'active' : ''}`}
                onClick={() => setTabAttivo(k)}>
                {k} <span style={{ fontSize: 11, opacity: 0.7 }}>({gruppi[k].length})</span>
              </button>
            ))}
          </div>

          {/* Griglia tile */}
          {tabCorrente && (
            <div className="es-lib-grid">
              {gruppi[tabCorrente].map((e) => (
                <EsercizioTile
                  key={e.id}
                  esercizio={e}
                  onDetail={setPopup}
                  onEdit={sezione === 'miei' ? setEditing : null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EsercizioForm({ esercizio, tipologie, allenatoreId, onSaved, onCancel }) {
  const isEdit = !!esercizio
  const [f, setF] = useState({
    titolo: esercizio?.titolo ?? '',
    tipologia: esercizio?.tipologia ?? (tipologie[0] ?? ''),
    descrizione_breve: esercizio?.descrizione_breve ?? '',
    descrizione: esercizio?.descrizione ?? '',
    note: esercizio?.note ?? '',
    video_url: esercizio?.video_url ?? '',
    pubblico: esercizio?.pubblico ?? false,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(esercizio?.immagine_url ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }
  function onTip(e) {
    const v = e.target.value
    if (v === '__nuova__') {
      const nome = prompt('Nome della nuova tipologia:')
      if (!nome) return
      const supabase = createClient()
      supabase.from('elenco_voci').insert({
        elenco: 'tipologie_esercizio', valore: nome.trim(), stato: 'proposta', proposto_da: allenatoreId, ordine: 999,
      }).then(() => setF((s) => ({ ...s, tipologia: nome.trim() })))
    } else {
      setF((s) => ({ ...s, tipologia: v }))
    }
    setDone(false)
  }

  async function salva() {
    if (!f.titolo.trim()) { setError('Inserisci il titolo.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      let immagine_url = esercizio?.immagine_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `esercizi/${allenatoreId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        allenatore_id: allenatoreId, titolo: f.titolo.trim(), tipologia: f.tipologia || null,
        descrizione_breve: f.descrizione_breve || null, descrizione: f.descrizione || null,
        note: f.note || null, video_url: f.video_url || null, immagine_url, pubblico: !!f.pubblico,
      }
      if (isEdit) {
        const { error } = await supabase.from('esercizi').update(payload).eq('id', esercizio.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('esercizi').insert(payload)
        if (error) throw error
      }
      setDone(true); setBusy(false); if (onSaved) onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  async function elimina() {
    if (!confirm('Archiviare questo esercizio? Non comparirà più nella libreria, ma resterà collegato agli allenamenti e obiettivi passati che lo usano.')) return
    const supabase = createClient()
    const { error } = await supabase.from('esercizi').update({ archiviato: true }).eq('id', esercizio.id)
    if (error) alert('Errore: ' + error.message); else if (onSaved) onSaved()
  }

  return (
    <div className="scheda">
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>{isEdit ? 'Modifica esercizio' : 'Nuovo esercizio'}</h2>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field field-full"><label>Titolo *</label><input value={f.titolo} onChange={upd('titolo')} /></div>
        <div className="field"><label>Tipologia</label>
          <select value={f.tipologia} onChange={onTip}>
            {tipologie.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="__nuova__">+ Proponi nuova...</option>
          </select></div>
        <div className="field"><label>Immagine</label>
          <label className="foto-upload">{preview ? 'Cambia immagine' : 'Carica immagine'}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          {preview && <img src={preview} alt="" style={{ marginTop: 8, maxWidth: 160, borderRadius: 'var(--r-sm)' }} />}
        </div>
        <div className="field field-full"><label>Descrizione breve</label><input value={f.descrizione_breve} onChange={upd('descrizione_breve')} /></div>
        <div className="field field-full"><label>Descrizione dettagliata</label><textarea rows="4" value={f.descrizione} onChange={upd('descrizione')} /></div>
        <div className="field field-full"><label>Note</label><textarea rows="2" value={f.note} onChange={upd('note')} /></div>
        <div className="field field-full"><label>Link video (YouTube o altro)</label>
          <input type="url" value={f.video_url} onChange={upd('video_url')} placeholder="https://www.youtube.com/watch?v=..." />
          {f.video_url && <a href={f.video_url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'var(--azzurro)',marginTop:4,display:'inline-block'}}>▶ Anteprima link</a>}
        </div>
        <div className="field field-full">
          <label className="val-nessuno">
            <input type="checkbox" checked={f.pubblico} onChange={(e) => { setF((s) => ({ ...s, pubblico: e.target.checked })); setDone(false) }} />
            Pubblico (visibile agli altri allenatori)
          </label>
        </div>
      </div>
      <div className="form-actions">
        {onCancel && <button className="btn-ghost" onClick={onCancel} type="button">Annulla</button>}
        {isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">Archivia</button>}
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
