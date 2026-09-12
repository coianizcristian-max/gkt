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

export default function PortieriSearch({ squadre, iscrizioni, stats, tagPerPortiere = {}, stagioneId, puoEliminare = false }) {
  const t = useTranslations('portieriSearch')
  const [q, setQ] = useState('')
  const [items, setItems] = useState(iscrizioni)
  const [modal, setModal] = useState(null)   // { portiereId, nome, altreStagioni | null }
  const [busy, setBusy] = useState(false)
  const [errDel, setErrDel] = useState(false)

  async function apriModal(p, e) {
    e.preventDefault(); e.stopPropagation()
    setErrDel(false)
    setModal({ portiereId: p.id, nome: `${p.nome ?? ''} ${p.cognome ?? ''}`.trim(), altreStagioni: null })
    try {
      const res = await fetch('/api/elimina-portiere', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portiereId: p.id, stagioneId, azione: 'anteprima' }),
      })
      const data = await res.json()
      setModal((m) => m && m.portiereId === p.id ? { ...m, altreStagioni: data.altreStagioni ?? 0 } : m)
    } catch {
      setModal((m) => m ? { ...m, altreStagioni: 0 } : m)
    }
  }

  async function conferma() {
    if (!modal || busy) return
    setBusy(true); setErrDel(false)
    try {
      const res = await fetch('/api/elimina-portiere', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portiereId: modal.portiereId, stagioneId, azione: 'elimina' }),
      })
      if (!res.ok) { setErrDel(true); setBusy(false); return }
      // via dalla lista di questa stagione
      setItems((arr) => arr.filter((i) => i.portieri?.id !== modal.portiereId))
      setModal(null); setBusy(false)
    } catch {
      setErrDel(true); setBusy(false)
    }
  }

  const filtrati = useMemo(() => {
    const lower = q.toLowerCase().trim()
    if (!lower) return items
    return items.filter((i) => {
      const p = i.portieri
      const nome = `${p?.nome ?? ''} ${p?.cognome ?? ''}`.toLowerCase()
      return nome.includes(lower)
    })
  }, [q, items])

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
                  <Link className="card-portiere" key={p.id} href={`/portieri/${p.id}`} style={{ position: 'relative' }}>
                    {puoEliminare && (
                      <button type="button" onClick={(e) => apriModal(p, e)} aria-label={t('eliminaAria')} title={t('eliminaAria')}
                        style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'rgba(192,57,43,0.10)', color: 'var(--rosso, #c0392b)', cursor: 'pointer' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
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

      {modal && (
        <div onClick={() => !busy && setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 22, maxWidth: 420, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>{t('confermaTitolo', { nome: modal.nome })}</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '6px 0 0' }}>
              {modal.altreStagioni == null ? t('verifica')
                : modal.altreStagioni > 0 ? t('confermaSoloStagione')
                : t('confermaTutto')}
            </p>
            {errDel && <p style={{ color: 'var(--rosso, #c0392b)', fontSize: 13, marginTop: 10 }}>{t('eliminazioneErrore')}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" onClick={() => setModal(null)} disabled={busy}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>
                {t('annulla')}
              </button>
              <button type="button" onClick={conferma} disabled={busy || modal.altreStagioni == null}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--rosso, #c0392b)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (busy || modal.altreStagioni == null) ? 'not-allowed' : 'pointer', opacity: (busy || modal.altreStagioni == null) ? 0.6 : 1 }}>
                {busy ? '…' : t('conferma')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
