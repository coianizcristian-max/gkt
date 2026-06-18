'use client'

import { useState } from 'react'

const PAGE = 10

export default function FeedbackAllenamento({ feedback }) {
  const [pagina, setPagina] = useState(1)
  const totali = feedback.length
  const totPagine = Math.ceil(totali / PAGE)
  const slice = feedback.slice((pagina - 1) * PAGE, pagina * PAGE)

  return (
    <div className="scheda">
      <p className="sub-intro">Commenti e valutazioni lasciati dai portieri per questa seduta.</p>
      {slice.map((f, i) => (
        <div key={i} className="feedback-riga">
          <div className="feedback-head">
            <span className="feedback-nome">{f.nome}</span>
            {f.voto != null && (
              <span className="feedback-voto">voto seduta: <b>{f.voto}</b></span>
            )}
            {!f.presente && <span className="feedback-assente">assente</span>}
          </div>
          {f.testo && <div className="feedback-testo">{f.testo}</div>}
          {f.nota && <div className="feedback-nota"><em>Nota privata: {f.nota}</em></div>}
        </div>
      ))}
      {totPagine > 1 && (
        <div className="pag-bar" style={{ marginTop: 12 }}>
          {Array.from({ length: totPagine }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`pag-btn ${p === pagina ? 'active' : ''}`}
              onClick={() => setPagina(p)}
            >{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
