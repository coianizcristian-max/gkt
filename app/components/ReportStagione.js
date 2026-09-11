'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function ReportStagione({ portiereId, stagioneId, soloPortiere, commentoIniziale, canReport = true }) {
  const t = useTranslations('reportStagione')
  const [commentoAllenatore, setCommentoAllenatore] = useState(commentoIniziale.allenatore ?? '')
  const [commentoPortiere, setCommentoPortiere] = useState(commentoIniziale.portiere ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function salvaCommento() {
    setBusy(true)
    const supabase = createClient()
    const payload = { portiere_id: portiereId, stagione_id: stagioneId }
    if (soloPortiere) payload.commento_portiere = commentoPortiere
    else payload.commento_allenatore = commentoAllenatore
    const { error } = await supabase.from('report_commenti').upsert(payload, { onConflict: 'portiere_id,stagione_id' })
    if (error) alert(t('errore', { msg: error.message }))
    else setSaved(true)
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>{t('titolo')}</h3>
      <p className="sub-intro" style={{ marginTop: 0 }}>{t('intro')}</p>

      {!soloPortiere && (
        <div className="field">
          <label>{t('commentoAllenatore')}</label>
          <textarea rows="3" value={commentoAllenatore}
            onChange={(e) => { setCommentoAllenatore(e.target.value); setSaved(false) }}
            placeholder={t('phAllenatore')} />
        </div>
      )}
      {soloPortiere && (
        <div className="field">
          <label>{t('tuoCommento')}</label>
          <textarea rows="3" value={commentoPortiere}
            onChange={(e) => { setCommentoPortiere(e.target.value); setSaved(false) }}
            placeholder={t('phPortiere')} />
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={salvaCommento} disabled={busy} type="button">
          {busy ? t('salvataggio') : saved ? t('salvato') : t('salvaCommento')}
        </button>
        {canReport
          ? <a className="btn" href={`/api/report-stagione?portiere_id=${portiereId}`} target="_blank" rel="noopener noreferrer">{t('scaricaPdf')}</a>
          : <a className="btn-ghost" href="/abbonati" style={{ color: 'var(--ink-soft)' }}>{t('pdfLocked')}</a>}
      </div>
    </div>
  )
}
