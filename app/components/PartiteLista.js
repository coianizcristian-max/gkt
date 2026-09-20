'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import IconaTipoPartita from '@/app/components/IconaTipoPartita'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const TIPI = ['campionato', 'coppa', 'amichevole', 'torneo']
const TIPO_EMOJI = { campionato: '🏆', coppa: '🏅', amichevole: '🤝', torneo: '⚡' }
const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }
const ESITO_COL = { V: 'var(--campo)', P: 'var(--rosso)', X: 'var(--giallo)' }

const esitoDi = (p) => {
  if (p?.gol_fatti == null || p?.gol_subiti == null) return null
  return p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X'
}

// Nome avversario confrontabile: minuscole, senza accenti e spazi doppi
const chiaveAvv = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').trim()

/**
 * Per ogni partita di campionato cerca la gara precedente contro lo stesso
 * avversario, nella stessa categoria: e' l'andata. Serve a mostrare nel
 * girone di ritorno com'era finita, senza andare a cercarla.
 */
function mappaAndate(partite) {
  const perChiave = new Map()
  for (const p of partite) {
    if ((p.tipo ?? 'campionato') !== 'campionato' || !chiaveAvv(p.avversario)) continue
    const k = `${p.squadra_id}|${chiaveAvv(p.avversario)}`
    if (!perChiave.has(k)) perChiave.set(k, [])
    perChiave.get(k).push(p)
  }
  const andata = new Map()
  for (const lista of perChiave.values()) {
    lista.sort((a, b) => a.data.localeCompare(b.data))
    for (let i = 1; i < lista.length; i++) andata.set(lista[i].id, lista[i - 1])
  }
  return andata
}

function RigaPartita({ p, andata = null, prossima = false, rigaRef = null }) {
  const t = useTranslations('partiteLista')
  const tc = useTranslations('calendarioMese')
  const ts = useTranslations('statistichePortiere')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const d = new Date(p.data + 'T00:00:00')
  const gSett = d.toLocaleDateString(dl, { weekday: 'short' }).replace('.', '')
  const gNum = d.getDate()
  const mese = d.toLocaleDateString(dl, { month: 'short' }).replace('.', '')
  const dataEstesa = d.toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const haRis = p.gol_fatti != null && p.gol_subiti != null
  const esito = esitoDi(p)
  const cs = haRis && p.gol_subiti === 0
  const esitoAndata = esitoDi(andata)
  const tipo = p.tipo || 'campionato'

  return (
    <Link ref={rigaRef} href={`/partite/${p.id}`} className={`pm-row${prossima ? ' pm-prossima' : ''}`} title={dataEstesa}>
      <span className="pm-data">
        <span className="pm-gs">{gSett}</span>
        <span className="pm-gn">{gNum}</span>
        <span className="pm-me">{mese}</span>
      </span>

      <span className="pm-centro">
        <span className="pm-avv">
          <span className="pm-luogo" title={p.casa === true ? tc('casa') : p.casa === false ? tc('trasferta') : ''}>
            {p.casa === true ? '🏠' : p.casa === false ? '✈' : '❔'}
          </span>
          <span className="pm-avv-nome">{p.avversario || '—'}</span>
        </span>
        <span className="pm-info">
          <IconaTipoPartita tipo={tipo} size={12} className="pm-tipo-ico" title={t('tipo_' + tipo)} />
          <span className="pm-cat">{p.squadra_nome}</span>
          {andata && (
            <span className="pm-andata" title={t('andataTitolo')}>
              {t('andata')}
              {esitoAndata ? (
                <>
                  {/* esito esplicito (V/X/P): il punteggio e' sempre il nostro
                      prima, anche se all'andata giocavamo in trasferta */}
                  <span className="pm-esito pm-esito-mini" style={{ background: ESITO_COL[esitoAndata] }}>{esitoAndata}</span>
                  <b>{andata.gol_fatti}–{andata.gol_subiti}</b>
                </>
              ) : <b>–</b>}
            </span>
          )}
        </span>
      </span>

      <span className="pm-destra">
        {haRis ? (
          <>
            <span className="pm-score">{p.gol_fatti}–{p.gol_subiti}</span>
            <span className="pm-badges">
              <span className="pm-esito" style={{ background: ESITO_COL[esito] }}>{esito}</span>
              {/* scritto per esteso, piccolo, su due righe ("Clean / sheet") */}
              {cs && <span className="pm-cs">{ts('cleanSheet')}</span>}
            </span>
          </>
        ) : (
          <span className={prossima ? 'pm-prossima-badge' : 'pm-dagiocare'}>{prossima ? t('prossimaBadge') : '–'}</span>
        )}
      </span>
    </Link>
  )
}

