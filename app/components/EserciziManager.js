'use client'

import { useState } from 'react'
import { comprimiImmagine, MISURE, CACHE_LUNGA } from '@/lib/immagini'
import { tipologiaTradotta } from '@/lib/elenchi'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LavagnaEsercizioModal from '@/app/components/LavagnaEsercizioModal'
import { useTranslations, useLocale } from 'next-intl'

// Popup dettaglio esercizio
function EsercizioPopup({ esercizio, onClose, onOpenSchema }) {
  const t = useTranslations('eserciziManager')
  const locale = useLocale()
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} type="button">✕</button>
        <h2 style={{ margin: '0 0 6px' }}>{esercizio.titolo}</h2>
        {((esercizio.tipologie?.length ? esercizio.tipologie : (esercizio.tipologia ? [esercizio.tipologia] : []))).map(tp => (
          <span key={tp} className="stat-cat" style={{ marginBottom: 4, marginRight: 4, display: 'inline-block' }}>{tipologiaTradotta(tp, locale)}</span>
        ))}
        {esercizio.schema_json && onOpenSchema && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <button className="btn" type="button" onClick={() => onOpenSchema(esercizio, 'view')}>{t('visualizzaSchema')}</button>
          </div>
        )}
        {esercizio.immagine_url && (
          <img loading="lazy" decoding="async" src={esercizio.immagine_url} alt="" style={{ width: '100%', borderRadius: 'var(--r)', marginBottom: 14, maxHeight: 280, objectFit: 'cover' }} />
        )}
        {esercizio.descrizione_breve && <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 10px' }}>{esercizio.descrizione_breve}</p>}
        {esercizio.descrizione && <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{esercizio.descrizione}</p>}
        {esercizio.note && <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>{t('note')}: {esercizio.note}</p>}
        {esercizio.video_url && (
          <a href={esercizio.video_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 14px', background: '#ff0000', color: '#fff', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            {t('guardaVideo')}
          </a>
        )}
      </div>
    </div>
  )
}

