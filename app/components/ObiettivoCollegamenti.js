'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export function SelettoreCollegamenti({ obiettivoId, parametriTutti, parametriSelezionati, eserciziTutti, eserciziSelezionati }) {
  const t = useTranslations('obiettivoCollegamenti')
  const router = useRouter()
  const [busyPar, setBusyPar] = useState(null)
  const [busyEs, setBusyEs] = useState(null)
  const selParSet = new Set(parametriSelezionati)
  const selEsSet = new Set(eserciziSelezionati)
  // Esercizi: non si mostra piu' tutta la libreria (con centinaia di esercizi
  // la pagina diventava lunghissima). Si vedono i collegati e si cercano gli
  // altri per titolo: compaiono al massimo 8 risultati.
  const [cercaEs, setCercaEs] = useState('')
  const MAX_RISULTATI = 8
  const eserciziCollegati = eserciziTutti.filter((e) => selEsSet.has(e.id))
  const q = cercaEs.trim().toLowerCase()
  const trovati = q
    ? eserciziTutti.filter((e) => !selEsSet.has(e.id) && (e.titolo || '').toLowerCase().includes(q))
    : []

  async function toggleParametro(parametroId) {
    setBusyPar(parametroId)
    const supabase = createClient()
    if (selParSet.has(parametroId)) {
      await supabase.from('obiettivo_parametri').delete().eq('obiettivo_id', obiettivoId).eq('parametro_id', parametroId)
    } else {
      await supabase.from('obiettivo_parametri').insert({ obiettivo_id: obiettivoId, parametro_id: parametroId })
    }
    setBusyPar(null); router.refresh()
  }

  async function toggleEsercizio(esercizioId) {
    setBusyEs(esercizioId)
    const supabase = createClient()
    if (selEsSet.has(esercizioId)) {
      await supabase.from('obiettivo_esercizi').delete().eq('obiettivo_id', obiettivoId).eq('esercizio_id', esercizioId)
    } else {
      await supabase.from('obiettivo_esercizi').insert({ obiettivo_id: obiettivoId, esercizio_id: esercizioId })
    }
    setBusyEs(null); router.refresh()
  }

  return (
    <div className="elenco-blocco">
      <h3>{t('parametriTitolo')}</h3>
      <p className="sub-intro oc-intro">{t('parametriIntro')}</p>
      <div className="oc-chips" style={{ marginBottom: 16 }}>
        {parametriTutti.map((p) => {
          const attivo = selParSet.has(p.id)
          return (
            <button key={p.id} type="button" className="oc-chip" onClick={() => toggleParametro(p.id)} disabled={busyPar === p.id}
              style={{
                borderRadius: 999, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid var(--azzurro)',
                background: attivo ? 'var(--azzurro)' : 'transparent',
                color: attivo ? '#fff' : 'var(--azzurro)',
              }}>
              {attivo ? '✓ ' : ''}{p.nome}
            </button>
          )
        })}
        {parametriTutti.length === 0 && <p className="sub-intro">{t('nessunParametro')}</p>}
      </div>

      <h3>{t('eserciziTitolo')}</h3>
      <p className="sub-intro oc-intro">{t('eserciziIntro')}</p>
      {eserciziTutti.length === 0 ? (
        <p className="sub-intro">{t('nessunEsercizio')}</p>
      ) : (
        <>
          {/* esercizi gia' collegati: si tolgono con la x */}
          {eserciziCollegati.length > 0 && (
            <div className="oc-chips">
              {eserciziCollegati.map((e) => (
                <button key={e.id} type="button" className="oc-chip oc-chip-es on" onClick={() => toggleEsercizio(e.id)}
                  disabled={busyEs === e.id} title={t('scollega')}>
                  {e.titolo} <span aria-hidden="true">✕</span>
                </button>
              ))}
            </div>
          )}
          <input type="search" className="oc-cerca" value={cercaEs} onChange={(ev) => setCercaEs(ev.target.value)}
            placeholder={t('cercaEsercizio', { n: eserciziTutti.length })} />
          {q && (
            <div className="oc-risultati">
              {trovati.length === 0 && <div className="oc-vuoto">{t('nessunRisultato')}</div>}
              {trovati.slice(0, MAX_RISULTATI).map((e) => (
                <button key={e.id} type="button" className="oc-ris" onClick={() => toggleEsercizio(e.id)} disabled={busyEs === e.id}>
                  <span className="oc-ris-tit">{e.titolo}</span>
                  <span className="oc-ris-add">+</span>
                </button>
              ))}
              {trovati.length > MAX_RISULTATI && (
                <div className="oc-vuoto">{t('altriRisultati', { n: trovati.length - MAX_RISULTATI })}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TrendObiettivo({ trendPerParametro }) {
  const t = useTranslations('obiettivoCollegamenti')
  const parametriConDati = Object.entries(trendPerParametro).filter(([, d]) => d.punti.length > 0)
  if (parametriConDati.length === 0) return null

  return (
    <div className="elenco-blocco">
      <h3>{t('trendTitolo')}</h3>
      {parametriConDati.map(([nome, d]) => {
        const ultimi = d.punti.slice(-8)
        const max = Math.max(...ultimi.map((p) => p.y), 10)
        const min = Math.min(...ultimi.map((p) => p.y), 0)
        const variazione = ultimi.length >= 2 ? ultimi[ultimi.length - 1].y - ultimi[0].y : null
        return (
          <div key={nome} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{nome}</span>
              {variazione != null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: variazione >= 0 ? 'var(--campo)' : 'var(--rosso)' }}>
                  {variazione >= 0 ? '+' : ''}{variazione.toFixed(1)} {variazione >= 0 ? '📈' : '📉'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
              {ultimi.map((p, i) => {
                const h = max > min ? ((p.y - min) / (max - min)) * 36 + 4 : 20
                return <div key={i} title={`${p.y}`} style={{ flex: 1, background: 'var(--azzurro)', opacity: 0.4 + (i / ultimi.length) * 0.6, height: `${h}px`, borderRadius: '2px 2px 0 0' }} />
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
