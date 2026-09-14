'use client'

import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const DL = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

export default function CalendarioAgenda({ allenamenti = [], oggiStr }) {
  const t = useTranslations('calendario')
  const locale = useLocale()
  const dl = DL[locale] || 'it-IT'

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
  const ora = (a) => (a.ora_inizio ? ` · ${String(a.ora_inizio).slice(0, 5)}` : '')

  const Riga = ({ a, badge, badgeClass, da }) => {
    const inner = (
      <>
        <div className="agenda-date"><div className="d">{giorno(a.data)}</div><div className="m">{mese(a.data)}</div></div>
        <div className="agenda-info">
          <div className="t">{a.squadra_nome || t('titolo')}</div>
          <div className="s">{t('agendaAllenamento')}{ora(a)}</div>
          {da && <span className="agenda-cta">{t('agendaTocca')} ›</span>}
        </div>
        {badge && <span className={`agenda-badge ${badgeClass}`}>{badge}</span>}
      </>
    )
    return da
      ? <Link href={`/calendario/${a.id}`} className="agenda-row da">{inner}</Link>
      : <div className="agenda-row">{inner}</div>
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
