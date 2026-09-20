'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import IconaTipoPartita from '@/app/components/IconaTipoPartita'

// Lista "Prossimi eventi" del calendario per preparatore/staff (vista mobile):
// in cima cosa c'e' da valutare, poi allenamenti e partite dei prossimi 7 o 14
// giorni. Ogni riga apre l'allenamento o la partita.
const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }
const MAX_DA_VALUTARE = 8

const hhmm = (s) => (s ? String(s).slice(0, 5) : '')
const piuGiorni = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function CalendarioAgendaStaff({ allenamenti, partite, oggiStr }) {
  const t = useTranslations('calendario')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const [giorni, setGiorni] = useState(7)

  const eventi = [
    ...allenamenti.map((a) => ({ ...a, _tipo: 'allenamento' })),
    ...partite.map((p) => ({ ...p, _tipo: 'partita' })),
  ]
  const ordina = (a, b) => a.data.localeCompare(b.data) || hhmm(a.ora_inizio).localeCompare(hhmm(b.ora_inizio))

  const daValutareTutti = eventi
    .filter((e) => e.data < oggiStr && (e._tipo === 'partita' ? !e.ha_valutazioni : !e.valutato))
    .sort((a, b) => ordina(b, a))
  const daValutare = daValutareTutti.slice(0, MAX_DA_VALUTARE)
  const limite = piuGiorni(oggiStr, giorni - 1)
  const prossimi = eventi.filter((e) => e.data >= oggiStr && e.data <= limite).sort(ordina)

  const colore = (e) => {
    if (e._tipo === 'partita') return e.data < oggiStr ? '#7c3aed' : '#8b5cf6'
    if (e.valutato) return '#2e9e5b'
    if (e.data < oggiStr) return '#c0392b'
    return '#1f6feb'
  }

  const Riga = ({ e, daValutareRiga = false }) => {
    const d = new Date(e.data + 'T00:00:00')
    const isPart = e._tipo === 'partita'
    const oggi = e.data === oggiStr
    const col = colore(e)
    const ora = isPart ? (e.ora_inizio || e.ora_ritrovo) : e.ora_inizio
    const orario = isPart ? hhmm(ora) : [hhmm(e.ora_inizio), hhmm(e.ora_fine)].filter(Boolean).join('–')
    const nAss = (e.assenti_annunciati ?? []).length
    const giocata = isPart && e.gol_fatti != null && e.gol_subiti != null

    let badge = null
    if (daValutareRiga) badge = <span className="agenda-badge b-da">{t('badgeDaValutare')}</span>
    else if (giocata) badge = <span className="agenda-badge b-val">{e.gol_fatti}-{e.gol_subiti}</span>
    else if (nAss > 0) badge = <span className="agenda-badge ags-ass">{t('nAssenti', { n: nAss })}</span>

    return (
      <Link href={isPart ? `/partite/${e.id}` : `/calendario/${e.id}`} className={`agenda-row ags-row${oggi ? ' ags-oggi' : ''}`}>
        <div className="agenda-date" style={{ border: `2px solid ${col}`, background: `${col}14` }}>
          <div className="ags-gs">{d.toLocaleDateString(dl, { weekday: 'short' }).replace('.', '')}</div>
          <div className="d" style={{ color: col }}>{d.getDate()}</div>
          <div className="m">{d.toLocaleDateString(dl, { month: 'short' }).replace('.', '')}</div>
        </div>
        <div className="agenda-info">
          <div className="t">
            {e.squadra_nome || '—'}
            {e.accorpata_nome ? <span className="ags-acc"> + {e.accorpata_nome}</span> : null}
          </div>
          <div className="s">
            {isPart ? (
              <>
                {t('agendaPartita')}{' '}
                <IconaTipoPartita tipo={e.tipo || 'campionato'} size={12} className="ags-ico" />
                {' · '}{e.casa === true ? '🏠' : e.casa === false ? '✈' : ''} {e.avversario || '—'}
                {orario && ` · ${orario}`}
              </>
            ) : (
              <>{t('agendaAllenamento')}{orario && ` · ${orario}`}</>
            )}
          </div>
        </div>
        {badge}
        <span className="agenda-chevron">›</span>
      </Link>
    )
  }

  return (
    <div>
      {daValutare.length > 0 && (
        <>
          <div className="agenda-sec">⭐ {t('agendaDaValutare')} ({daValutareTutti.length})</div>
          {daValutare.map((e) => <Riga key={`${e._tipo}-${e.id}`} e={e} daValutareRiga />)}
          {daValutareTutti.length > MAX_DA_VALUTARE && (
            <p className="ags-altri">{t('altriDaValutare', { n: daValutareTutti.length - MAX_DA_VALUTARE })}</p>
          )}
        </>
      )}

      <div className="ags-testa">
        <div className="agenda-sec" style={{ margin: 0 }}>{t('prossimiGiorni', { n: giorni })}</div>
        <div className="ags-giorni">
          {[7, 14].map((n) => (
            <button key={n} type="button" className={giorni === n ? 'on' : ''} onClick={() => setGiorni(n)}>
              {t('nGiorni', { n })}
            </button>
          ))}
        </div>
      </div>
      {prossimi.length === 0
        ? <div className="agenda-empty">{t('nessunEventoGiorni', { n: giorni })}</div>
        : prossimi.map((e) => <Riga key={`${e._tipo}-${e.id}`} e={e} />)}
    </div>
  )
}
