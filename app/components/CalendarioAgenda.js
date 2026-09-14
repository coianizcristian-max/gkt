'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'

const DL = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

export default function CalendarioAgenda({ allenamenti = [], partite = [], oggiStr }) {
  const t = useTranslations('calendario')
  const tm = useTranslations('calendarioMese')
  const locale = useLocale()
  const dl = DL[locale] || 'it-IT'

  const [openId, setOpenId] = useState(null)
  const [extra, setExtra] = useState({}) // dettaglio allenamenti caricato on-demand

  const d7 = new Date(oggiStr + 'T00:00:00')
  d7.setDate(d7.getDate() - 7)
  const setteFa = d7.toISOString().slice(0, 10)

  const d7a = new Date(oggiStr + 'T00:00:00')
  d7a.setDate(d7a.getDate() + 7)
  const setteAvanti = d7a.toISOString().slice(0, 10)

  const A = allenamenti.map((a) => ({ ...a, _tipo: 'allenamento' }))
  const P = (partite ?? []).map((p) => ({ ...p, _tipo: 'partita' }))

  // "Da valutare" = solo allenamenti in cui il portiere era presente e non ha ancora dato il voto
  const daValutare = A
    .filter((a) => a.presente === true && !a.ha_voto && a.data <= oggiStr)
    .sort((a, b) => b.data.localeCompare(a.data))
  const inDaValutare = new Set(daValutare.map((a) => a.id))

  const recenti = [...A, ...P]
    .filter((e) => e.data <= oggiStr && e.data >= setteFa && !(e._tipo === 'allenamento' && inDaValutare.has(e.id)))
    .sort((a, b) => b.data.localeCompare(a.data) || (b.ora_inizio ?? '').localeCompare(a.ora_inizio ?? ''))

  const prossimi = [...A, ...P]
    .filter((e) => e.data > oggiStr && e.data <= setteAvanti)
    .sort((a, b) => a.data.localeCompare(b.data) || (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? ''))

  const giorno = (s) => new Date(s + 'T00:00:00').getDate()
  const mese = (s) => new Date(s + 'T00:00:00').toLocaleDateString(dl, { month: 'short' }).replace('.', '')
  const hhmm = (v) => (v ? String(v).slice(0, 5) : '')
  const fmtMin = (m) => m >= 60 ? tm('oreMin', { h: Math.floor(m / 60), min: Math.round(m % 60) }) : tm('minuti', { min: Math.round(m) })
  const cid = (e) => `${e._tipo}-${e.id}`

  // colore semantico dell'evento (come nella griglia), per riconoscerlo a colpo d'occhio
  const coloreEvento = (e) => {
    if (e._tipo === 'partita') return e.data > oggiStr ? '#a78bfa' : '#7c3aed'   // futura / passata
    if (e.nessuna_valutazione) return '#2e9e5b'
    if (e.presente === false) return '#9aa6b2'                                    // assente (neutro)
    if (e.ha_voto) return '#2e9e5b'                                               // valutato
    if (e.data <= oggiStr && e.presente === true) return '#1f6feb'               // da valutare (colore base + cornice gialla via CSS)
    if (e.data > oggiStr) return '#1f6feb'                                        // programmato
    return '#9aa6b2'                                                              // passato non registrato
  }

  async function toggle(e) {
    const c = cid(e)
    if (openId === c) { setOpenId(null); return }
    setOpenId(c)
    if (e._tipo !== 'allenamento' || extra[e.id] !== undefined) return
    try {
      const supabase = createClient()
      const ids = [e.id, e.accorpata_con].filter(Boolean)
      const [{ data: ae }, { data: row }] = await Promise.all([
        supabase.from('allenamento_esercizi')
          .select('ordine, esercizi(id, titolo, tipologia, durata_minuti, recupero_minuti)')
          .in('allenamento_id', ids).order('ordine'),
        supabase.from('allenamenti').select('id, obiettivi, consuntivo').eq('id', e.id).maybeSingle(),
      ])
      const esercizi = (ae ?? []).map((r) => r.esercizi).filter(Boolean)
      const durata = esercizi.reduce((tot, ex) => tot + (parseFloat(ex.durata_minuti) || 0) + (parseFloat(ex.recupero_minuti) || 0), 0)
      setExtra((prev) => ({ ...prev, [e.id]: { esercizi, durata, obiettivi: row?.obiettivi ?? null, consuntivo: row?.consuntivo ?? null } }))
    } catch (_) {
      setExtra((prev) => ({ ...prev, [e.id]: { esercizi: [], durata: 0, obiettivi: null, consuntivo: null } }))
    }
  }

  // ---- dettaglio espanso ----
  function dettaglioAllenamento(a) {
    const passata = a.data <= oggiStr
    const stato = a.nessuna_valutazione
      ? { txt: tm('nessunaValPrevista'), col: 'var(--campo)' }
      : a.presente === false
        ? { txt: t('badgeAssente'), col: 'var(--ink-soft)' }
        : a.ha_voto
          ? { txt: tm('valutato'), col: 'var(--campo)' }
          : (passata && a.presente === true)
            ? { txt: tm('daValutare'), col: 'var(--rosso)' }
            : { txt: tm('programmato'), col: 'var(--ink-soft)' }
    const d = extra[a.id]
    return (
      <div className="agenda-detail-in">
        {(a.ora_inizio) && <div className="agenda-d-line">🕒 {hhmm(a.ora_inizio)}{a.ora_fine ? `–${hhmm(a.ora_fine)}` : ''}</div>}
        <div className="calx-state" style={{ color: stato.col, margin: '2px 0 8px' }}>{stato.txt}</div>
        {a.ha_voto && <div className="agenda-d-line">{t('agendaTuoVoto')}: <b>{a.voto_portiere}★</b></div>}
        {d?.obiettivi && (
          <div className="cal-preview-note" style={{ marginBottom: 6 }}>
            <span className="cal-preview-esercizi-label">{tm('obiettivi')}</span>
            <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{d.obiettivi}</p>
          </div>
        )}
        {d?.consuntivo && (
          <div className="cal-preview-note" style={{ marginBottom: 6 }}>
            <span className="cal-preview-esercizi-label">{tm('consuntivo')}</span>
            <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{d.consuntivo}</p>
          </div>
        )}
        {d === undefined
          ? <span className="agenda-d-muted">{tm('caricamentoEsercizi')}</span>
          : d.esercizi.length === 0
            ? <span className="agenda-d-muted">{tm('nessunEsercizioPian')}</span>
            : (
              <div>
                <div className="agenda-d-label">{tm('eserciziLabel')}</div>
                <ol className="cal-preview-esercizi-list">
                  {d.esercizi.map((ex) => (
                    <li key={ex.id}><span className="cal-preview-es-nome">{ex.titolo}</span>{ex.tipologia && <span className="cal-preview-es-tipo"> · {ex.tipologia}</span>}</li>
                  ))}
                </ol>
              </div>
            )}
        {d?.durata > 0 && <div className="agenda-d-line" style={{ marginTop: 8 }}>{tm('durataTotale')} <b>{fmtMin(d.durata)}</b></div>}
        <div style={{ marginTop: 10 }}>
          <Link href={`/calendario/${a.id}`} className="btn-mini">{tm('apriAllenamento')} →</Link>
        </div>
      </div>
    )
  }

  function dettaglioPartita(p) {
    const passata = p.data <= oggiStr
    return (
      <div className="agenda-detail-in">
        <div className="agenda-d-line">{p.casa === true ? `🏠 ${tm('casa')}` : p.casa === false ? `✈ ${tm('trasferta')}` : ''} · {tm('vs')} <b>{p.avversario || '—'}</b></div>
        {(p.ora_ritrovo || p.ora_inizio) && (
          <div className="agenda-d-line">🕒 {p.ora_ritrovo ? `${tm('ritrovo', { ora: hhmm(p.ora_ritrovo) })}` : ''}{p.ora_ritrovo && p.ora_inizio ? ' · ' : ''}{p.ora_inizio ? `${tm('inizioPartita', { ora: hhmm(p.ora_inizio) })}` : ''}</div>
        )}
        {passata && p.gol_fatti != null && (
          <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 2 }}>{p.gol_fatti} — {p.gol_subiti}</span>
            {p.gol_subiti === 0 && <span style={{ fontSize: 12, color: 'var(--campo)', fontWeight: 700 }}>{tm('cleanSheet')}</span>}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <Link href={`/partite/${p.id}`} className="btn-mini">{tm('apriPartita')} →</Link>
        </div>
      </div>
    )
  }

  const Riga = ({ e, badge, badgeClass }) => {
    const open = openId === cid(e)
    const isPart = e._tipo === 'partita'
    const col = coloreEvento(e)
    const sub = isPart
      ? `${tm('badgePartita')} · ${e.casa === true ? '🏠' : e.casa === false ? '✈' : ''} ${e.avversario || ''}`.trim()
      : `${t('agendaAllenamento')}${e.ora_inizio ? ` · ${hhmm(e.ora_inizio)}` : ''}`
    return (
      <div className={`agenda-item ${open ? 'open' : ''}`}>
        <div className={`agenda-row clic ${!isPart && e.presente === true && !e.ha_voto && e.data <= oggiStr ? 'da' : ''}`}
          role="button" tabIndex={0}
          onClick={() => toggle(e)}
          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(e) } }}>
          <div className="agenda-date" style={{ border: `2px solid ${col}`, background: `${col}14` }}>
            <div className="d" style={{ color: col }}>{giorno(e.data)}</div>
            <div className="m">{mese(e.data)}</div>
          </div>
          <div className="agenda-info">
            <div className="t">{e.squadra_nome || t('titolo')}</div>
            <div className="s">{sub}</div>
          </div>
          {badge && <span className={`agenda-badge ${badgeClass}`}>{badge}</span>}
          <span className="agenda-chevron">›</span>
        </div>
        <div className="agenda-detail">{isPart ? dettaglioPartita(e) : dettaglioAllenamento(e)}</div>
      </div>
    )
  }

  const badgeAllen = (a) => {
    if (a.ha_voto) return { badge: `${t('agendaTuoVoto')}: ${a.voto_portiere}★`, cls: 'b-val' }
    if (a.presente === false) return { badge: t('badgeAssente'), cls: 'b-ass' }
    if (a.data > oggiStr) return { badge: t('badgeProgrammato'), cls: 'b-fut' }
    if (a.valutato_coach) return { badge: t('badgeValutatoCoach'), cls: 'b-val' }
    return { badge: null, cls: '' }
  }
  const badgePart = (p) => {
    if (p.data <= oggiStr && p.gol_fatti != null) return { badge: `${p.gol_fatti}-${p.gol_subiti}`, cls: 'b-val' }
    return { badge: t('badgeProgrammato'), cls: 'b-fut' }
  }
  const badgeDi = (e) => e._tipo === 'partita' ? badgePart(e) : badgeAllen(e)

  const vuoto = !daValutare.length && !recenti.length && !prossimi.length

  return (
    <div>
      {vuoto && <div className="agenda-empty">{t('agendaVuoto')}</div>}

      {recenti.length > 0 && (
        <>
          <div className="agenda-sec">{t('agendaRecenti')}</div>
          {recenti.map((e) => { const b = badgeDi(e); return <Riga key={cid(e)} e={e} badge={b.badge} badgeClass={b.cls} /> })}
        </>
      )}

      {prossimi.length > 0 && (
        <>
          <div className="agenda-sec">{t('agendaProssimi')}</div>
          {prossimi.map((e) => { const b = badgeDi(e); return <Riga key={cid(e)} e={e} badge={b.badge} badgeClass={b.cls} /> })}
        </>
      )}

      {daValutare.length > 0 && (
        <>
          <div className="agenda-sec">⭐ {t('agendaDaValutare')}</div>
          {daValutare.map((a) => <Riga key={cid(a)} e={a} badge={t('badgeDaValutare')} badgeClass="b-da" />)}
        </>
      )}
    </div>
  )
}
