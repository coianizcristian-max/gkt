'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportStagione({ portiereId, stagioneId, soloPortiere, commentoIniziale, canReport = true }) {
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
    if (error) alert('Errore: ' + error.message)
    else setSaved(true)
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>📄 Report di fine stagione</h3>
      <p className="sub-intro" style={{ marginTop: 0 }}>
        Aggiungi un commento e scarica il report completo in PDF con statistiche, obiettivi raggiunti e non raggiunti.
      </p>

      {!soloPortiere && (
        <div className="field">
          <label>Commento allenatore</label>
          <textarea rows="3" value={commentoAllenatore}
            onChange={(e) => { setCommentoAllenatore(e.target.value); setSaved(false) }}
            placeholder="Note di fine stagione, valutazione generale, indicazioni per il prossimo anno…" />
        </div>
      )}
      {soloPortiere && (
        <div className="field">
          <label>Il tuo commento</label>
          <textarea rows="3" value={commentoPortiere}
            onChange={(e) => { setCommentoPortiere(e.target.value); setSaved(false) }}
            placeholder="Come valuti la tua stagione? Cosa vorresti migliorare?" />
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={salvaCommento} disabled={busy} type="button">
          {busy ? 'Salvataggio…' : saved ? 'Salvato ✓' : 'Salva commento'}
        </button>
        {canReport
          ? <a className="btn" href={`/api/report-stagione?portiere_id=${portiereId}`} target="_blank" rel="noopener noreferrer">
              ⬇ Scarica report PDF
            </a>
          : <a className="btn-ghost" href="/abbonati" style={{ color: 'var(--ink-soft)' }}>
              🔒 Report PDF — abbonati per sbloccare
            </a>}
      </div>
    </div>
  )
}
