'use client'

import { useState } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function ProfiloForm({ profilo, userId }) {
  const t = useTranslations('profiloForm')
  const router = useRouter()
  const locale = useLocale()
  const pathname = usePathname()
  const [f, setF] = useState({
    nome_completo: profilo?.nome_completo ?? '',
    telefono: profilo?.telefono ?? '',
    bio: profilo?.bio ?? '',
    via: profilo?.via ?? '',
    citta: profilo?.citta ?? '',
    cap: profilo?.cap ?? '',
    range_ricerca: profilo?.range_ricerca == null ? '' : String(profilo.range_ricerca),
    disponibile: profilo?.disponibile ?? true,
    lingua: profilo?.lingua ?? 'it',
  })
  const [esperienze, setEsperienze] = useState(Array.isArray(profilo?.esperienze) ? profilo.esperienze : [])
  const [certificati, setCertificati] = useState(Array.isArray(profilo?.certificati) ? profilo.certificati : [])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(profilo?.foto_url ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }
  function onFile(e) { const fl = e.target.files?.[0]; if (!fl) return; setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false) }

  const mkSet = (arr, setArr) => (i, v) => { setArr(arr.map((x, idx) => (idx === i ? v : x))); setDone(false) }
  const mkAdd = (arr, setArr) => () => { setArr([...arr, '']); setDone(false) }
  const mkDel = (arr, setArr) => (i) => { setArr(arr.filter((_, idx) => idx !== i)); setDone(false) }

  async function salva() {
    setError('')
    const mancanti = []
    if (!f.nome_completo?.trim()) mancanti.push(t('mNome'))
    if (!f.via?.trim()) mancanti.push(t('mVia'))
    if (!f.citta?.trim()) mancanti.push(t('mCitta'))
    if (!f.cap?.trim()) mancanti.push(t('mCap'))
    if (mancanti.length) { setError(t('compilaObbligatori', { campi: mancanti.join(', ') })); return }
    setBusy(true)
    const supabase = createClient()
    try {
      let foto_url = profilo?.foto_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `profili/${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        foto_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        nome_completo: f.nome_completo || null,
        telefono: f.telefono || null,
        bio: f.bio || null,
        via: f.via || null,
        citta: f.citta || null,
        cap: f.cap || null,
        range_ricerca: f.range_ricerca === '' ? null : Number(f.range_ricerca),
        disponibile: !!f.disponibile,
        esperienze: esperienze.filter((x) => x && x.trim()),
        certificati: certificati.filter((x) => x && x.trim()),
        foto_url,
        lingua: f.lingua || 'it',
      }
      if (f.citta) {
        try {
          const query = f.cap ? `${f.cap} ${f.citta}, Italia` : `${f.citta}, Italia`
          const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=' + encodeURIComponent(query))
          const gj = await g.json()
          if (gj && gj[0]) { payload.lat = parseFloat(gj[0].lat); payload.lng = parseFloat(gj[0].lon) }
        } catch (e) {}
      }
      const { error } = await supabase.from('profili').update(payload).eq('id', userId)
      if (error) throw error
      setDone(true); setBusy(false)
      if (f.lingua && f.lingua !== locale) router.replace(pathname, { locale: f.lingua }); else router.refresh()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="scheda">
      {error && <div className="err">{error}</div>}
      <p className="sub-intro" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>{t('intro')}</p>
      <div className="scheda-foto">
        <div className="foto-box">{preview ? <img src={preview} alt="" /> : <span className="foto-ph">{t('nessunaFoto')}</span>}</div>
        <label className="foto-upload">{preview ? t('cambiaFoto') : t('caricaFoto')}<input type="file" accept="image/*" onChange={onFile} hidden /></label>
      </div>
      <div className="form-grid">
        <div className="field"><label>{t('lNome')}</label><input value={f.nome_completo} onChange={upd('nome_completo')} required /></div>
        <div className="field"><label>{t('lTelefono')}</label><input value={f.telefono} onChange={upd('telefono')} /></div>
        <div className="field"><label>{t('lVia')}</label><input value={f.via} onChange={upd('via')} required /></div>
        <div className="field"><label>{t('lCitta')}</label><input value={f.citta} onChange={upd('citta')} placeholder={t('phCitta')} required /></div>
        <div className="field"><label>{t('lCap')}</label><input value={f.cap} onChange={upd('cap')} required /></div>
        <div className="field"><label>{t('linguaPreferita')}</label>
          <select value={f.lingua} onChange={upd('lingua')}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="field field-full">
          <div style={{ background: 'var(--carta)', border: '1px solid var(--linea)', borderRadius: 10, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, margin: 0 }}>
              <input type="checkbox" checked={f.disponibile} onChange={(e) => { setF((s) => ({ ...s, disponibile: e.target.checked })); setDone(false) }} />
              {t('disponibile')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              {t('rangeRicerca')}
              <select value={f.range_ricerca} onChange={upd('range_ricerca')}>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="30">30 km</option>
                <option value="50">50 km</option>
                <option value="70">70 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km</option>
                <option value="">{t('nessunLimite')}</option>
              </select>
            </label>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', flexBasis: '100%' }}>{t('disponibileNota')}</span>
          </div>
        </div>
        <div className="field field-full">
          <label>{t('bio')}</label>
          {!f.bio?.trim() && (
            <div style={{ background: '#fff7e6', border: '1px solid #f0c36d', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
              {t.rich('bioVuota', { b: (ch) => <b>{ch}</b> })}
            </div>
          )}
          <textarea rows="5" value={f.bio} onChange={upd('bio')} placeholder={t('bioPlaceholder')} />
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('caratteri', { n: (f.bio || '').trim().length })}</span>
        </div>
      </div>
      <ListaEditabile titolo={t('esperienze')} items={esperienze}
        onSet={mkSet(esperienze, setEsperienze)} onAdd={mkAdd(esperienze, setEsperienze)} onDel={mkDel(esperienze, setEsperienze)} ph={t('phEsperienze')} />
      <ListaEditabile titolo={t('certificati')} items={certificati}
        onSet={mkSet(certificati, setCertificati)} onAdd={mkAdd(certificati, setCertificati)} onDel={mkDel(certificati, setCertificati)} ph={t('phCertificati')} />
      <div className="form-actions">
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? t('salvataggio') : done ? t('salvato') : t('salva')}</button>
      </div>
    </div>
  )
}

function ListaEditabile({ titolo, items, onSet, onAdd, onDel, ph }) {
  const t = useTranslations('profiloForm')
  return (
    <div className="elenco-blocco">
      <h3>{titolo}</h3>
      {items.length === 0 && <p className="sub-intro">{t('nessunaVoce')}</p>}
      {items.map((v, i) => (
        <div className="lista-riga" key={i}>
          <input className="lista-nome" style={{ flex: 1 }} value={v} placeholder={ph} onChange={(e) => onSet(i, e.target.value)} />
          <button className="btn-mini btn-del" onClick={() => onDel(i)} type="button">{t('rimuovi')}</button>
        </div>
      ))}
      <button className="btn-ghost" onClick={onAdd} type="button">{t('aggiungi')}</button>
    </div>
  )
}
