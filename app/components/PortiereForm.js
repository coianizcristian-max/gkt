'use client'

import { useState } from 'react'
import { comprimiImmagine, MISURE, CACHE_LUNGA } from '@/lib/immagini'
import { piedeTradotto } from '@/lib/elenchi'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'

export default function PortiereForm({ portiere, iscrizione, categorie, stagioneId, piedi = [], soloPortiere = false, attributiDef = [], attributiValori = {}, infortunioAperto = null }) {
  const router = useRouter()
  const isEdit = !!portiere
  const t = useTranslations('portiereForm')
  const c = useTranslations('common')
  const [attrVal, setAttrVal] = useState(() => {
    const init = {}
    for (const a of attributiDef) init[a.id] = attributiValori[a.id] ?? ''
    return init
  })
  const [f, setF] = useState({
    nome: portiere?.nome ?? '',
    cognome: portiere?.cognome ?? '',
    data_nascita: portiere?.data_nascita ?? '',
    luogo_nascita: portiere?.luogo_nascita ?? '',
    indirizzo: portiere?.indirizzo ?? '',
    telefono: portiere?.telefono ?? '',
    contatto_genitore: portiere?.contatto_genitore ?? '',
    altezza_cm: portiere?.altezza_cm ?? '',
    peso_kg: portiere?.peso_kg ?? '',
    piede: portiere?.piede ?? '',
    squadra_provenienza: portiere?.squadra_provenienza ?? '',
    note: portiere?.note ?? '',
    squadra_id: iscrizione?.squadra_id ?? (categorie[0]?.id ?? ''),
    numero_maglia: iscrizione?.numero_maglia ?? '',
  })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(portiere?.foto_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confermaMinori, setConfermaMinori] = useState(false)
  const locale = useLocale()
  const [lingua, setLingua] = useState(locale)

  // ── Infortunio ────────────────────────────────────────────────────────────
  const oggi = new Date().toISOString().slice(0, 10)
  const [inf, setInf] = useState(infortunioAperto)
  const [infOpen, setInfOpen] = useState(false)
  const [infStart, setInfStart] = useState(oggi)
  const [infRientro, setInfRientro] = useState('')
  const [infFine, setInfFine] = useState(oggi)
  const [infBusy, setInfBusy] = useState(false)
  const [infErr, setInfErr] = useState('')
  const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT') : '')

  async function registraInfortunio() {
    if (!iscrizione?.id) return
    setInfErr(''); setInfBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('infortuni').insert({
        iscrizione_id: iscrizione.id,
        data_inizio: infStart || oggi,
        data_rientro_prevista: infRientro || null,
      }).select('id, data_inizio, data_rientro_prevista').single()
      if (error) throw error
      setInf(data); setInfOpen(false)
      router.refresh()
    } catch (err) { setInfErr(err.message || t('erroreSalvaInfortunio')) }
    setInfBusy(false)
  }

  async function terminaInfortunio() {
    if (!inf?.id) return
    setInfErr(''); setInfBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('infortuni').update({ data_fine: infFine || oggi }).eq('id', inf.id)
      if (error) throw error
      setInf(null)
      router.refresh()
    } catch (err) { setInfErr(err.message || t('erroreChiusuraInfortunio')) }
    setInfBusy(false)
  }

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const tornaIndietro = () => router.push(soloPortiere && portiere ? `/portieri/${portiere.id}` : '/portieri')

  function onFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const num = (v) => (v === '' || v === null ? null : Number(v))

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!soloPortiere && !f.nome.trim()) { setError(t('erroreNomeObbligatorio')); return }
    if (!soloPortiere && !f.squadra_id) { setError(t('erroreCategoria')); return }
    if (!soloPortiere && !isEdit && !confermaMinori) { setError(t('erroreMinoriConferma')); return }
    setSaving(true)
    const supabase = createClient()

    // Campi anagrafici modificabili. Per il portiere NON includiamo nome/cognome (bloccati).
    const anagrafica = {
      data_nascita: f.data_nascita || null,
      luogo_nascita: f.luogo_nascita || null,
      indirizzo: f.indirizzo || null,
      telefono: f.telefono || null,
      contatto_genitore: f.contatto_genitore || null,
      altezza_cm: num(f.altezza_cm),
      peso_kg: num(f.peso_kg),
      piede: f.piede || null,
      squadra_provenienza: f.squadra_provenienza || null,
      note: f.note || null,
    }
    if (!soloPortiere) {
      anagrafica.nome = f.nome.trim()
      anagrafica.cognome = f.cognome.trim() || null
    }

    try {
      let portiereId = portiere?.id
      if (isEdit) {
        const { error } = await supabase.from('portieri').update(anagrafica).eq('id', portiereId)
        if (error) throw error
      } else {
        // Passo B (isolamento per tenant): il portiere NUOVO nasce gia' con
        // allenatore_id = proprietario del tenant. Fonte primaria: owner della
        // stagione (come il backfill). Ripiego: profilo dell'utente loggato.
        let ownerId = null
        if (stagioneId) {
          const { data: st } = await supabase.from('stagioni').select('owner_id').eq('id', stagioneId).maybeSingle()
          ownerId = st?.owner_id ?? null
        }
        if (!ownerId) {
          const { data: auth } = await supabase.auth.getUser()
          if (auth?.user) {
            const { data: prof } = await supabase.from('profili').select('id, allenatore_id').eq('id', auth.user.id).maybeSingle()
            ownerId = prof?.allenatore_id ?? prof?.id ?? auth.user.id
          }
        }
        const { data, error } = await supabase.from('portieri').insert({ ...anagrafica, allenatore_id: ownerId }).select('id').single()
        if (error) throw error
        portiereId = data.id
      }

      // Foto
      if (fotoFile) {
        const img = await comprimiImmagine(fotoFile, MISURE.profilo)
        const path = `${portiereId}/${Date.now()}.${img.ext}`
        const { error: upErr } = await supabase.storage
          .from('foto-portieri').upload(path, img.blob, { upsert: true, contentType: img.contentType, cacheControl: CACHE_LUNGA })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('foto-portieri').getPublicUrl(path)
        await supabase.from('portieri').update({ foto_url: pub.publicUrl }).eq('id', portiereId)
      }

      // Iscrizione (categoria + maglia): solo staff. Il portiere non puo' cambiarla.
      if (!soloPortiere) {
        const iscr = {
          portiere_id: portiereId,
          stagione_id: stagioneId,
          squadra_id: f.squadra_id,
          numero_maglia: num(f.numero_maglia),
        }
        const { error: iErr } = await supabase
          .from('iscrizioni')
          .upsert(iscr, { onConflict: 'portiere_id,stagione_id' })
        if (iErr) throw iErr
      }

      // Attributi dinamici (definiti dal Supervisore)
      if (attributiDef.length > 0) {
        const rows = attributiDef
          .filter((a) => attrVal[a.id] !== '' && attrVal[a.id] != null)
          .map((a) => ({
            portiere_id: portiereId,
            attributo_id: a.id,
            valore_testo: a.tipo === 'testo' ? String(attrVal[a.id]) : null,
            valore_num: a.tipo !== 'testo' ? Number(attrVal[a.id]) : null,
          }))
        if (rows.length) {
          const { error: attrErr } = await supabase
            .from('portiere_attributi')
            .upsert(rows, { onConflict: 'portiere_id,attributo_id' })
          if (attrErr) throw attrErr
        }
      }

      if (soloPortiere) {
        try { await fetch('/api/set-lingua', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lingua }) }) } catch (e) {}
        router.push(`/portieri/${portiereId}`, lingua !== locale ? { locale } : undefined); router.refresh()
      }
      else { router.push('/portieri'); router.refresh() }
    } catch (err) {
      setError(err.message || t('erroreSalvataggio'))
      setSaving(false)
    }
  }

  return (
    <form className="scheda" onSubmit={save}>
      {error && <div className="err">{error}</div>}
      {soloPortiere && <p className="sub-intro">{t('introPortiere')}</p>}
      {soloPortiere && (
        <div className="field" style={{ maxWidth: 240 }}><label>{t('linguaPreferita')}</label>
          <select value={lingua} onChange={(e) => setLingua(e.target.value)}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>
      )}

      {/* ── Stato infortunio (solo staff, richiede un'iscrizione) ── */}
      {!soloPortiere && iscrizione?.id && (
        <div style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 10, padding: 12, marginBottom: 14, background: inf ? '#fff4f4' : 'var(--bg-soft, #fafafa)' }}>
          {inf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#c0392b' }}>{t('infortunato')}</span>
              <span style={{ color: 'var(--ink-soft)' }}>
                {t('dal')} {fmt(inf.data_inizio)}{inf.data_rientro_prevista ? t('rientroPrevistoSuffix', { data: fmt(inf.data_rientro_prevista) }) : ''}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('rientro')}</label>
                <input type="date" value={infFine} onChange={(e) => setInfFine(e.target.value)} />
                <button type="button" className="btn-mini" disabled={infBusy} onClick={terminaInfortunio}>
                  {infBusy ? '…' : t('terminaInfortunio')}
                </button>
              </div>
            </div>
          ) : infOpen ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{t('registraInfortunio')}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
                <div className="field"><label>{t('inizio')}</label>
                  <input type="date" value={infStart} onChange={(e) => setInfStart(e.target.value)} /></div>
                <div className="field"><label>{t('rientroPrevistoOpz')}</label>
                  <input type="date" value={infRientro} onChange={(e) => setInfRientro(e.target.value)} /></div>
                <button type="button" className="btn" disabled={infBusy || !infStart} onClick={registraInfortunio}>
                  {infBusy ? t('salvataggio') : t('registra')}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setInfOpen(false)}>{c('annulla')}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--ink-soft)' }}>{t('disponibile')}</span>
              <button type="button" className="btn-mini" style={{ marginLeft: 'auto' }} onClick={() => setInfOpen(true)}>
                {t('segnaInfortunio')}
              </button>
            </div>
          )}
          {infErr && <div className="err" style={{ marginTop: 8 }}>{infErr}</div>}
        </div>
      )}

      <div className="scheda-foto">
        <div className="foto-box">
          {fotoPreview
            ? <img src={fotoPreview} alt="" />
            : <span className="foto-ph">{t('nessunaFoto')}</span>}
        </div>
        <label className="foto-upload">
          {fotoPreview ? t('cambiaFoto') : t('caricaFoto')}
          <input type="file" accept="image/*" onChange={onFoto} hidden />
        </label>
      </div>

      <div className="form-grid">
        <div className="field"><label>{t('nome')}</label>
          <input value={f.nome} onChange={upd('nome')} required disabled={soloPortiere} /></div>
        <div className="field"><label>{t('cognome')}</label>
          <input value={f.cognome} onChange={upd('cognome')} disabled={soloPortiere} /></div>

        <div className="field"><label>{t('categoria')}</label>
          <select value={f.squadra_id} onChange={upd('squadra_id')} required disabled={soloPortiere}>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        <div className="field"><label>{t('numeroMaglia')}</label>
          <input type="number" value={f.numero_maglia} onChange={upd('numero_maglia')} disabled={soloPortiere} /></div>

        <div className="field"><label>{t('dataNascita')}</label>
          <input type="date" value={f.data_nascita} onChange={upd('data_nascita')} /></div>
        <div className="field"><label>{t('luogoNascita')}</label>
          <input value={f.luogo_nascita} onChange={upd('luogo_nascita')} /></div>

        <div className="field"><label>{t('altezza')}</label>
          <input type="number" value={f.altezza_cm} onChange={upd('altezza_cm')} /></div>
        <div className="field"><label>{t('peso')}</label>
          <input type="number" step="0.1" value={f.peso_kg} onChange={upd('peso_kg')} /></div>

        <div className="field"><label>{t('piedePreferito')}</label>
          <select value={f.piede} onChange={upd('piede')}>
            <option value="">—</option>
            {piedi.map((p) => <option key={p} value={p}>{piedeTradotto(p, locale)}</option>)}
          </select></div>
        <div className="field"><label>{t('squadraProvenienza')}</label>
          <input value={f.squadra_provenienza} onChange={upd('squadra_provenienza')} /></div>

        <div className="field"><label>{t('indirizzo')}</label>
          <input value={f.indirizzo} onChange={upd('indirizzo')} /></div>
        <div className="field"><label>{t('telefono')}</label>
          <input value={f.telefono} onChange={upd('telefono')} /></div>

        <div className="field"><label>{t('contattoGenitore')}</label>
          <input value={f.contatto_genitore} onChange={upd('contatto_genitore')} /></div>
        <div className="field field-full"><label>{t('note')}</label>
          <textarea rows="3" value={f.note} onChange={upd('note')} /></div>
      </div>

      {!soloPortiere && (
        <div style={{ margin: '4px 0 8px', padding: '12px 14px', borderRadius: 8, background: 'rgba(10,126,194,0.06)', border: '1px solid rgba(10,126,194,0.25)' }}>
          <strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('minoriTitolo')}</strong>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>{t('minoriInfo')}</p>
          {!isEdit && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink)', marginTop: 10 }}>
              <input type="checkbox" checked={confermaMinori} onChange={(e) => setConfermaMinori(e.target.checked)} required style={{ marginTop: 2 }} />
              <span>{t('minoriConferma')}</span>
            </label>
          )}
        </div>
      )}

      {attributiDef.length > 0 && (
        <div className="form-grid" style={{ marginTop: 4 }}>
          <div className="field-full" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>
            {t('caratteristiche')}
          </div>
          {attributiDef.map((a) => (
            <div className="field" key={a.id}>
              <label>{a.nome}{a.tipo === 'scala' ? ` (${a.scala_min}–${a.scala_max})` : ''}</label>
              {a.tipo === 'testo' ? (
                <input value={attrVal[a.id] ?? ''} onChange={(e) => setAttrVal((s) => ({ ...s, [a.id]: e.target.value }))} />
              ) : (
                <input type="number" min={a.tipo === 'scala' ? a.scala_min : undefined} max={a.tipo === 'scala' ? a.scala_max : undefined}
                  value={attrVal[a.id] ?? ''} onChange={(e) => setAttrVal((s) => ({ ...s, [a.id]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={tornaIndietro}>{c('annulla')}</button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? t('salvataggio') : (isEdit ? t('salvaModifiche') : t('creaPortiere'))}
        </button>
      </div>
    </form>
  )
}
