'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ValutazionePortiere({ allenamentoId, portiereId, presente, votoIniziale, feedbackIniziale, notaIniziale }) {
  const [voto, setVoto] = useState(votoIniziale ?? 0)
  const [feedback, setFeedback] = useState(feedbackIniziale ?? '')
  const [nota, setNota] = useState(notaIniziale ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!presente) {
    return (
      <div className="scheda">
        <p className="sub-intro">Non risulti presente a questo allenamento, quindi non c&apos;e&apos; nulla da valutare.</p>
      </div>
    )
  }

  async function salva() {
    setBusy(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.from('valutazioni')
      .update({
        voto_portiere: voto || null,
        feedback_portiere: feedback || null,
        nota_portiere: nota || null,
      })
      .eq('allenamento_id', allenamentoId).eq('portiere_id', portiereId)
    if (error) { setError(error.message); setBusy(false); return }
    setDone(true); setBusy(false)
  }

  const stellaStyle = (on) => ({
    fontSize: '2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer',
    color: on ? '#f2b705' : 'var(--linea)', padding: '0 2px',
  })

  return (
    <div className="scheda">
      <div className="field field-full">
        <label>Il tuo voto all&apos;allenamento</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" style={stellaStyle(n <= voto)} onClick={() => { setVoto(n); setDone(false) }} aria-label={`${n} stelle`}>&#9733;</button>
          ))}
          {voto > 0 && <button type="button" className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setVoto(0); setDone(false) }}>Azzera</button>}
        </div>
      </div>
      <div className="field field-full">
        <label>Feedback per l&apos;allenatore (facoltativo)</label>
        <textarea rows="3" value={feedback} onChange={(e) => { setFeedback(e.target.value); setDone(false) }} placeholder="Cosa e' andato bene, cosa vorresti migliorare..." />
      </div>
      <div className="field field-full">
        <label>Nota personale (visibile solo a te)</label>
        <textarea rows="3" value={nota} onChange={(e) => { setNota(e.target.value); setDone(false) }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={salva} disabled={busy}>{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva valutazione'}</button>
      </div>
    </div>
  )
}