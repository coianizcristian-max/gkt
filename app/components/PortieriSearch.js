'use client'

import { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

function calcEta(dataNascita) {
  if (!dataNascita) return null
  const oggi = new Date()
  const n = new Date(dataNascita + 'T00:00:00')
  let eta = oggi.getFullYear() - n.getFullYear()
  if (oggi.getMonth() < n.getMonth() || (oggi.getMonth() === n.getMonth() && oggi.getDate() < n.getDate())) eta--
  return eta
}

export default function PortieriSearch({ squadre, iscrizioni, stats, tagPerPortiere = {} }) {
  const t = useTranslations('portieriSearch')
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
          placeholder={t('placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {q && (
          <button type="button" className="search-clear" onClick={() => setQ('')} aria-label={t('cancella')}>✕</button>
        )}
      </div>

      {q && totale === 0 && (
        <div className="empty">{t('nessunTrovato', { q })}</div>
      )}

      {squadre.map((sq) => {
        const lista = perCategoria(sq.id)
        if (lista.length === 0) return null
        return (
          <section key={sq.id}>
            <div className="squadra-head">
              <h2>{sq.nome}</h2>
              <span className="conta">{t('nPortieri', { n: lista.length })}</span>
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
                          ? <Image src={p.foto_url} alt="" fill sizes="46px" />
                          : <span>{(p.nome?.[0] ?? '') + (p.cognome?.[0] ?? '')}</span>}
                      </div>
                      <div>
                        <div className="nome">
                          {p.nome} {p.cognome ?? ''}
                          {i.numero_maglia ? <span className="maglia">#{i.numero_maglia}</span> : null}
                        </div>
                        <div className="ruolo">
                          {sq.nome}
                          {eta != null && <span className="eta-badge">{t('anni', { n: eta })}</span>}
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
                        <div className="lab">{t('mediaVoto')}</div>
                      </div>
                      <div className="stat">
                        <div className="num">{presenzePct(p.id)}</div>
                        <div className="lab">{t('presenze')}</div>
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
          {t('nessunIscritto')}<br />
          <Link href="/portieri/nuovo" className="link-inline">{t('aggiungiPrimo')}</Link>
        </div>
      )}
    </>
  )
}
