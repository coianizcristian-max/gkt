'use client'

import { useState } from 'react'
import Image from 'next/image'
import Guida from '@/app/components/Guida'
import Link from 'next/link'

const fmt = (n, dec = 2) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec }))

export default function StatisticheClient({ stats, categorieOrd, byCat, feedbackStats, feedback, isPortiere, myPortiereId, canExport = true }) {
  const [tab, setTab] = useState('portieri')
  const [expCat, setExpCat] = useState('tutte')
  const [expMese, setExpMese] = useState('tutti')

  // Opzioni mese: ultimi 12 mesi (YYYY-MM + etichetta in italiano)
  const mesiOpzioni = []
  const _oggi = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(_oggi.getFullYear(), _oggi.getMonth() - i, 1)
    mesiOpzioni.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    })
  }

  const selStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bordo, #d0d7dd)', background: '#fff', fontSize: 14, color: 'var(--ink, #14202b)' }

  function esportaPdf() {
    const params = new URLSearchParams({ mese: expMese, categoria: expCat })
    window.open(`/api/statistiche-pdf?${params.toString()}`, '_blank')
  }

  return (
    <>
      {!isPortiere && (
        <div className="sub-nav">
          <button type="button" className={`sub-nav-link ${tab === 'portieri' ? 'active' : ''}`} onClick={() => setTab('portieri')}>
            Portieri
          </button>
          <button type="button" className={`sub-nav-link ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
            Feedback ({feedbackStats.totFeedback})
          </button>
        </div>
      )}

      {!isPortiere && tab === 'portieri' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', margin: '4px 0 16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>Categoria</label>
            <select value={expCat} onChange={(e) => setExpCat(e.target.value)} style={selStyle}>
              <option value="tutte">Tutte le categorie</option>
              {categorieOrd.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>Periodo</label>
            <select value={expMese} onChange={(e) => setExpMese(e.target.value)} style={selStyle}>
              <option value="tutti">Tutta la stagione</option>
              {mesiOpzioni.map((m) => <option key={m.val} value={m.val}>{m.lbl}</option>)}
            </select>
          </div>
          {canExport
            ? <button type="button" className="btn" onClick={esportaPdf}>📄 Esporta PDF</button>
            : <a className="btn-ghost" href="/abbonati" style={{ color: 'var(--ink-soft)' }}>🔒 Esporta PDF — abbonati per sbloccare</a>}
        </div>
      )}

      {!isPortiere && tab === 'portieri' && (
        <Guida titolo="Come leggere le statistiche">
          La tabella mostra presenze, media voto allenatore e risultati in partita per ogni portiere.
          Le medie partite includono solo le gare ufficiali (campionato): le amichevoli sono escluse.
          Clicca sul nome di un portiere per vedere il dettaglio con andamento mensile e per caratteristica.
          Il tab &ldquo;Feedback&rdquo; mostra tutti i commenti scritti dai portieri nelle valutazioni.
          <p style={{marginTop:10}}>
            Le sessioni con <strong>infortunio</strong> sono escluse dalle medie (indicate con 🩹).
          </p>
        </Guida>
      )}
      {/* ── Tab Portieri ── */}
      {(tab === 'portieri' || isPortiere) && (
        <>
          {stats.length === 0 ? (
            <div className="empty">
              Nessun portiere iscritto alla stagione attiva.<br />
              <small style={{ color: 'var(--ink-soft)' }}>Verifica che ci sia una stagione attiva e che i portieri siano iscritti a una categoria.</small>
            </div>
          ) : (
            categorieOrd.map((cat) => {
              const lista = isPortiere
                ? (byCat[cat.id] ?? []).filter((s) => s.p.id === myPortiereId)
                : (byCat[cat.id] ?? [])
              if (lista.length === 0) return null
              return (
                <section key={cat.id}>
                  <div className="squadra-head">
                    <h2>{cat.nome}</h2>
                    <span className="conta">{lista.length} portieri</span>
                  </div>
                  <div className="stat-grid">
                    {lista.map((s) => (
                      <Link className="stat-card" key={s.p.id} href={`/portieri/${s.p.id}/statistiche`} style={{textDecoration:'none',display:'block',cursor:'pointer'}}>
                        <div className="stat-head">
                          <div className="stat-foto">
                            {s.p.foto_url ? <Image src={s.p.foto_url} alt="" fill sizes="52px" /> : <span>{(s.p.nome || '?').charAt(0)}</span>}
                          </div>
                          <div>
                            <div className="stat-nome">
                              {s.p.nome} {s.p.cognome ?? ''}
                            </div>
                            {s.p.numero_maglia ? <div className="stat-cat">#{s.p.numero_maglia}</div> : null}
                          </div>
                        </div>
                        <div className="stat-rows">
                          <div className="stat-block">
                            <h4>Allenamenti</h4>
                            <div className="stat-line"><span>Presenze</span><b>{s.presenze}/{s.disponibili ?? s.totAllen}{s.persi > 0 ? ` \u00b7 \ud83e\ude79${s.persi}` : ''}</b></div>
                            <div className="stat-line"><span>Media voto</span><b>{fmt(s.mediaA)}</b></div>
                          </div>
                          <div className="stat-block">
                            <h4>Partite (camp.)</h4>
                            <div className="stat-line"><span>Giocate</span><b>{s.nPartite}</b></div>
                            <div className="stat-line"><span>Media voto</span><b>{fmt(s.mediaP)}</b></div>
                            <div className="stat-line"><span>Clean sheet</span><b>{s.cleanSheet}</b></div>
                            <div className="stat-line"><span>Punti</span><b>{fmt(s.punti)}</b></div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </>
      )}

      {/* ── Tab Feedback (solo staff) ── */}
      {tab === 'feedback' && !isPortiere && (
        <div>
          <div className="scheda" style={{ marginBottom: 20 }}>
            <div className="stat-rows">
              <div className="stat-block">
                <div className="stat-line"><span>Allenamenti valutati</span><b>{feedbackStats.allenValutati}/{feedbackStats.totAllenamenti}</b></div>
                <div className="stat-line"><span>Feedback scritti</span><b>{feedbackStats.totFeedback}</b></div>
              </div>
              <div className="stat-block">
                <div className="stat-line"><span>Media voto portieri (seduta)</span><b>{fmt(feedbackStats.mediaVotoPortiere)}</b></div>
              </div>
            </div>
          </div>
          {feedback.length === 0
            ? <div className="empty">Nessun feedback ricevuto.</div>
            : feedback.map((f, i) => (
              <div key={i} className="feedback-riga">
                <div className="feedback-head">
                  <span className="feedback-nome">
                    {f.portieri ? `${f.portieri.nome} ${f.portieri.cognome ?? ''}`.trim() : '—'}
                  </span>
                  {f.allenamenti && (
                    <span className="feedback-voto">
                      {f.allenamenti.squadre?.nome} · {new Date(f.allenamenti.data + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {f.voto_portiere != null && <span className="feedback-voto">voto: <b>{f.voto_portiere}</b></span>}
                </div>
                <div className="feedback-testo">{f.feedback_portiere}</div>
              </div>
            ))
          }
        </div>
      )}
    </>
  )
}
