'use client'

import { useState, useCallback } from 'react'
import { comprimiImmagine, MISURE, CACHE_LUNGA } from '@/lib/immagini'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

// ─── Render newsletter (usato sia in preview che nella pagina pubblica) ──────
export function NewsletterRender({ titolo, sezioni, dataStr, societa }) {
  const t = useTranslations('newsletterRender')
  return (
    <div style={{
      maxWidth: 580, margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif",
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a5a8a 0%, #0a7ec2 100%)',
        padding: '32px 36px 24px', color: '#fff',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 8 }}>
            {societa ?? 'GKSeason'} · Newsletter
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.3px' }}>{titolo || t('titoloDefault')}</h1>
          {dataStr && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>{dataStr}</div>}
        </div>
        <img src="/gk_circle_white.png" alt="GKSeason" style={{ width: 56, height: 'auto', flexShrink: 0, display: 'block' }} />
      </div>

      {/* Corpo */}
      <div style={{ padding: '28px 36px' }}>
        {(sezioni ?? []).map((s, i) => {
          if (s.tipo === 'titolo') return (
            <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#0a5a8a', margin: '24px 0 10px', paddingBottom: 6, borderBottom: '2px solid #e8f0f8' }}>
              {s.testo || t('titoloSezione')}
            </h2>
          )
          if (s.tipo === 'foto') return (
            <div key={i} style={{ margin: '20px 0' }}>
              {s.foto_url && (
                s.link_url ? (
                  <a href={s.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                    <img loading="lazy" decoding="async" src={s.foto_url} alt={s.testo ?? ''} style={{
                      width: '100%', borderRadius: 8, display: 'block',
                      maxHeight: 340, objectFit: 'cover',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                    }} />
                  </a>
                ) : (
                  <img loading="lazy" decoding="async" src={s.foto_url} alt={s.testo ?? ''} style={{
                    width: '100%', borderRadius: 8, display: 'block',
                    maxHeight: 340, objectFit: 'cover',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                  }} />
                )
              )}
              {!s.foto_url && (
                <div style={{ background: '#f0f4f8', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8899a8', fontSize: 14 }}>
                  {t('immagineNonCaricata')}
                </div>
              )}
              {s.testo && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7e8e', textAlign: 'center', fontStyle: 'italic' }}>{s.testo}</p>}
            </div>
          )
          if (s.tipo === 'separatore') return (
            <hr key={i} style={{ border: 'none', borderTop: '1px solid #e8f0f8', margin: '24px 0' }} />
          )
          // tipo === 'testo' (default)
          return (
            <div key={i} style={{ margin: '14px 0' }}>
              {(s.testo || '').split('\n').map((r, ri) =>
                r.trim() === '' ? <br key={ri} /> : (
                  <p key={ri} style={{ margin: '0 0 8px', fontSize: 15, lineHeight: 1.7, color: '#2a3b47' }}>{r}</p>
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ background: '#f6f8fa', borderTop: '1px solid #e8f0f8', padding: '16px 36px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#8899a8', lineHeight: 1.6 }}>
          {t('footerIscritto', { societa: societa ?? 'GKSeason' })}<br />
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{t('disiscriviti')}</span>
        </p>
      </div>
    </div>
  )
}

// ─── Editor singola sezione ──────────────────────────────────────────────────
function EditorSezione({ sezione, idx, onUpdate, onRemove }) {
  const t = useTranslations('newsletterManager')
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const img = await comprimiImmagine(file, MISURE.newsletter)
    const path = `newsletter/${Date.now()}.${img.ext}`
    const { error } = await supabase.storage.from('sito')
      .upload(path, img.blob, { upsert: true, contentType: img.contentType, cacheControl: CACHE_LUNGA })
    if (error) { alert(t('erroreUpload', { msg: error.message })); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('sito').getPublicUrl(path)
    onUpdate({ ...sezione, foto_url: publicUrl })
    setUploading(false)
  }

  const TIPO_LABEL = { testo: t('tipoTesto'), foto: t('tipoFoto'), titolo: t('tipoTitolo'), separatore: t('tipoSeparatore') }

  return (
    <div style={{ border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--carta)', borderBottom: '1px solid var(--linea)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>#{idx + 1} {TIPO_LABEL[sezione.tipo] ?? sezione.tipo}</span>
        <button type="button" className="btn-mini btn-del" onClick={onRemove}>✕</button>
      </div>
      <div style={{ padding: 12 }}>
        {sezione.tipo === 'testo' && (
          <textarea rows="4" value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
            placeholder={t('phTesto')} style={{ width: '100%', boxSizing: 'border-box' }} />
        )}
        {sezione.tipo === 'titolo' && (
          <input value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
            placeholder={t('phTitoloSezione')} style={{ width: '100%', boxSizing: 'border-box', fontWeight: 700, fontSize: 16 }} />
        )}
        {sezione.tipo === 'separatore' && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>{t('lineaSeparazione')}</p>
        )}
        {sezione.tipo === 'foto' && (
          <div>
            <label className="foto-upload" style={{ display: 'inline-block', marginBottom: 10 }}>
              {uploading ? t('caricamentoInCorso') : sezione.foto_url ? t('cambiaImmagine') : t('caricaImmagine')}
              <input type="file" accept="image/*" onChange={handleFile} hidden disabled={uploading} />
            </label>
            {sezione.foto_url && (
              <img loading="lazy" decoding="async" src={sezione.foto_url} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--r-sm)', marginBottom: 8 }} />
            )}
            <input value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
              placeholder={t('phDidascalia')} style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
            <input value={sezione.link_url ?? ''} onChange={(e) => onUpdate({ ...sezione, link_url: e.target.value })}
              placeholder={t('phLinkDest')} style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, marginTop: 8 }} />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>{t('notaLinkFoto')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Editor newsletter ───────────────────────────────────────────────────────
function EditorNL({ newsletter, onSaved, onCancel }) {
  const t = useTranslations('newsletterManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const isEdit = !!newsletter
  const [titolo, setTitolo] = useState(newsletter?.titolo ?? '')
  const [sezioni, setSezioni] = useState(newsletter?.contenuto ?? [{ tipo: 'testo', testo: '' }])
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const addSezione = (tipo) => setSezioni((s) => [...s, { tipo, testo: '', foto_url: '' }])
  const updateSezione = (i, s) => setSezioni((arr) => arr.map((x, idx) => idx === i ? s : x))
  const removeSezione = (i) => setSezioni((arr) => arr.filter((_, idx) => idx !== i))

  async function salva(pubblicata) {
    if (!titolo.trim()) { setErr(t('inserisciTitolo')); return }
    setBusy(true); setErr('')
    const supabase = createClient()
    if (isEdit) {
      const payload = { titolo: titolo.trim(), contenuto: sezioni }
      // Se stai pubblicando una bozza per la prima volta, imposta anche la data di invio
      if (pubblicata && !newsletter.pubblicata) { payload.pubblicata = true; payload.inviata_il = new Date().toISOString() }
      const { error } = await supabase.from('newsletter_invii').update(payload).eq('id', newsletter.id)
      if (error) { setErr(error.message); setBusy(false); return }
    } else {
      const { error } = await supabase.from('newsletter_invii').insert({
        titolo: titolo.trim(), contenuto: sezioni, pubblicata,
        inviata_il: pubblicata ? new Date().toISOString() : null,
      })
      if (error) { setErr(error.message); setBusy(false); return }
    }
    setBusy(false); if (onSaved) onSaved()
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {err && <div className="err">{err}</div>}

      {/* Tabs editor/preview */}
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button type="button" className={`sub-nav-link ${!preview ? 'active' : ''}`} onClick={() => setPreview(false)}>{t('tabEditor')}</button>
        <button type="button" className={`sub-nav-link ${preview ? 'active' : ''}`} onClick={() => setPreview(true)}>{t('tabAnteprima')}</button>
      </div>

      {!preview ? (
        <div className="scheda">
          <h3 style={{ marginTop: 0 }}>{isEdit ? t('modificaTitolo', { titolo: newsletter.titolo }) : t('nuovaNewsletter')}</h3>
          {isEdit && newsletter.pubblicata && (
            <p className="sub-intro" style={{ marginTop: 0 }}>
              {t('giaPubblicata', { data: new Date(newsletter.inviata_il).toLocaleDateString(dl) })}
            </p>
          )}
          <div className="field">
            <label>{t('titoloLabel')}</label>
            <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder={t('phTitoloNL')} style={{ fontSize: 16, fontWeight: 600 }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{t('sezioni')}</div>
            {sezioni.map((s, i) => (
              <EditorSezione key={i} sezione={s} idx={i}
                onUpdate={(ns) => updateSezione(i, ns)}
                onRemove={() => removeSezione(i)} />
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[
                { tipo: 'testo', label: t('addTesto') },
                { tipo: 'titolo', label: t('addTitolo') },
                { tipo: 'foto', label: t('addFoto') },
                { tipo: 'separatore', label: t('addSeparatore') },
              ].map(({ tipo, label }) => (
                <button key={tipo} type="button" className="btn-ghost" onClick={() => addSezione(tipo)}
                  style={{ fontSize: 13, padding: '6px 12px' }}>{label}</button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>{isEdit ? t('chiudi') : t('annulla')}</button>}
            {!(isEdit && newsletter.pubblicata) && (
              <button type="button" className="btn-ghost" onClick={() => salva(false)} disabled={busy}>{t('salvaBozza')}</button>
            )}
            <button type="button" className="btn" onClick={() => salva(true)} disabled={busy}>
              {busy ? t('salvataggio') : (isEdit ? (newsletter.pubblicata ? t('salvaModifiche') : t('pubblica')) : t('pubblica'))}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="sub-intro" style={{ marginBottom: 16 }}>{t('anteprimaIntro')}</p>
          <NewsletterRender
            titolo={titolo}
            sezioni={sezioni}
            dataStr={new Date(newsletter?.inviata_il ?? Date.now()).toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' })}
          />
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn-ghost" onClick={() => setPreview(false)}>{t('tornaEditor')}</button>
            <button type="button" className="btn" onClick={() => salva(true)} disabled={busy}>
              {busy ? t('salvataggio') : (isEdit ? t('salva') : t('pubblicaOra'))}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principale ───────────────────────────────────────────────────
export default function NewsletterManager({ invii, iscritti }) {
  const t = useTranslations('newsletterManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const [crea, setCrea] = useState(false)
  const [modificaId, setModificaId] = useState(null)

  async function pubblica(id) {
    const supabase = createClient()
    await supabase.from('newsletter_invii').update({ pubblicata: true, inviata_il: new Date().toISOString() }).eq('id', id)
    router.refresh()
  }
  async function elimina(id) {
    if (!confirm(t('confermaElim'))) return
    const supabase = createClient()
    await supabase.from('newsletter_invii').delete().eq('id', id)
    router.refresh()
  }

  async function inviaEmail(n) {
    if (!n.pubblicata) { alert(t('pubblicaPrima')); return }
    const msg = n.email_inviata_il
      ? t('confermaRinvia', { data: new Date(n.email_inviata_il).toLocaleString(dl), n: totIscritti })
      : t('confermaInvia', { titolo: n.titolo, n: totIscritti })
    if (!confirm(msg)) return
    try {
      const res = await fetch('/api/newsletter/invia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }),
      })
      const data = await res.json()
      if (!res.ok) { alert(t('errore', { msg: data.error || t('invioFallito') })); return }
      alert(t('emailInviate', { sent: data.sent, total: data.total }))
      router.refresh()
    } catch (e) { alert(t('erroreRete', { msg: e.message })) }
  }

  const totIscritti = iscritti.filter((i) => i.attivo).length
  const newsletterInModifica = modificaId ? invii.find((n) => n.id === modificaId) : null

  return (
    <div className="lista-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="sub-intro" style={{ margin: 0 }}>{t.rich('iscrittiAttivi', { n: totIscritti, b: (ch) => <b>{ch}</b> })}</p>
        {!crea && !modificaId && <button className="btn-azione" type="button" onClick={() => setCrea(true)}>{t('nuovaNewsletterBtn')}</button>}
      </div>

      {crea && <EditorNL onSaved={() => { setCrea(false); router.refresh() }} onCancel={() => setCrea(false)} />}
      {newsletterInModifica && (
        <EditorNL
          newsletter={newsletterInModifica}
          onSaved={() => { setModificaId(null); router.refresh() }}
          onCancel={() => setModificaId(null)}
        />
      )}

      <div className="elenco-blocco">
        <h3>{t('newsletterPubblicate')}</h3>
        {invii.length === 0 && <p className="sub-intro">{t('nessunaNewsletter')}</p>}
        {invii.map((n) => (
          <div key={n.id} className={`lista-riga ${n.pubblicata ? '' : 'assente'}`}>
            <button
              type="button"
              onClick={() => { setModificaId(n.id); setCrea(false) }}
              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div style={{ fontWeight: 600 }}>{n.titolo}</div>
              <small style={{ color: 'var(--ink-soft)' }}>
                {n.pubblicata ? t('statoInviata', { data: new Date(n.inviata_il).toLocaleDateString(dl) }) : t('statoBozza')}
                {' · '}{t('nSezioni', { n: (n.contenuto ?? []).length })}
                {n.email_inviata_il ? ' · ' + t('emailInviataTag') : ''}
              </small>
            </button>
            <button type="button" className="btn-mini" onClick={() => window.open(`/api/newsletter/anteprima?id=${n.id}`, '_blank')}>{t('anteprimaEmail')}</button>
            {!n.pubblicata && <button type="button" className="btn-mini" onClick={() => pubblica(n.id)}>{t('pubblicaBtn')}</button>}
            {n.pubblicata && <button type="button" className="btn-mini" onClick={() => inviaEmail(n)}>{n.email_inviata_il ? t('rinviaEmail') : t('inviaEmail')}</button>}
            <button type="button" className="btn-mini btn-del" onClick={() => elimina(n.id)}>{t('elimina')}</button>
          </div>
        ))}
      </div>

      <div className="elenco-blocco">
        <h3>{t('iscritti', { n: totIscritti })}</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13, color: 'var(--ink-soft)' }}>
          {iscritti.map((i) => (
            <div key={i.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--linea)', opacity: i.attivo ? 1 : 0.4 }}>
              {i.email}{!i.attivo && ' ' + t('disiscritto')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
