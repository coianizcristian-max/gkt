'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Guida from '@/app/components/Guida'
import RankingCategoria from '@/app/components/RankingCategoria'
import GradimentoGrafici from '@/app/components/GradimentoGrafici'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const NUM_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function StatisticheClient({ stats, categorieOrd, byCat, andamentoByCat = {}, gradimento = null, feedbackStats, feedback, isPortiere, myPortiereId, canExport = true }) {
  const t = useTranslations('statisticheClient')
  const locale = useLocale()
  const nl = NUM_LOCALE[locale] || 'it-IT'
  const fmt = (n, dec = 2) => (n == null ? '—' : Number(n).toLocaleString(nl, { maximumFractionDigits: dec }))
  const [tab, setTab] = useState('portieri')
  const [expCat, setExpCat] = useState('tutte')
  const [expMese, setExpMese] = useState('tutti')
  // Feedback: ordinati per data decrescente e paginati (default 10 per pagina).
  const [fbSize, setFbSize] = useState(10)
  const [fbPage, setFbPage] = useState(0)
  const feedbackOrd = useMemo(
    () => [...(feedback ?? [])].sort((a, b) => (b.allenamenti?.data ?? '').localeCompare(a.allenamenti?.data ?? '')),
    [feedback])
  const fbTot = feedbackOrd.length
  const fbPerPagina = fbSize === 'tutti' ? fbTot : fbSize
  const fbPagine = fbPerPagina > 0 ? Math.max(1, Math.ceil(fbTot / fbPerPagina)) : 1
  const fbCur = Math.min(fbPage, fbPagine - 1)
  const fbDa = fbTot === 0 ? 0 : fbCur * fbPerPagina
  const feedbackPag = fbSize === 'tutti' ? feedbackOrd : feedbackOrd.slice(fbDa, fbDa + fbPerPagina)

  const mesiOpzioni = []
  const _oggi = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(_oggi.getFullYear(), _oggi.getMonth() - i, 1)
    mesiOpzioni.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleDateString(nl, { month: 'long', year: 'numeric' }),
    })
  }

  const selStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bordo, #d0d7dd)', background: '#fff', fontSize: 14, color: 'var(--ink, #14202b)' }

  function esportaPdf() {
    const params = new URLSearchParams({ mese: expMese, categoria: expCat, locale })
    window.open(`/api/statistiche-pdf?${params.toString()}`, '_blank')
  }

  return (
    <>
      {!isPortiere && (
        <div className="sub-nav">
          <button type="button" className={`sub-nav-link ${tab === 'portieri' ? 'active' : ''}`} onClick={() => setTab('portieri')}>
            {t('tabPortieri')}
          </button>
          <button type="button" className={`sub-nav-link ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
            {t('tabFeedback', { n: feedbackStats.totFeedback })}
          </button>
        </div>
      )}

      {!isPortiere && tab === 'portieri' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', margin: '4px 0 16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>{t('categoria')}</label>
            <select value={expCat} onChange={(e) => setExpCat(e.target.value)} style={selStyle}>
              <option value="tutte">{t('tutteCategorie')}</option>
              {categorieOrd.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>{t('periodo')}</label>
            <select value={expMese} onChange={(e) => setExpMese(e.target.value)} style={selStyle}>
              <option value="tutti">{t('tuttaStagione')}</option>
              {mesiOpzioni.map((m) => <option key={m.val} value={m.val}>{m.lbl}</option>)}
            </select>
          </div>
          {canExport
            ? <button type="button" className="btn" onClick={esportaPdf}>{t('esportaPdf')}</button>
            : <a className="btn-ghost" href="/abbonati" style={{ color: 'var(--ink-soft)' }}>{t('esportaPdfLocked')}</a>}
        </div>
      )}

      {!isPortiere && tab === 'portieri' && (
        <Guida titolo={t('guidaTitolo')}>
          {t('guidaBody')}
          <p style={{ marginTop: 10 }}>{t.rich('guidaInfortuni', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
      )}
      {(tab === 'portieri' || isPortiere) && (
        <>
          {stats.length === 0 ? (
            <div className="empty">
              {t('nessunPortiere')}<br />
              <small style={{ color: 'var(--ink-soft)' }}>{t('nessunPortiereHint')}</small>
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
                    <span className="conta">{t('nPortieri', { n: lista.length })}</span>
                  </div>
                  {!isPortiere && lista.length >= 2 && (
                    <RankingCategoria righe={lista.map((s) => ({
                      id: s.p.id,
                      nome: `${s.p.nome ?? ''} ${(s.p.cognome ?? '').charAt(0)}${s.p.cognome ? '.' : ''}`.trim(),
                      mediaA: s.mediaA,
                      presenzaPct: s.disponibili ? Math.round((s.presenze / s.disponibili) * 100) : null,
                      mediaP: s.mediaP,
                      cleanSheet: s.cleanSheet,
                      golSubitiGara: s.golSubitiGara,
                    }))} />
                  )}
                  <div className="stat-grid">
                    {(() => {
                      const a = andamentoByCat[cat.id]
                      return (
                        <div className="stat-card" style={{ borderLeft: '4px solid var(--campo)' }}>
                          <div className="stat-head" style={{ marginBottom: a ? 12 : 0 }}>
                            <div className="stat-foto" style={{ background: 'var(--campo)', color: '#fff', fontSize: 22 }}>📈</div>
                            <div>
                              <div className="stat-nome">{t('andamentoSquadra')}</div>
                              <div className="stat-cat">{a ? t('giocateCamp', { n: a.giocate }) : t('nessunaPartitaCamp')}</div>
                            </div>
                          </div>
                          {a && (
                            <div className="stat-rows">
                              <div className="stat-block">
                                <div className="stat-line"><span>{t('puntiCampionato')}</span><b>{a.punti}</b></div>
                                <div className="stat-line"><span>{t('golFatti')}</span><b>{a.golFatti}</b></div>
                                <div className="stat-line"><span>{t('golSubiti')}</span><b>{a.golSubiti}</b></div>
                                <div className="stat-line"><span>{t('serieVittorie')}</span><b>{a.serie}</b></div>
                              </div>
                              <div className="stat-block">
                                <div className="stat-line"><span>{t('vittorie')}</span><b style={{ color: 'var(--campo)' }}>{a.vittorie}</b></div>
                                <div className="stat-line"><span>{t('pareggi')}</span><b>{a.pareggi}</b></div>
                                <div className="stat-line"><span>{t('sconfitte')}</span><b style={{ color: 'var(--rosso)' }}>{a.sconfitte}</b></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {lista.map((s) => (
                      <Link className="stat-card" key={s.p.id} href={`/portieri/${s.p.id}/statistiche`} style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                        <div className="stat-head">
                          <div className="stat-foto">
                            {s.p.foto_url ? <Image src={s.p.foto_url} alt="" fill sizes="52px" /> : <span>{(s.p.nome || '?').charAt(0)}</span>}
                          </div>
                          <div>
                            <div className="stat-nome">{s.p.nome} {s.p.cognome ?? ''}</div>
                            {s.p.numero_maglia ? <div className="stat-cat">#{s.p.numero_maglia}</div> : null}
                          </div>
                        </div>
                        <div className="stat-rows">
                          <div className="stat-block">
                            <h4>{t('allenamenti')}</h4>
                            <div className="stat-line"><span>{t('presenze')}</span><b>{s.presenze}/{s.disponibili ?? s.totAllen}{s.persi > 0 ? ` \u00b7 \ud83e\ude79${s.persi}` : ''}</b></div>
                            <div className="stat-line"><span>{t('mediaVoto')}</span><b>{fmt(s.mediaA)}</b></div>
                          </div>
                          <div className="stat-block">
                            <h4>{t('partiteCamp')}</h4>
                            <div className="stat-line"><span>{t('giocate')}</span><b>{s.nPartite}</b></div>
                            <div className="stat-line"><span>{t('mediaVoto')}</span><b>{fmt(s.mediaP)}</b></div>
                            <div className="stat-line"><span>{t('cleanSheet')}</span><b>{s.cleanSheet}</b></div>
                            <div className="stat-line"><span>{t('punti')}</span><b>{fmt(s.punti)}</b></div>
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

      {tab === 'feedback' && !isPortiere && (
        <div>
          <GradimentoGrafici dati={gradimento} />
          <div className="scheda" style={{ marginBottom: 20 }}>
            <div className="stat-rows">
              <div className="stat-block">
                <div className="stat-line"><span>{t('allenValutati')}</span><b>{feedbackStats.allenValutati}/{feedbackStats.totAllenamenti}</b></div>
                <div className="stat-line"><span>{t('feedbackScritti')}</span><b>{feedbackStats.totScritti}</b></div>
              </div>
              <div className="stat-block">
                <div className="stat-line"><span>{t('mediaVotoSeduta')}</span><b>{fmt(feedbackStats.mediaVotoPortiere)}</b></div>
              </div>
            </div>
          </div>
          {fbTot > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{t('fbMostra')}</label>
              <select value={fbSize} onChange={(e) => { const v = e.target.value; setFbSize(v === 'tutti' ? 'tutti' : Number(v)); setFbPage(0) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="tutti">{t('fbTutti')}</option>
              </select>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-soft)' }}>
                {t('fbConteggio', { da: fbTot === 0 ? 0 : fbDa + 1, a: Math.min(fbDa + fbPerPagina, fbTot), tot: fbTot })}
              </span>
            </div>
          )}
          {fbTot === 0
            ? <div className="empty">{t('nessunFeedback')}</div>
            : feedbackPag.map((f, i) => (
              <Link key={i} href={`/calendario/${f.allenamento_id}`} className="feedback-riga"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                <div className="feedback-head">
                  <span className="feedback-nome">
                    {f.portieri ? `${f.portieri.nome} ${f.portieri.cognome ?? ''}`.trim() : '—'}
                  </span>
                  {f.allenamenti && (
                    <span className="feedback-voto">
                      {f.allenamenti.squadre?.nome} · {new Date(f.allenamenti.data + 'T00:00:00').toLocaleDateString(nl, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {f.voto_portiere != null && <span className="feedback-voto">{t('votoLabel')} <b>{f.voto_portiere}</b></span>}
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-soft)' }}>›</span>
                </div>
                {f.feedback_portiere && <div className="feedback-testo">{f.feedback_portiere}</div>}
              </Link>
            ))
          }
          {fbSize !== 'tutti' && fbPagine > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button type="button" className="btn-ghost" disabled={fbCur === 0} onClick={() => setFbPage(fbCur - 1)}>{t('fbPrec')}</button>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fbCur + 1} / {fbPagine}</span>
              <button type="button" className="btn-ghost" disabled={fbCur >= fbPagine - 1} onClick={() => setFbPage(fbCur + 1)}>{t('fbSucc')}</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
