'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { MODULI_PERMESSI, LIVELLI, permessiDiDefault } from '@/lib/permessi'
import PaywallBanner from '@/app/components/PaywallBanner'

function LinkModal({ url, onClose }) {
  const t = useTranslations('invitiManager')
  const [copiato, setCopiato] = useState(false)
  async function copia() {
    try { await navigator.clipboard.writeText(url); setCopiato(true); setTimeout(() => setCopiato(false), 2000) }
    catch { const el = document.getElementById('link-invito-input'); if (el) { el.select(); el.setSelectionRange(0, 99999) } }
  }
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="popup-close" onClick={onClose} type="button">X</button>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>{t('linkTitolo')}</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>{t('linkDesc')}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input id="link-invito-input" readOnly value={url} onClick={(e) => e.target.select()}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', fontSize: 13, background: 'var(--carta)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }} />
          <button className="btn" onClick={copia} type="button" style={{ flexShrink: 0 }}>{copiato ? t('copiato') : t('copia')}</button>
        </div>
      </div>
    </div>
  )
}

export default function InvitiManager({ inviti: invitiIniziali, portieri, stagioneId, canStaff = true }) {
  const t = useTranslations('invitiManager')
  const router = useRouter()
  const [inviti, setInviti] = useState(invitiIniziali)
  const [tipo, setTipo] = useState('')
  const [portiereId, setPortiereId] = useState('')
  const [permessi, setPermessi] = useState(permessiDiDefault)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalUrl, setModalUrl] = useState(null)
  const [collegaEmail, setCollegaEmail] = useState('')
  const [collegaPortiereId, setCollegaPortiereId] = useState('')
  const [collegaBusy, setCollegaBusy] = useState(false)
  const [collegaMsg, setCollegaMsg] = useState('')
  const [collegaErr, setCollegaErr] = useState('')

  const linkOf = (token) => `${window.location.origin}/registrati?invito=${token}`
  const nomePortiere = (id) => { const p = portieri.find((x) => x.id === id); return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : '' }

  async function crea() {
    setError(''); setBusy(true)
    try {
      const supabase = createClient()
      const token = crypto.randomUUID()
      const payload = { token, stagione_id: stagioneId, tipo, stato: 'attivo' }
      if (tipo === 'portiere') {
        if (!portiereId) { setError(t('selezionaPortiere')); setBusy(false); return }
        payload.portiere_id = portiereId
      }
      if ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff) {
        setError(t('nonDisponibile')); setBusy(false); return
      }
      if (tipo === 'collaboratore') payload.permessi = permessi
      const { error: insErr } = await supabase.from('inviti').insert(payload)
      if (insErr) { setError(insErr.message); setBusy(false); return }
      const { data: nuoviInviti } = await supabase.from('inviti').select('*').eq('stagione_id', stagioneId).order('created_at', { ascending: false })
      setInviti(nuoviInviti ?? [])
      setTipo(''); setPortiereId(''); setPermessi(permessiDiDefault)
      setModalUrl(linkOf(token))
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  async function revoca(id) {
    const supabase = createClient()
    await supabase.from('inviti').update({ stato: 'revocato' }).eq('id', id)
    setInviti((prev) => prev.map((i) => i.id === id ? { ...i, stato: 'revocato' } : i))
  }
  async function elimina(id) {
    const supabase = createClient()
    await supabase.from('inviti').delete().eq('id', id)
    setInviti((prev) => prev.filter((i) => i.id !== id))
  }

  async function collega() {
    setCollegaErr(''); setCollegaMsg(''); setCollegaBusy(true)
    try {
      const res = await fetch('/api/collega-portiere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: collegaEmail.trim(), portiere_id: collegaPortiereId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setCollegaErr(body.error || t('collegaErrGenerico')); setCollegaBusy(false); return }
      setCollegaMsg(t('collegaOk', { nome: body.nome || '' }))
      setCollegaEmail(''); setCollegaPortiereId('')
      router.refresh()
    } catch (e) {
      setCollegaErr(e.message || t('collegaErrGenerico'))
    }
    setCollegaBusy(false)
  }

  return (
    <div className="lista-editor">
      {modalUrl && <LinkModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      <p className="sub-intro">{t('intro')}</p>

      <div className="scheda">
        {error && <div className="err">{error}</div>}
        <div className="form-grid">
          <div className="field" style={{ border: tipo ? 'none' : '2px solid var(--azzurro)', borderRadius: tipo ? 0 : 'var(--r)', padding: tipo ? 0 : '10px 12px', background: tipo ? 'transparent' : 'rgba(10,126,194,0.04)', transition: 'all 0.2s' }}>
            {!tipo && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azzurro)', marginBottom: 6 }}>{t('selezionaChi')}</div>}
            <label>{t('tipo')} <span style={{ color: 'var(--rosso)' }}>*</span></label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ border: tipo ? '' : '1px solid var(--azzurro)', fontWeight: tipo ? 'normal' : '600' }}>
              <option value="" disabled>{t('selezionaTipo')}</option>
              <option value="portiere">{t('tipoPortiere')}</option>
              <option value="collaboratore">{canStaff ? t('tipoStaff') : t('tipoStaffLock')}</option>
              <option value="preparatore">{canStaff ? t('tipoPreparatore') : t('tipoPreparatoreLock')}</option>
            </select>
          </div>

          {!canStaff && (tipo === 'collaboratore' || tipo === 'preparatore') && (
            <PaywallBanner chiave="inviti_staff" label={t('paywallLabel')} />
          )}

          {tipo === 'portiere' && (
            <div className="field"><label>{t('portiere')}</label>
              <select value={portiereId} onChange={(e) => setPortiereId(e.target.value)}>
                <option value="">{t('selezionaPortiereOpt')}</option>
                {portieri.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>)}
              </select>
            </div>
          )}

          {tipo === 'collaboratore' && (
            <div className="field">
              <label>{t('permessiLabel')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {MODULI_PERMESSI.map((mod) => (
                  <div key={mod.chiave} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{mod.label}</span>
                    <select value={permessi[mod.chiave] ?? 'nessuno'}
                      onChange={(e) => setPermessi((prev) => ({ ...prev, [mod.chiave]: e.target.value }))}
                      style={{ fontSize: 13, padding: '4px 8px' }}>
                      {LIVELLI.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tipo === 'preparatore' && (
            <div className="field" style={{ background: 'rgba(10,126,194,0.04)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>{t('preparatoreInfo')}</p>
            </div>
          )}

          <div className="field">
            <button className="btn" onClick={crea}
              disabled={busy || !tipo || (tipo === 'portiere' && !portiereId) || ((tipo === 'collaboratore' || tipo === 'preparatore') && !canStaff)}
              type="button">
              {busy ? t('creazione') : t('creaInvito')}
            </button>
          </div>
        </div>
      </div>

      <div className="scheda" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t('collegaTitolo')}</h3>
        <p className="sub-intro">{t('collegaIntro')}</p>
        {collegaErr && <div className="err">{collegaErr}</div>}
        {collegaMsg && <div className="ok-msg">{collegaMsg}</div>}
        <div className="form-grid">
          <div className="field">
            <label>{t('portiere')}</label>
            <select value={collegaPortiereId} onChange={(e) => setCollegaPortiereId(e.target.value)}>
              <option value="">{t('selezionaPortiereOpt')}</option>
              {portieri.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('collegaEmail')}</label>
            <input type="email" value={collegaEmail} onChange={(e) => setCollegaEmail(e.target.value)}
              placeholder="nome@email.com" autoComplete="off" />
          </div>
          <div className="field">
            <button className="btn" type="button"
              disabled={collegaBusy || !collegaPortiereId || !collegaEmail.trim()}
              onClick={collega}>
              {collegaBusy ? t('collegaBusy') : t('collegaBtn')}
            </button>
          </div>
        </div>
      </div>

      <div className="elenco-blocco">
        <h3>{t('invitiCreati')}</h3>
        {inviti.length === 0 && <p className="sub-intro">{t('nessunInvito')}</p>}
        {inviti.map((inv) => (
          <div className={`lista-riga ${inv.stato === 'attivo' ? '' : 'assente'}`} key={inv.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {inv.tipo === 'portiere' ? t('tipoPortiere') : inv.tipo === 'collaboratore' ? t('badgeStaff') : t('badgePreparatore')}
                {inv.portiere_id ? ` · ${nomePortiere(inv.portiere_id)}` : ''}
                {inv.tipo === 'preparatore' && inv.nome_consumatore ? ` · ${inv.nome_consumatore}` : ''}
              </div>
              {inv.email_invitato ? <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontSize: 12 }}>{inv.email_invitato}</span> : null}
              <small>
                {inv.stato === 'attivo' ? t('statoAttivo') : inv.stato === 'consumato' ? t('statoUsato') : t('statoRevocato')}
                {inv.consumato_da && !inv.nome_consumatore ? ' · ' + t('collegato') : inv.consumato_da && inv.tipo !== 'preparatore' ? ' · ' + t('collegato') : ''}
              </small>
            </div>
            {inv.stato === 'attivo' && <button className="btn-mini" onClick={() => setModalUrl(linkOf(inv.token))} type="button">{t('link')}</button>}
            {inv.stato === 'attivo' && <button className="btn-mini" onClick={() => revoca(inv.id)} type="button">{t('revoca')}</button>}
            <button className="btn-mini btn-del" onClick={() => elimina(inv.id)} type="button">{t('elimina')}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