export default function PartiteLista({ partite, categorie, isPortiere = false, oggiIso = null }) {
  const t = useTranslations('partiteLista')
  // oggiIso: in demo e' la data di riferimento, non quella del browser.
  const oggi = oggiIso || new Date().toISOString().slice(0, 10)
  const [range, setRange] = useState(7)
  const [tabTipo, setTabTipo] = useState('campionato')
  const andate = useMemo(() => mappaAndate(partite), [partite])

  const limiteData = new Date(oggi + 'T00:00:00')
  limiteData.setDate(limiteData.getDate() + range)
  const limiteStr = limiteData.toISOString().slice(0, 10)

  const prossime = partite.filter((p) => p.data >= oggi && p.data <= limiteStr).sort((a, b) => a.data.localeCompare(b.data))
  const daValutare = !isPortiere
    ? partite.filter((p) => p.data < oggi && !p.ha_valutazioni).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)
    : []
  // Ordine CRESCENTE: dalla prima partita della stagione all'ultima
  const perTipo = (tipo) => partite.filter((p) => (p.tipo ?? 'campionato') === tipo).sort((a, b) => a.data.localeCompare(b.data))
  const lista = perTipo(tabTipo)
  const idxProssima = lista.findIndex((p) => p.data >= oggi)

  // Finestra a scorrimento: all'apertura (e al cambio scheda) la prossima
  // partita finisce a meta' finestra, con le giocate sopra e le altre sotto.
  // Se sono gia' state giocate tutte, si parte dal fondo (le ultime).
  const finestraRef = useRef(null)
  const prossimaRef = useRef(null)
  useEffect(() => {
    const box = finestraRef.current
    if (!box) return
    const riga = prossimaRef.current
    if (riga) {
      const dentro = riga.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
      box.scrollTop = Math.max(0, dentro - box.clientHeight / 2 + riga.offsetHeight / 2)
    } else {
      box.scrollTop = idxProssima === -1 ? box.scrollHeight : 0
    }
  }, [tabTipo, idxProssima])

  return (
    <div>
      <div className="scheda pm-scheda" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>{t('prossime')}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setRange(7)}
              style={{ padding: '4px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 'var(--r-sm)', border: 'none', background: range === 7 ? '#0a7ec2' : 'var(--carta)', color: range === 7 ? '#fff' : 'var(--ink-soft)', boxShadow: range === 7 ? '0 2px 6px rgba(10,126,194,0.3)' : 'none', transition: 'all 0.15s' }}>
              {t('giorni7')}
            </button>
            <button type="button" onClick={() => setRange(31)}
              style={{ padding: '4px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 'var(--r-sm)', border: 'none', background: range === 31 ? '#7c3aed' : 'var(--carta)', color: range === 31 ? '#fff' : 'var(--ink-soft)', boxShadow: range === 31 ? '0 2px 6px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.15s' }}>
              {t('giorni31')}
            </button>
          </div>
        </div>
        {prossime.length === 0
          ? <div className="empty" style={{ padding: '12px 0' }}>{t('nessunaProssima', { range })}</div>
          : <div className="pm-lista">{prossime.map((p) => <RigaPartita key={p.id} p={p} andata={andate.get(p.id)} />)}</div>}

        {!isPortiere && daValutare.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--linea)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rosso)', marginBottom: 8 }}>{t('senzaValutazioni')}</div>
            <div className="pm-lista">{daValutare.map((p) => <RigaPartita key={p.id} p={p} andata={andate.get(p.id)} />)}</div>
          </div>
        )}
      </div>

      {!isPortiere && (
        <Link href="/partite/nuova" style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 100, padding: '13px 22px', borderRadius: 999, background: 'var(--azzurro)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 18px rgba(10,126,194,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('nuovaPartita')}
        </Link>
      )}

      <div className="sub-nav">
        {TIPI.map((tp) => {
          const n = perTipo(tp).length
          return (
            <button key={tp} type="button" className={`sub-nav-link ${tabTipo === tp ? 'active' : ''}`} onClick={() => setTabTipo(tp)}>
              {TIPO_EMOJI[tp]} {t('tipo_' + tp)} {n > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({n})</span>}
            </button>
          )
        })}
      </div>

      {lista.length === 0
        ? <div className="empty">{t('nessunaTipo', { tipo: t('tipo_' + tabTipo) })}</div>
        : (
          <div className="pm-finestra" ref={finestraRef}>
            <div className="pm-lista">
              {lista.map((p, i) => (
                <div key={p.id} className="pm-slot">
                  {/* separatore "Oggi" tra le giocate e quelle da giocare */}
                  {i === idxProssima && i > 0 && <div className="pm-oggi"><span>{t('oggi')}</span></div>}
                  <RigaPartita p={p} andata={andate.get(p.id)} prossima={i === idxProssima}
                    rigaRef={i === idxProssima ? prossimaRef : null} />
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
