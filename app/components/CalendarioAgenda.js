'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const DL = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

export default function CalendarioAgenda({ allenamenti = [], oggiStr }) {
  const t = useTranslations('calendario')
  const tm = useTranslations('calendarioMese')
  const locale = useLocale()
  const dl = DL[locale] || 'it-IT'

  const [openId, setOpenId] = useState(null)
  const [eserciziMap, setEserciziMap] = useState({})

  // 7 giorni fa (stringa YYYY-MM-DD)
  const d7 = new Date(oggiStr + 'T00:00:00')
  d7.setDate(d7.getDate() - 7)
  const setteFa = d7.toISOString().slice(0, 10)

  const daValutare = allenamenti
    .filter((a) => a.presente === true && !a.ha_voto && a.data <= oggiStr)
    .sort((a, b) => b.data.localeCompare(a.data))

  const inDaValutare = new Set(daValutare.map((a) => a.id))

  const recenti = allenamenti
    .filter((a) => a.data <= oggiStr && a.data >= setteFa && !inDaValutare.has(a.id))
    .sort((a, b) => b.data.localeCompare(a.data))

  const prossimi = allenamenti
    .filter((a) => a.data > oggiStr)
    .sort((a, b) => a.data.localeCompare(b.data) || (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? ''))
    .slice(0, 8)

  const giorno = (s) => new Date(s + 'T00:00:00').getDate()
  const mese = (s) => new Date(s + 'T00:00:00').toLocaleDateString(dl, { month: 'short' }).replace('.', '')
  const hhmm = (v) => (v ? String(v).slice(0, 5) : '')
  const ora = (a) => (a.ora_inizio ? ` · ${hhmm(a.ora_inizio)}` : '')

  async function toggle(a) {
    if (openId === a.id) { setOpenId(null); return }
    setOpenId(a.id)
    if (eserciziMap[a.id] !== undefined) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const ids = [a.id, a.accorpata_con].filter(Boolean)
      const { data } = await supabase.from('allenamento_esercizi')
        .select('ordine, esercizi(id, titolo, tipologia)')
        .in('allenamento_id', ids).order('ordine')
      const list = (data ?? []).map((r) => r.esercizi).filter(Boolean)
      setEserciziMap((prev) => ({ ...prev, [a.id]: list }))
    } catch (_) {
      setEserciziMap((prev) => ({ ...prev, [a.id]: [] }))
    }
  }

  const Riga = ({ a, badge, badgeClass, da }) => {
    const open = openId === a.id
    const es = eserciziMap[a.id]
    const orario = a.ora_inizio ? `${hhmm(a.ora_inizio)}${a.ora_fine ? '–' + hhmm(a.ora_fine) : ''}` : null
    return (
      <div className={`agenda-item ${open ? 'open' : ''}`}>
        <div className={`agenda-row clic ${da ? 'da' : ''}`} role="button" tabIndex={0}
          onClick={() => toggle(a)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(a) } }}>
          <div className="agenda-date"><div className="d">{giorno(a.data)}</div><div className="m">{mese(a.data)}</div></div>
          <div className="agenda-info">
            <div className="t">{a.squadra_nome || t('titolo')}</div>
            <div className="s">{t('agendaAllenamento')}{ora(a)}</div>
          </div>
          {badge && <span className={`agenda-badge ${badgeClass}`}>{badge}</span>}
          <span className="agenda-chevron">›</span>
        </div>
        <div className="agenda-detail">
          <div className="agenda-detail-in">
            {orario && <div className="agenda-d-line">🕒 {orario}</div>}
            {a.ha_voto && <div className="agenda-d-line">{t('agendaTuoVoto')}: <b>{a.voto_portiere}★</b></div>}
            <div className="agenda-d-es">
              {es === undefined
                ? <span className="agenda-d-muted">{tm('caricamentoEsercizi')}</span>
                : es.length === 0
                  ? <span className="agenda-d-muted">{tm('nessunEsercizioPian')}</span>
                  : (
                    <>
                      <div className="agenda-d-label">{tm('eserciziLabel')}</div>
                      <ol className="cal-preview-esercizi-list">
                        {es.map((e) => (
                          <li key={e.id}>
                            <span className="cal-preview-es-nome">{e.titolo}</span>
                            {e.tipologia && <span className="cal-preview-es-tipo"> · {e.tipologia}</span>}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
            </div>
            <Link href={`/calendario/${a.id}`} className="btn-mini">
              {da ? t('agendaTocca') : tm('apriAllenamento')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const badgeRecente = (a) => {
    if (a.ha_voto) return { badge: `${t('agendaTuoVoto')}: ${a.voto_portiere}★`, cls: 'b-val' }
    if (a.presente === false) return { badge: t('badgeAssente'), cls: 'b-ass' }
    if (a.valutato_coach) return { badge: t('badgeValutatoCoach'), cls: 'b-val' }
    return { badge: null, cls: '' }
  }

  const vuoto = !daValutare.length && !recenti.length && !prossimi.length

  return (
    <div>
      {vuoto && <div className="agenda-empty">{t('agendaVuoto')}</div>}

      {daValutare.length > 0 && (
        <>
          <div className="agenda-sec">⭐ {t('agendaDaValutare')}</div>
          {daValutare.map((a) => <Riga key={a.id} a={a} da badge={t('badgeDaValutare')} badgeClass="b-da" />)}
        </>
      )}

      {recenti.length > 0 && (
        <>
          <div className="agenda-sec">{t('agendaRecenti')}</div>
          {recenti.map((a) => { const b = badgeRecente(a); return <Riga key={a.id} a={a} badge={b.badge} badgeClass={b.cls} /> })}
        </>
      )}

      {prossimi.length > 0 && (
        <>
          <div className="agenda-sec">{t('agendaProssimi')}</div>
          {prossimi.map((a) => <Riga key={a.id} a={a} badge={t('badgeProgrammato')} badgeClass="b-fut" />)}
        </>
      )}
    </div>
  )
}
