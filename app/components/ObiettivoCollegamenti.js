'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Selettore parametri/esercizi collegati ───────────────────────────────────
export function SelettoreCollegamenti({ obiettivoId, parametriTutti, parametriSelezionati, eserciziTutti, eserciziSelezionati }) {
  const router = useRouter()
  const [busyPar, setBusyPar] = useState(null)
  const [busyEs, setBusyEs] = useState(null)
  const selParSet = new Set(parametriSelezionati)
  const selEsSet = new Set(eserciziSelezionati)

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
      <h3>Parametri di valutazione collegati</h3>
      <p className="sub-intro" style={{ marginTop: -6 }}>
        Collega questo obiettivo a uno o più parametri: vedrai il trend automatico dei voti nel tempo.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {parametriTutti.map((p) => {
          const attivo = selParSet.has(p.id)
          return (
            <button key={p.id} type="button" onClick={() => toggleParametro(p.id)} disabled={busyPar === p.id}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid var(--azzurro)',
                background: attivo ? 'var(--azzurro)' : 'transparent',
                color: attivo ? '#fff' : 'var(--azzurro)',
              }}>
              {attivo ? '✓ ' : ''}{p.nome}
            </button>
          )
        })}
        {parametriTutti.length === 0 && <p className="sub-intro">Nessun parametro disponibile.</p>}
      </div>

      <h3>Esercizi collegati</h3>
      <p className="sub-intro" style={{ marginTop: -6 }}>
        Collega gli esercizi della tua libreria che usi per lavorare su questo obiettivo.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {eserciziTutti.map((e) => {
          const attivo = selEsSet.has(e.id)
          return (
            <button key={e.id} type="button" onClick={() => toggleEsercizio(e.id)} disabled={busyEs === e.id}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid var(--campo)',
                background: attivo ? 'var(--campo)' : 'transparent',
                color: attivo ? '#fff' : 'var(--campo)',
              }}>
              {attivo ? '✓ ' : ''}{e.titolo}
            </button>
          )
        })}
        {eserciziTutti.length === 0 && <p className="sub-intro">Nessun esercizio nella libreria.</p>}
      </div>
    </div>
  )
}

// ── Mini grafico trend per i parametri collegati ──────────────────────────────
export function TrendObiettivo({ trendPerParametro }) {
  const parametriConDati = Object.entries(trendPerParametro).filter(([, d]) => d.punti.length > 0)
  if (parametriConDati.length === 0) return null

  return (
    <div className="elenco-blocco">
      <h3>📈 Trend automatico</h3>
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
