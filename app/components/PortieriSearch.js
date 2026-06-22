'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

function calcEta(dataNascita) {
  if (!dataNascita) return null
  const oggi = new Date()
  const n = new Date(dataNascita + 'T00:00:00')
  let eta = oggi.getFullYear() - n.getFullYear()
  if (oggi.getMonth() < n.getMonth() || (oggi.getMonth() === n.getMonth() && oggi.getDate() < n.getDate())) eta--
  return eta
}

export default function PortieriSearch({ squadre, iscrizioni, stats, tagPerPortiere = {} }) {
  const [q, setQ] = useState('')

  const filtrati = useMemo(() => {
    const lower = q.toLowerCase().trim()
    if (!lower) return iscrizioni
    return iscrizioni.filter((i) => {
      const p = i.portieri
      const nome = `${p?.nome ?? ''} ${p?.cognome ?? ''}`.toLowerCase()
      return nome.includes(lower)
    })
  }, [q, iscrizioni])

  const perCategoria = (sqId) => filtrati.filter((i) => i.squadra_id === sqId && i.portieri?.attivo)
  const totale = filtrati.filter((i) => i.portieri?.attivo).length

  const media = (id) => {
    const s = stats[id]
    return s && s.conta ? (s.somma / s.conta).toFixed(2) : '—'
  }
  const presenzePct = (id) => {
    const s = stats[id]
    return s && s.tot ? Math.round((s.presenze / s.tot) * 100) + '%' : '—'
  }

  return (
    <>
      <div className="search-bar">
        <input
          type="search"
          placeholder="Cerca portiere per nome..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {q && (
          <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Cancella ricerca">✕</button>
        )}
      </div>

      {q && totale === 0 && (
        <div className="empty">Nessun portiere trovato per &ldquo;{q}&rdquo;.</div>
      )}

      {squadre.map((sq) => {
        const lista = perCategoria(sq.id)
        if (lista.length === 0) return null
        return (
          <section key={sq.id}>
            <div className="squadra-head">
              <h2>{sq.nome}</h2>
              <span className="conta">{lista.length} portieri</span>
            </div>
            <div className="grid">
              {lista.map((i) => {
                const p = i.portieri
                const eta = calcEta(p.data_nascita)
                return (
                  <Link className="card-portiere" key={p.id} href={`/portieri/${p.id}`}>
                    <div className="card-top">
                      <div className="avatar">
                        {p.foto_url
                          ? <img src={p.foto_url} alt="" />
                          : <span>{(p.nome?.[0] ?? '') + (p.cognome?.[0] ?? '')}</span>}
                      </div>
                      <div>
                        <div className="nome">
                          {p.nome} {p.cognome ?? ''}
                          {i.numero_maglia ? <span className="maglia">#{i.numero_maglia}</span> : null}
                        </div>
                        <div className="ruolo">
                          {sq.nome}
                          {eta != null && <span className="eta-badge">{eta} anni</span>}
                        </div>
                        {(tagPerPortiere[p.id] ?? []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {tagPerPortiere[p.id].map((tag) => (
                              <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'rgba(10,126,194,0.12)', color: 'var(--azzurro)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat">
                        <div className="num voto">{media(p.id)}</div>
                        <div className="lab">Media voto</div>
                      </div>
                      <div className="stat">
                        <div className="num">{presenzePct(p.id)}</div>
                        <div className="lab">Presenze</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      {!q && totale === 0 && (
        <div className="empty">
          Nessun portiere iscritto a questa stagione.<br />
          <Link href="/portieri/nuovo" className="link-inline">Aggiungi il primo portiere</Link>
        </div>
      )}
    </>
  )
}
