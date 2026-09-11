'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { renderTesto } from '@/lib/renderTesto'
import TraduzioniEditor from '@/app/components/TraduzioniEditor'

async function revalidateHome() {
  try { await fetch('/api/revalidate-home', { method: 'POST' }) } catch (_) {}
}

const TIPI_VAL = ['hero', 'vantaggio', 'contenuto', 'testo', 'faq', 'banner', 'social', 'prezzi']

function campiTrad(s, t) {
  const c = [
    { campo: 'titolo', label: t('titolo'), it: s.titolo, tipo: 'testo' },
    { campo: 'testo', label: t('testo'), it: s.testo, tipo: 'testo' },
  ]
  const haImmagine = s.tipo !== 'testo' && s.tipo !== 'prezzi' && s.tipo !== 'faq'
  if (haImmagine) c.push({ campo: 'immagine_url', label: t('imgTradLabel'), it: s.immagine_url, tipo: 'immagine' })
  if (s.tipo === 'hero' || s.tipo === 'banner') {
    c.push({ campo: 'immagine_mobile_url', label: t('imgMobileTradLabel'), it: s.immagine_mobile_url, tipo: 'immagine' })
    c.push({ campo: 'link_url', label: t('linkLabel'), it: s.link_url, tipo: 'link' })
  }
  if (s.tipo === 'social') {
    c.push({ campo: 'link_url', label: t('linkFacebook'), it: s.link_url, tipo: 'link' })
    c.push({ campo: 'link_url_2', label: t('linkInstagram'), it: s.link_url_2, tipo: 'link' })
  }
  return c
}