// Tile singolo esercizio nella libreria
function EsercizioTile({ esercizio, onDetail, onEdit, onRemoveFav }) {
  const t = useTranslations('eserciziManager')
  return (
    <div className="es-lib-tile">
      <button className="es-lib-img-wrap" type="button" onClick={() => onDetail(esercizio)} title={t('vediDettaglio')}>
        {esercizio.immagine_url
          ? <img loading="lazy" decoding="async" src={esercizio.immagine_url} alt="" />
          : <div className="es-lib-no-img">📋</div>}
      </button>
      <div className="es-lib-info">
        <button className="es-lib-titolo" type="button" onClick={() => onDetail(esercizio)}>{esercizio.titolo}</button>
        {esercizio.pubblico && <span style={{ fontSize: 10, color: 'var(--azzurro)', fontWeight: 600, marginLeft: 4 }}>PUB</span>}
      </div>
      <button className="btn-mini es-lib-edit" type="button" onClick={() => onDetail(esercizio)}>{t('dettaglio')}</button>
      {onEdit && <button className="btn-mini es-lib-edit" type="button" onClick={() => onEdit(esercizio)}>{t('modifica')}</button>}
      {onRemoveFav && (
        <button className="btn-mini" type="button" onClick={() => onRemoveFav(esercizio.id)}
          style={{ margin: '0 8px 8px', fontSize: 11, padding: '3px 8px', background: 'var(--giallo, #e8a72c)', color: '#000', fontWeight: 700, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
          {t('rimuoviPreferiti')}
        </button>
      )}
    </div>
  )
}

export default function EserciziManager({ esercizi, eserciziPubblici = [], eserciziResponsabile = [], tipologie, attributiDisponibili = [], allenatoreId }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('eserciziManager')
  const [editing, setEditing] = useState(null)
  const [popup, setPopup] = useState(null)
  const [lavagna, setLavagna] = useState(null) // {mode:'create'|'view', esercizio?}
  const [tabAttivo, setTabAttivo] = useState(null)
  const [sezione, setSezione] = useState('miei') // 'miei' | 'pubblici' | 'scopri' | 'responsabile'
  const [esPublici, setEsPublici] = useState(null) // null=non caricati
  const [prefIds, setPrefIds] = useState(new Set((eserciziPubblici ?? []).map(e => e.id)))
  const [loadingPref, setLoadingPref] = useState(null) // id in corso
  const [filtroAttr, setFiltroAttr] = useState(new Set())
  const [modoFiltro, setModoFiltro] = useState('almeno')
  const [tabScopri, setTabScopri] = useState(null)
  // Lista preferiti locale — si aggiorna subito al click senza aspettare il server
  const [preferitiFull, setPreferitieFull] = useState(eserciziPubblici ?? [])

  // Ragruppa per tipologia — sezione corrente
  const lista = sezione === 'miei' ? esercizi : sezione === 'responsabile' ? eserciziResponsabile : preferitiFull

  async function togglePreferito(esercizioId) {
    setLoadingPref(esercizioId)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    if (prefIds.has(esercizioId)) {
      await supabase.from('esercizi_preferiti').delete()
        .eq('allenatore_id', allenatoreId).eq('esercizio_id', esercizioId)
      setPrefIds(prev => { const s = new Set(prev); s.delete(esercizioId); return s })
      setPreferitieFull(prev => prev.filter(e => e.id !== esercizioId))
    } else {
      await supabase.from('esercizi_preferiti').upsert(
        { allenatore_id: allenatoreId, esercizio_id: esercizioId },
        { onConflict: 'allenatore_id,esercizio_id' }
      )
      setPrefIds(prev => new Set([...prev, esercizioId]))
      // Aggiunge l'esercizio alla lista preferiti prendendo i dati da esPublici
      const esercizio = esPublici?.find(e => e.id === esercizioId)
      if (esercizio) setPreferitieFull(prev => [...prev, esercizio])
    }
    setLoadingPref(null)
  }
  // Filtro attributi
  const listaFiltrata = filtroAttr.size === 0 ? lista : lista.filter(e => {
    const eAttr = new Set((e.esercizio_attributi ?? []).map(a => a.attributo_id))
    if (modoFiltro === 'tutti') return [...filtroAttr].every(id => eAttr.has(id))
    return [...filtroAttr].some(id => eAttr.has(id))
  })

  const gruppi = {}
  for (const e of listaFiltrata) {
    const tips = (e.tipologie?.length ? e.tipologie : (e.tipologia ? [e.tipologia] : [t('senzaTipologia')]))
    for (const t of tips) (gruppi[t] ??= []).push(e)
  }
  const chiavi = Object.keys(gruppi).sort()
  const tabCorrente = tabAttivo ?? chiavi[0] ?? null

  if (editing) {
    return (
      <div className="lista-editor">
        <button className="btn-ghost" onClick={() => setEditing(null)} type="button" style={{ marginBottom: 12 }}>{t('tornaLibreria')}</button>
        <EsercizioForm
          esercizio={editing === 'new' ? null : editing}
          tipologie={tipologie}
          attributiDisponibili={attributiDisponibili}
          allenatoreId={allenatoreId}
          onSaved={() => { setEditing(null); router.refresh() }}
          onCancel={() => setEditing(null)}
          onEditSchema={(es, onResult) => setLavagna({ mode: 'edit', esercizio: es, onResult })}
        />
        {lavagna && (
          <LavagnaEsercizioModal
            mode={lavagna.mode}
            esercizio={lavagna.esercizio || null}
            allenatoreId={allenatoreId}
            tipologie={tipologie}
            onResult={lavagna.onResult}
            onSaved={() => { setLavagna(null); router.refresh() }}
            onClose={() => setLavagna(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="lista-editor">
      {popup && <EsercizioPopup esercizio={popup} onClose={() => setPopup(null)} onOpenSchema={(es, m) => { setPopup(null); setLavagna({ mode: m || 'view', esercizio: es }) }} />}
      {lavagna && (
        <LavagnaEsercizioModal
          mode={lavagna.mode}
          esercizio={lavagna.esercizio || null}
          allenatoreId={allenatoreId}
          tipologie={tipologie}
          onSaved={() => { setLavagna(null); router.refresh() }}
          onClose={() => setLavagna(null)}
        />
      )}

      {/* Selettore sezione */}
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button type="button"
          className={`sub-nav-link ${sezione === 'miei' ? 'active' : ''}`}
          onClick={() => { setSezione('miei'); setTabAttivo(null) }}>
          {t('mieiEsercizi', { n: esercizi.length })}
        </button>
        <button type="button"
          className={`sub-nav-link ${sezione === 'pubblici' ? 'active' : ''}`}
          onClick={() => { setSezione('pubblici'); setTabAttivo(null) }}>
          {t('preferiti', { n: preferitiFull.length })}
        </button>
        {eserciziResponsabile.length > 0 && (
          <button type="button"
            className={`sub-nav-link ${sezione === 'responsabile' ? 'active' : ''}`}
            onClick={() => { setSezione('responsabile'); setTabAttivo(null) }}>
            {t('delResponsabile', { n: eserciziResponsabile.length })}
          </button>
        )}
        <button type="button"
          className={`sub-nav-link ${sezione === 'scopri' ? 'active' : ''}`}
          onClick={async () => {
            setSezione('scopri'); setTabAttivo(null)
            if (esPublici === null) {
              const supabase = (await import('@/lib/supabase/client')).createClient()
              const { data } = await supabase
                .from('esercizi')
                .select('id, titolo, tipologia, descrizione_breve, descrizione, note, video_url, immagine_url, allenatore_id')
                .eq('pubblico', true)
                .eq('archiviato', false)
                .neq('allenatore_id', allenatoreId)
                .order('titolo')
              setEsPublici(data ?? [])
            }
          }}>
          {t('libreriaPubblica')}
        </button>
      </div>

      {/* Azioni — solo nella sezione miei */}
      {sezione === 'miei' && sezione !== 'responsabile' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn-azione" type="button" onClick={() => setLavagna({ mode: 'create' })}>{t('creaLavagna')}</button>
          <button className="btn-azione" onClick={() => setEditing('new')} type="button">{t('nuovoEsercizio')}</button>
        </div>
      )}

      {lista.length === 0 && (
        <div className="empty">
          {sezione === 'miei'
            ? t('emptyMiei')
            : sezione === 'responsabile'
              ? t('emptyResponsabile')
              : t('emptyPreferiti')}
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
                {tipologiaTradotta(k, locale)} <span style={{ fontSize: 11, opacity: 0.7 }}>({gruppi[k].length})</span>
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
                  onEdit={sezione === 'miei' && sezione !== 'responsabile' ? setEditing : null}
                  onRemoveFav={sezione === 'pubblici' ? togglePreferito : null}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sezione libreria pubblica */}
      {sezione === 'scopri' && (
        <div style={{ marginTop: 8 }}>
          {esPublici === null && <div className="empty">{t('caricamento')}</div>}
          {esPublici !== null && esPublici.length === 0 && (
            <div className="empty">{t('nessunPubblico')}</div>
          )}
          {esPublici !== null && esPublici.length > 0 && (() => {
            const gruppiScopri = {}
            for (const e of esPublici) {
              const tips = (e.tipologie?.length ? e.tipologie : (e.tipologia ? [e.tipologia] : [t('senzaTipologia')]))
              for (const t of tips) (gruppiScopri[t] ??= []).push(e)
            }
            const chiaviScopri = Object.keys(gruppiScopri).sort()
            const tabCorrScopri = tabScopri ?? chiaviScopri[0] ?? null
            return (
              <>
                <div className="sub-nav" style={{ overflowX: 'auto', flexWrap: 'nowrap', marginBottom: 8 }}>
                  {chiaviScopri.map((k) => (
                    <button key={k} type="button"
                      className={`sub-nav-link ${tabCorrScopri === k ? 'active' : ''}`}
                      onClick={() => setTabScopri(k)}>
                      {tipologiaTradotta(k, locale)} <span style={{ fontSize: 11, opacity: 0.7 }}>({gruppiScopri[k].length})</span>
                    </button>
                  ))}
                </div>
                {tabCorrScopri && (
                  <div className="es-lib-grid">
                    {gruppiScopri[tabCorrScopri].map((e) => (
                      <div key={e.id} className="es-lib-tile" style={{ position: 'relative' }}>
                        <button className="es-lib-img-wrap" type="button" onClick={() => setPopup(e)} title={t('vediDettaglio')}>
                          {e.immagine_url
                            ? <img loading="lazy" decoding="async" src={e.immagine_url} alt="" />
                            : <div className="es-lib-no-img">📋</div>}
                        </button>
                        <div className="es-lib-info">
                          <button className="es-lib-titolo" type="button" onClick={() => setPopup(e)}>{e.titolo}</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, margin: '0 8px 8px' }}>
                          <button
                            className="btn-mini"
                            type="button"
                            disabled={loadingPref === e.id}
                            onClick={() => togglePreferito(e.id)}
                            title={prefIds.has(e.id) ? t('rimuoviPreferitiTitle') : t('aggiungiPreferiti')}
                            style={{
                              flex: 1, fontSize: 11, padding: '3px 6px',
                              background: prefIds.has(e.id) ? 'var(--giallo, #e8a72c)' : undefined,
                              color: prefIds.has(e.id) ? '#000' : undefined,
                              fontWeight: 700,
                            }}
                          >
                            {loadingPref === e.id ? '...' : prefIds.has(e.id) ? t('salvato') : t('salva')}
                          </button>
                          <button className="btn-mini" type="button" onClick={() => setPopup(e)} style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}>
                            {t('dettaglio')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function EsercizioForm({ esercizio, tipologie, attributiDisponibili = [], allenatoreId, onSaved, onCancel, onEditSchema }) {
  const locale = useLocale()
  const t = useTranslations('eserciziManager')
  const c = useTranslations('common')
  const isEdit = !!esercizio
  const [f, setF] = useState({
    titolo: esercizio?.titolo ?? '',
    tipologie: esercizio?.tipologie?.length ? esercizio.tipologie : (esercizio?.tipologia ? [esercizio.tipologia] : []),
    descrizione_breve: esercizio?.descrizione_breve ?? '',
    descrizione: esercizio?.descrizione ?? '',
    note: esercizio?.note ?? '',
    video_url: esercizio?.video_url ?? '',
    pubblico: esercizio?.pubblico ?? false,
    durata_minuti: esercizio?.durata_minuti ?? '',
    recupero_minuti: esercizio?.recupero_minuti ?? '',
  })
  const [attributiSel, setAttributiSel] = useState(new Set(esercizio?.esercizio_attributi?.map(a => a.attributo_id) ?? []))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(esercizio?.immagine_url ?? '')
  const [imgUrl, setImgUrl] = useState(esercizio?.immagine_url ?? null)
  const [schemaJson, setSchemaJson] = useState(esercizio?.schema_json ?? null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }
  function toggleTip(t) {
    setF((s) => {
      const cur = s.tipologie ?? []
      const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]
      return { ...s, tipologie: next }
    })
    setDone(false)
  }
  function aggiungiTip() {
    const nome = prompt(t('promptTipologia'))
    if (!nome) return
    const supabase = createClient()
    supabase.from('elenco_voci').insert({
      elenco: 'tipologie_esercizio', valore: nome.trim(), stato: 'proposta', proposto_da: allenatoreId, ordine: 999,
    }).then(() => toggleTip(nome.trim()))
  }
  function toggleAttr(id) {
    setAttributiSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
    setDone(false)
  }

  async function salva() {
    if (!f.titolo.trim()) { setError(t('erroreTitolo')); return }
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      let immagine_url = imgUrl
      if (file) {
        const img = await comprimiImmagine(file, MISURE.esercizio)
        const path = `esercizi/${allenatoreId}/${Date.now()}.${img.ext}`
        const { error: upErr } = await supabase.storage.from('sito')
          .upload(path, img.blob, { upsert: true, contentType: img.contentType, cacheControl: CACHE_LUNGA })
        if (upErr) throw upErr
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        allenatore_id: allenatoreId, titolo: f.titolo.trim(),
        tipologia: f.tipologie?.[0] || null,  // retrocompatibilità
        tipologie: f.tipologie ?? [],
        descrizione_breve: f.descrizione_breve || null, descrizione: f.descrizione || null,
        note: f.note || null, video_url: f.video_url || null, immagine_url, schema_json: schemaJson, pubblico: !!f.pubblico,
        durata_minuti: f.durata_minuti !== '' ? parseFloat(f.durata_minuti) : null,
        recupero_minuti: f.recupero_minuti !== '' ? parseFloat(f.recupero_minuti) : null,
      }
      let esercizioId
      if (isEdit) {
        const { error } = await supabase.from('esercizi').update(payload).eq('id', esercizio.id)
        if (error) throw error
        esercizioId = esercizio.id
      } else {
        const { data: ins, error } = await supabase.from('esercizi').insert(payload).select('id').single()
        if (error) throw error
        esercizioId = ins.id
      }
      // Salva attributi
      const { error: delAttrErr } = await supabase.from('esercizio_attributi').delete().eq('esercizio_id', esercizioId)
      if (delAttrErr) throw delAttrErr
      if (attributiSel.size > 0) {
        const { error: insAttrErr } = await supabase.from('esercizio_attributi').insert(
          [...attributiSel].map(aId => ({ esercizio_id: esercizioId, attributo_id: aId }))
        )
        if (insAttrErr) throw insAttrErr
      }
      setDone(true); setBusy(false); if (onSaved) onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  async function elimina() {
    if (!confirm(t('confermaArchivia'))) return
    const supabase = createClient()
    const { error } = await supabase.from('esercizi').update({ archiviato: true }).eq('id', esercizio.id)
    if (error) alert(t('erroreAlert') + error.message); else if (onSaved) onSaved()
  }

  return (
    <div className="scheda es-form">
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>{isEdit ? t('modificaEsercizio') : t('nuovoEsercizioTitolo')}</h2>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field field-full"><label>{t('titolo')}</label><input value={f.titolo} onChange={upd('titolo')} /></div>
        <div className="field field-full">
          <label>{t('tipologieLabel')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {tipologie.map((tp) => (
              <button key={tp} type="button"
                onClick={() => toggleTip(tp)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: (f.tipologie ?? []).includes(tp) ? '2px solid var(--azzurro)' : '1.5px solid var(--linea)',
                  background: (f.tipologie ?? []).includes(tp) ? 'rgba(10,126,194,0.1)' : 'var(--carta)',
                  color: (f.tipologie ?? []).includes(tp) ? 'var(--azzurro)' : 'var(--ink)',
                  fontWeight: (f.tipologie ?? []).includes(tp) ? 700 : 400,
                }}>
                {tipologiaTradotta(tp, locale)}
              </button>
            ))}
            <button type="button" onClick={aggiungiTip}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 13, border: '1.5px dashed var(--linea)', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}>
              {t('nuovaTip')}
            </button>
          </div>
        </div>
        {attributiDisponibili.length > 0 && (
          <div className="field field-full">
            <label>{t('attributiLabel')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {attributiDisponibili.map((a) => (
                <button key={a.id} type="button"
                  onClick={() => toggleAttr(a.id)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: attributiSel.has(a.id) ? '2px solid var(--campo)' : '1.5px solid var(--linea)',
                    background: attributiSel.has(a.id) ? 'rgba(46,158,91,0.1)' : 'var(--carta)',
                    color: attributiSel.has(a.id) ? 'var(--campo)' : 'var(--ink)',
                    fontWeight: attributiSel.has(a.id) ? 700 : 400,
                  }}>
                  {a.nome}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field"><label>{t('immagine')}</label>
          <label className="foto-upload">{preview ? t('cambiaImmagine') : t('caricaImmagine')}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          {preview && <img loading="lazy" decoding="async" src={preview} alt="" style={{ marginTop: 8, maxWidth: 160, borderRadius: 'var(--r-sm)' }} />}
        </div>
        <div className="field field-full"><label>{t('descrizioneBreve')}</label><input value={f.descrizione_breve} onChange={upd('descrizione_breve')} /></div>
        <div className="field field-full"><label>{t('descrizioneDettagliata')}</label><textarea rows="4" value={f.descrizione} onChange={upd('descrizione')} /></div>
        <div className="field field-full"><label>{t('noteLabel')}</label><textarea rows="2" value={f.note} onChange={upd('note')} /></div>
        <div className="field field-full"><label>{t('linkVideo')}</label>
          <input type="url" value={f.video_url} onChange={upd('video_url')} placeholder="https://www.youtube.com/watch?v=..." />
          {f.video_url && <a href={f.video_url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'var(--azzurro)',marginTop:4,display:'inline-block'}}>{t('anteprimaLink')}</a>}
        </div>
        <div className="field es-tempo">
          <label>{t('durataEsercizio')} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>{t('minutiFacoltativo')}</span></label>
          <input
            type="number" min="0" step="0.5"
            value={f.durata_minuti}
            onChange={upd('durata_minuti')}
            placeholder={t('phDurata')}
            style={{ maxWidth: 120 }}
          />
        </div>
        <div className="field es-tempo">
          <label>{t('recupero')} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>{t('minutiFacoltativo')}</span></label>
          <input
            type="number" min="0" step="0.5"
            value={f.recupero_minuti}
            onChange={upd('recupero_minuti')}
            placeholder={t('phRecupero')}
            style={{ maxWidth: 120 }}
          />
        </div>
        <div className="field field-full es-pubblico">
          <label className="val-nessuno">
            <input type="checkbox" checked={f.pubblico} onChange={(e) => { setF((s) => ({ ...s, pubblico: e.target.checked })); setDone(false) }} />
            {t('pubblicoLabel')}
          </label>
        </div>
      </div>
      {isEdit && onEditSchema && (
        <div style={{ margin: '6px 0 14px', paddingTop: 12, borderTop: '1px solid var(--line, #e4ebef)' }}>
          <button type="button" className="btn-azione" onClick={() => onEditSchema({ ...esercizio, schema_json: schemaJson, immagine_url: imgUrl, titolo: f.titolo }, (res) => {
            setSchemaJson(res.schema); setImgUrl(res.immagine_url); setPreview(res.immagine_url || '')
            if (res.name) setF((st) => ({ ...st, titolo: res.name }))
            setDone(false)
          })}>
            {schemaJson ? t('modificaSchema') : t('aggiungiSchema')}
          </button>
          <span style={{ marginLeft: 10, fontSize: 12.5, color: 'var(--ink-soft, #7f8f9b)' }}>
            {t.rich('poiPremiSalva', { b: (ch) => <strong>{ch}</strong> })}
          </span>
        </div>
      )}
      <div className="form-actions es-azioni">
        {onCancel && <button className="btn-ghost" onClick={onCancel} type="button">{c('annulla')}</button>}
        {isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">{t('archivia')}</button>}
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? t('salvataggio') : done ? t('salvatoCheck') : t('salvaBtn')}
        </button>
      </div>
    </div>
  )
}
