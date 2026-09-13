'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function ValutazionePortiere({ allenamentoId, portiereId, presente, votoIniziale, feedbackIniziale, notaIniziale }) {
  const t = useTranslations('valutazionePortiere')
  const [voto, setVoto] = useState(votoIniziale ?? 0)
  const [feedback, setFeedback] = useState(feedbackIniziale ?? '')
  const [nota, setNota] = useState(notaIniziale ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function salva() {
    setBusy(true); setError('')
    const supabase = createClient()
    // RPC sicura: registra il VOTO DEL PORTIERE sull'allenamento (gradimento
    // 1-5 + feedback/nota). Scrive SOLO questi campi, mai presente/voto del
    // coach, e crea la riga se manca. Il portiere è ricavato lato server da auth.
    const { error } = await supabase.rpc('salva_valutazione_portiere', {
      p_allenamento: allenamentoId,
      p_voto: voto || null,
      p_feedback: feedback || null,
      p_nota: nota || null,
    })
    if (error) { setError(error.message); setBusy(false); return }
    setDone(true); setBusy(false)
  }

  const stellaStyle = (on) => ({ fontSize: '2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: on ? '#f2b705' : 'var(--linea)', padding: '0 2px' })

  return (
    <div className="scheda">
      <div className="field field-full">
        <label>{t('tuoVoto')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" style={stellaStyle(n <= voto)} onClick={() => { setVoto(n); setDone(false) }} aria-label={t('stelle', { n })}>&#9733;</button>
          ))}
          {voto > 0 && <button type="button" className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setVoto(0); setDone(false) }}>{t('azzera')}</button>}
        </div>
      </div>
      <div className="field field-full">
        <label>{t('feedbackLabel')}</label>
        <textarea rows="3" value={feedback} onChange={(e) => { setFeedback(e.target.value); setDone(false) }} placeholder={t('feedbackPlaceholder')} />
      </div>
      <div className="field field-full">
        <label>{t('notaLabel')}</label>
        <textarea rows="3" value={nota} onChange={(e) => { setNota(e.target.value); setDone(false) }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={salva} disabled={busy}>{busy ? t('salvataggio') : done ? t('salvato') : t('salva')}</button>
      </div>
    </div>
  )
}