function SezioneCard({ sezione, onChanged }) {
  const t = useTranslations('sitoEditor')
  const router = useRouter()
  const [s, setS] = useState(sezione)
  const [fotoPos, setFotoPos] = useState(sezione.foto_posizione ?? 'sinistra')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(sezione.immagine_url || '')
  const [fileMobile, setFileMobile] = useState(null)
  const [previewMobile, setPreviewMobile] = useState(sezione.immagine_mobile_url || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const upd = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setS((p) => ({ ...p, [k]: val })); setDone(false)
  }
  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }
  function onFileMobile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFileMobile(fl); setPreviewMobile(URL.createObjectURL(fl)); setDone(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    try {
      let immagine_url = s.immagine_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `sez/${s.id}/${Date.now()}.${ext}`
        const { error: e1 } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (e1) throw e1
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        setS((p) => ({ ...p, immagine_url }))
      }
      let immagine_mobile_url = s.immagine_mobile_url ?? null
      if (fileMobile) {
        const ext = fileMobile.name.split('.').pop()
        const path = `sez/${s.id}/mobile_${Date.now()}.${ext}`
        const { error: e2 } = await supabase.storage.from('sito').upload(path, fileMobile, { upsert: true })
        if (e2) throw e2
        immagine_mobile_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        setS((p) => ({ ...p, immagine_mobile_url }))
      }
      const { error } = await supabase.from('sito_sezioni').update({
        tipo: s.tipo, ordine: Number(s.ordine) || 0, visibile: s.visibile,
        titolo: s.titolo || null, testo: s.testo || null, immagine_url,
        immagine_mobile_url, foto_posizione: fotoPos,
        altezza_px: s.altezza_px ? Number(s.altezza_px) : null,
        link_url: s.link_url || null, link_url_2: s.link_url_2 || null,
      }).eq('id', s.id)
      if (error) throw error
      setFile(null); setDone(true); router.refresh(); revalidateHome()
    } catch (err) { alert(t('errore', { msg: err.message || err })) }
    setBusy(false)
  }

  async function elimina() {
    if (!confirm(t('confermaElim'))) return
    const supabase = createClient()
    const { error } = await supabase.from('sito_sezioni').delete().eq('id', s.id)
    if (error) { alert(t('errore', { msg: error.message })); return }
    revalidateHome()
    onChanged()
  }

  const dimConsigliate = s.tipo === 'hero' ? t('dimHero') : s.tipo === 'contenuto' ? t('dimContenuto') : s.tipo === 'banner' ? t('dimBanner') : t('dimDefault')
  const dimConsigliateMobile = s.tipo === 'hero' ? t('dimHeroMobile') : s.tipo === 'banner' ? t('dimBannerMobile') : t('dimDefault')
  const altezzeOpts = [
    { h: 200, label: t('h200') }, { h: 300, label: t('h300') }, { h: 400, label: t('h400') }, { h: 600, label: t('h600') },
  ]

  return (
    <div className="sez-card">
      <div className="sez-head">
        <select value={s.tipo} onChange={upd('tipo')}>
          {TIPI_VAL.map((v) => <option key={v} value={v}>{t('tipo_' + v)}</option>)}
        </select>
        <label className="sez-vis">
          <input type="checkbox" checked={s.visibile} onChange={upd('visibile')} /> {t('visibile')}
        </label>
        <label className="sez-ord">{t('ordine')}
          <input type="number" value={s.ordine} onChange={upd('ordine')} />
        </label>
      </div>
      <div className="field"><label>{t('titolo')}</label>
        <input value={s.titolo ?? ''} onChange={upd('titolo')} />
      </div>
      <div className="field">
        <label>
          {t('testo')}
          <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
            {t.rich('testoHint', { b: (ch) => <strong>{ch}</strong> })}
          </span>
        </label>
        <textarea rows="5" value={s.testo ?? ''} onChange={upd('testo')} style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </div>

      {s.tipo === 'faq' && (
        <div style={{ background: 'rgba(46,158,91,0.08)', border: '1px solid rgba(46,158,91,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--ink)' }}>
          {t.rich('faqNota', { b: (ch) => <b>{ch}</b> })}
        </div>
      )}

      {s.tipo === 'prezzi' && (
        <div style={{ background: 'rgba(10,126,194,0.08)', border: '1px solid rgba(10,126,194,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--ink)' }}>
          {t.rich('prezziNota', { b: (ch) => <b>{ch}</b> })}
        </div>
      )}

      {(s.tipo === 'hero' || s.tipo === 'banner') && (
        <div className="field">
          <label>
            {t('linkLabel')}
            <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>{t('linkHint')}</span>
          </label>
          <input type="url" value={s.link_url ?? ''} onChange={upd('link_url')} placeholder="https://..." />
        </div>
      )}

      {s.tipo === 'social' && (
        <>
          <div className="field">
            <label>{t('linkFacebook')}</label>
            <input type="url" value={s.link_url ?? ''} onChange={upd('link_url')} placeholder="https://facebook.com/..." />
          </div>
          <div className="field">
            <label>{t('linkInstagram')}</label>
            <input type="url" value={s.link_url_2 ?? ''} onChange={upd('link_url_2')} placeholder="https://instagram.com/..." />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px' }}>{t('socialHint')}</p>
        </>
      )}

      {s.tipo === 'banner' && (
        <div className="field">
          <label>{t('altezzaBanner')}</label>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px', lineHeight: 1.5 }}>{t('altezzaBannerNota')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {altezzeOpts.map(({ h, label }) => (
              <button key={h} type="button" onClick={() => { setS((p) => ({ ...p, altezza_px: h })); setDone(false) }}
                style={{ padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: (s.altezza_px ?? 300) === h ? '2px solid var(--azzurro)' : '2px solid var(--linea)',
                  background: (s.altezza_px ?? 300) === h ? 'rgba(10,126,194,0.08)' : 'var(--carta)',
                  fontWeight: (s.altezza_px ?? 300) === h ? 700 : 400,
                  color: (s.altezza_px ?? 300) === h ? 'var(--azzurro)' : 'var(--ink)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {s.tipo !== 'testo' && s.tipo !== 'prezzi' && s.tipo !== 'faq' && (
        <div className="sez-img">
          <div className="sez-thumb">
            {preview ? <img src={preview} alt="" /> : <span>{t('nessunaImmagine')}</span>}
          </div>
          <div>
            <label className="foto-upload">
              {preview ? t('cambiaImmagine') : t('caricaImmagine')}
              <input type="file" accept="image/*" onChange={onFile} hidden />
            </label>
            <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
              {t.rich('dimConsigliate', { dim: dimConsigliate, b: (ch) => <b>{ch}</b> })}
            </p>

            {(s.tipo === 'hero' || s.tipo === 'banner') && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--linea)' }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  {t('immagineMobile')}
                  <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>{t('immagineMobileHint')}</span>
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="sez-thumb" style={{ width: 80, height: 60 }}>
                    {previewMobile
                      ? <img src={previewMobile} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 11 }}>{t('nessuna')}</span>}
                  </div>
                  <div>
                    <label className="foto-upload">
                      {previewMobile ? t('cambiaImmagineMobile') : t('caricaImmagineMobile')}
                      <input type="file" accept="image/*" onChange={onFileMobile} hidden />
                    </label>
                    {previewMobile && (
                      <button type="button" className="btn-ghost btn-del" style={{ fontSize: 12, marginTop: 6, display: 'block' }}
                        onClick={() => { setPreviewMobile(''); setFileMobile(null); setS((p) => ({ ...p, immagine_mobile_url: null })); setDone(false) }}>
                        {t('rimuoviImmagineMobile')}
                      </button>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
                      {t.rich('dimConsigliate', { dim: dimConsigliateMobile, b: (ch) => <b>{ch}</b> })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {s.tipo === 'contenuto' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('posizioneFoto')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['sinistra', 'destra'].map((pos) => (
                    <button key={pos} type="button" onClick={() => { setFotoPos(pos); setDone(false) }}
                      style={{ padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: fotoPos === pos ? '2px solid var(--azzurro)' : '2px solid var(--linea)',
                        background: fotoPos === pos ? 'rgba(10,126,194,0.08)' : 'var(--carta)',
                        fontWeight: fotoPos === pos ? 700 : 400,
                        color: fotoPos === pos ? 'var(--azzurro)' : 'var(--ink)' }}>
                      {pos === 'sinistra' ? t('fotoSinistra') : t('fotoDestra')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <TraduzioniEditor tabella="sito_sezioni" rigaId={s.id} campi={campiTrad(s, t)} />
      <div className="sez-actions">
        <button className="btn-ghost btn-del" onClick={elimina} type="button">{t('elimina')}</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? t('salvataggio') : done ? t('salvato') : t('salva')}
        </button>
      </div>
    </div>
  )
}

export default function SitoEditor({ sezioni }) {
  const t = useTranslations('sitoEditor')
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function aggiungi(tipo) {
    setAdding(true)
    const supabase = createClient()
    const maxOrd = sezioni.reduce((m, s) => Math.max(m, s.ordine), 0)
    const { error } = await supabase.from('sito_sezioni').insert({ tipo, ordine: maxOrd + 1, titolo: 'Nuova sezione', testo: '', visibile: tipo !== 'prezzi' })
    if (error) alert(t('errore', { msg: error.message }))
    setAdding(false)
    revalidateHome()
    router.refresh()
  }

  return (
    <div className="sito-editor">
      {sezioni.map((sez) => (
        <SezioneCard key={sez.id} sezione={sez} onChanged={() => router.refresh()} />
      ))}
      <div className="add-sez">
        <span>{t('aggiungiSezione')}</span>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('vantaggio')} type="button">{t('addVantaggio')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('contenuto')} type="button">{t('addContenuto')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('testo')} type="button">{t('addTesto')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('faq')} type="button">{t('addFaq')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('banner')} type="button">{t('addBanner')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('social')} type="button">{t('addSocial')}</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('prezzi')} type="button">{t('addPrezzi')}</button>
      </div>
    </div>
  )
}
