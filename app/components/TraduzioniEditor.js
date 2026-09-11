'use client'

// Editor traduzioni per contenuti gestiti da DB (home sezioni, FAQ interne).
// Gestisce campi di tipo: 'testo' (default), 'link' (URL), 'immagine' (upload).
// Salva su public.contenuti_traduzioni (tabella, riga_id, campo, lingua, testo).
// Per le immagini, il file viene caricato nello storage 'sito' e in 'testo' va l'URL.
// L'italiano resta nella tabella originale; qui solo EN / DE / ES. Fallback all'IT
// se una lingua non ha la sua versione (gestito in fase di render).

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const LINGUE = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
]

export default function TraduzioniEditor({ tabella, rigaId, campi }) {
  const t = useTranslations('traduzioniEditor')
  const [lang, setLang] = useState('en')
  const [caricato, setCaricato] = useState(false)
  const [val, setVal] = useState({})        // "lingua:campo" -> testo/url
  const [files, setFiles] = useState({})    // "lingua:campo" -> File in attesa
  const [previews, setPreviews] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function carica() {
    const supabase = createClient()
    const { data } = await supabase
      .from('contenuti_traduzioni')
      .select('lingua, campo, testo')
      .eq('tabella', tabella)
      .eq('riga_id', rigaId)
    const m = {}
    for (const r of data ?? []) m[`${r.lingua}:${r.campo}`] = r.testo
    setVal(m)
    setCaricato(true)
  }

  function setCampo(campo, testo) {
    setVal((v) => ({ ...v, [`${lang}:${campo}`]: testo }))
    setDone(false)
  }
  function onFile(campo, e) {
    const fl = e.target.files?.[0]
    if (!fl) return
    setFiles((f) => ({ ...f, [`${lang}:${campo}`]: fl }))
    setPreviews((p) => ({ ...p, [`${lang}:${campo}`]: URL.createObjectURL(fl) }))
    setDone(false)
  }
  function rimuoviImmagine(campo) {
    const key = `${lang}:${campo}`
    setVal((v) => ({ ...v, [key]: '' }))
    setFiles((f) => { const n = { ...f }; delete n[key]; return n })
    setPreviews((p) => { const n = { ...p }; delete n[key]; return n })
    setDone(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    try {
      const v = { ...val }
      for (const c of campi) {
        const key = `${lang}:${c.campo}`
        if (c.tipo === 'immagine' && files[key]) {
          const fl = files[key]
          const ext = fl.name.split('.').pop()
          const path = `sez/${rigaId}/${lang}_${c.campo}_${Date.now()}.${ext}`
          const { error: e1 } = await supabase.storage.from('sito').upload(path, fl, { upsert: true })
          if (e1) throw e1
          v[key] = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        }
      }
      const righe = campi.map((c) => ({
        tabella, riga_id: rigaId, campo: c.campo, lingua: lang,
        testo: v[`${lang}:${c.campo}`] ?? '',
      }))
      const { error } = await supabase
        .from('contenuti_traduzioni')
        .upsert(righe, { onConflict: 'tabella,riga_id,campo,lingua' })
      if (error) throw error
      setVal(v)
      setFiles((f) => { const n = { ...f }; for (const c of campi) delete n[`${lang}:${c.campo}`]; return n })
      setDone(true)
    } catch (err) {
      alert(t('errore', { msg: err.message || err }))
    }
    setBusy(false)
  }

  const thumb = { width: 120, height: 70, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--linea, #e2e6e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)' }
  const img = { width: '100%', height: '100%', objectFit: 'cover' }

  return (
    <details
      onToggle={(e) => { if (e.currentTarget.open && !caricato) carica() }}
      style={{ marginBottom: 12, border: '1px solid var(--linea, #e2e6e1)', borderRadius: 8, padding: '8px 12px' }}
    >
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft, #6b7e8e)' }}>
        {t('titolo')}
      </summary>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {LINGUE.map((l) => (
            <button key={l.code} type="button" onClick={() => { setLang(l.code); setDone(false) }}
              className={lang === l.code ? 'btn-mini' : 'btn-mini btn-ghost'}>{l.label}</button>
          ))}
        </div>

        {!caricato ? (
          <p className="sub-intro" style={{ fontSize: 13 }}>{t('caricamento')}</p>
        ) : (
          <>
            {campi.map((c) => {
              const key = `${lang}:${c.campo}`
              if (c.tipo === 'immagine') {
                const cur = previews[key] || val[key]
                return (
                  <div className="field" key={c.campo} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12.5 }}>{c.label}</label>
                    {c.it && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', marginBottom: 6 }}>
                        <div style={{ marginBottom: 4 }}>{t('riferimentoIT')}</div>
                        <div style={thumb}><img src={c.it} alt="" style={img} /></div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={thumb}>{cur ? <img src={cur} alt="" style={img} /> : <span style={{ fontSize: 11 }}>{t('nessunaImmagine')}</span>}</div>
                      <div>
                        <label className="foto-upload">
                          {cur ? t('cambiaImmagine') : t('caricaImmagine')}
                          <input type="file" accept="image/*" hidden onChange={(e) => onFile(c.campo, e)} />
                        </label>
                        {val[key] && (
                          <button type="button" className="btn-ghost btn-del" style={{ fontSize: 12, marginTop: 6, display: 'block' }}
                            onClick={() => rimuoviImmagine(c.campo)}>{t('rimuovi')}</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              if (c.tipo === 'link') {
                return (
                  <div className="field" key={c.campo} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5 }}>{c.label}</label>
                    {c.it && <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', marginBottom: 4, wordBreak: 'break-all' }}><span style={{ fontWeight: 600 }}>{t('riferimentoIT')} </span>{c.it}</div>}
                    <input type="url" value={val[key] ?? ''} onChange={(e) => setCampo(c.campo, e.target.value)} placeholder="https://..." />
                  </div>
                )
              }
              return (
                <div className="field" key={c.campo} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12.5 }}>{c.label}</label>
                  {c.it != null && c.it !== '' && (
                    <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '6px 8px', marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                      <span style={{ fontWeight: 600 }}>{t('riferimentoIT')} </span>{c.it}
                    </div>
                  )}
                  <textarea rows="2" value={val[key] ?? ''} onChange={(e) => setCampo(c.campo, e.target.value)} placeholder={t('placeholder')} />
                </div>
              )
            })}
            <button className="btn" type="button" onClick={salva} disabled={busy}>
              {busy ? t('salvataggio') : done ? t('salvato') : t('salva')}
            </button>
          </>
        )}
      </div>
    </details>
  )
}
