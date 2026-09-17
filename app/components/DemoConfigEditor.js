'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/** Pannello supervisore: accende/spegne la demo e imposta la data di taglio. */
export default function DemoConfigEditor({ cfg, righe, riepilogo, stagioni = [] }) {
  const t = useTranslations('demoConfig')
  const [attiva, setAttiva] = useState(cfg.attiva === 'true')
  const [dataTaglio, setDataTaglio] = useState(cfg.data_taglio ?? '')
  const [stagioneId, setStagioneId] = useState(cfg.stagione_id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [esito, setEsito] = useState(null)

  async function salva(patch) {
    setSalvando(true); setEsito(null)
    try {
      const r = await fetch('/api/demo-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await r.json()
      setEsito(r.ok ? 'ok' : (j.error || 'errore'))
    } catch {
      setEsito('errore')
    }
    setSalvando(false)
  }

  function cambiaAttiva(v) {
    setAttiva(v)
    salva({ attiva: v ? 'true' : 'false' })
  }

  return (
    <div className="scheda" style={{ maxWidth: 640 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        border: '1px solid var(--linea)', borderRadius: 'var(--r)',
        background: attiva ? 'rgba(31,138,76,0.08)' : 'var(--carta)', marginBottom: 18,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{attiva ? t('statoAttiva') : t('statoSpenta')}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {attiva ? t('statoAttivaNota') : t('statoSpentaNota')}
          </div>
        </div>
        <button type="button" className="btn" disabled={salvando}
          onClick={() => cambiaAttiva(!attiva)}>
          {attiva ? t('spegni') : t('accendi')}
        </button>
      </div>

      <div className="campo">
        <label htmlFor="demo-data">{t('dataTaglio')}</label>
        <input id="demo-data" type="date" value={dataTaglio}
          onChange={(e) => setDataTaglio(e.target.value)} />
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{t('dataTaglioNota')}</p>
      </div>

      <div className="campo">
        <label htmlFor="demo-stagione">{t('stagione')}</label>
        <select id="demo-stagione" value={stagioneId} onChange={(e) => setStagioneId(e.target.value)}>
          <option value="">{t('stagioneAuto')}</option>
          {stagioni.map((s) => (
            <option key={s.id} value={s.id}>
              {(s.societa_nome ? s.societa_nome + ' — ' : '') + s.nome}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{t('stagioneNota')}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button type="button" className="btn" disabled={salvando}
          onClick={() => salva({ data_taglio: dataTaglio, stagione_id: stagioneId })}>
          {salvando ? t('salvataggio') : t('salva')}
        </button>
        {esito === 'ok' && <span style={{ color: 'var(--campo)', fontSize: 13 }}>{t('salvato')}</span>}
        {esito && esito !== 'ok' && <span style={{ color: 'var(--rosso)', fontSize: 13 }}>{esito}</span>}
      </div>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--linea)' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('utenteDemo')}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {cfg.owner_email}
          {riepilogo
            ? ` · ${t('riepilogo', { stagioni: riepilogo.nStagioni, portieri: riepilogo.nPortieri, esercizi: riepilogo.nEsercizi })}`
            : ` · ${t('utenteNonTrovato')}`}
        </div>
      </div>
    </div>
  )
}
