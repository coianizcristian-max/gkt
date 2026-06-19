'use client'

import { useState } from 'react'
import Link from 'next/link'

const TIPI = ['campionato', 'coppa', 'amichevole', 'torneo']
const TIPO_LABEL = { campionato: 'Campionato', coppa: 'Coppa', amichevole: 'Amichevole', torneo: 'Torneo' }
const TIPO_EMOJI = { campionato: '🏆', coppa: '🏅', amichevole: '🤝', torneo: '⚡' }

function fmtData(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function RigaPartita({ p, compact = false }) {
  const haRis = p.gol_fatti != null && p.gol_subiti != null
  const esito = !haRis ? null : p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X'
  const esitoCol = { V: 'var(--campo)', P: 'var(--rosso)', X: 'var(--giallo)' }
  return (
    <Link href={`/partite/${p.id}`} className="partita-row" style={compact ? { padding: '8px 12px' } : {}}>
      <span className="pr-data">{fmtData(p.data)}</span>
      <span className="pr-cat">{p.squadra_nome}</span>
      <span className="pr-match">
        {p.casa ? '🏠' : '✈'} {p.avversario || '—'}
        {!compact && p.tipo !== 'campionato' && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-soft)', background: 'var(--carta)', borderRadius: 4, padding: '1px 5px' }}>
            {TIPO_LABEL[p.tipo] ?? p.tipo}
          </span>
        )}
      </span>
      <span className="pr-score">{haRis ? `${p.gol_fatti}–${p.gol_subiti}` : '–'}</span>
      {esito && <span style={{ fontSize: 12, fontWeight: 700, color: esitoCol[esito] }}>{esito}</span>}
      {p.gol_subiti === 0 && haRis && <span className="badge-cs">CS</span>}
    </Link>
  )
}

export default function PartiteLista({ partite, categorie, isPortiere = false }) {
  const oggi = new Date().toISOString().slice(0, 10)
  const [range, setRange] = useState(7)
  const [tabTipo, setTabTipo] = useState('campionato')

  const limiteData = new Date()
  limiteData.setDate(limiteData.getDate() + range)
  const limiteStr = limiteData.toISOString().slice(0, 10)

  // Prossime partite nel range selezionato
  const prossime = partite
    .filter((p) => p.data >= oggi && p.data <= limiteStr)
    .sort((a, b) => a.data.localeCompare(b.data))

  // Partite passate senza valutazioni (solo staff)
  const daValutare = !isPortiere
    ? partite.filter((p) => p.data < oggi && !p.ha_valutazioni)
        .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)
    : []

  // Partite per tab tipo
  const perTipo = (tipo) => partite.filter((p) => (p.tipo ?? 'campionato') === tipo)
    .sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div>
      {/* Preview prossime partite */}
      <div className="scheda" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>📅 Prossime partite</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button"
              className={`btn-mini ${range === 7 ? '' : 'btn-ghost'}`}
              onClick={() => setRange(7)} style={{ padding: '4px 10px' }}>7 giorni</button>
            <button type="button"
              className={`btn-mini ${range === 31 ? '' : 'btn-ghost'}`}
              onClick={() => setRange(31)} style={{ padding: '4px 10px' }}>31 giorni</button>
          </div>
        </div>
        {prossime.length === 0
          ? <div className="empty" style={{ padding: '12px 0' }}>Nessuna partita nei prossimi {range} giorni.</div>
          : prossime.map((p) => <RigaPartita key={p.id} p={p} compact />)}

        {!isPortiere && daValutare.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--linea)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rosso)', marginBottom: 8 }}>
              ⚠ Partite senza valutazioni
            </div>
            {daValutare.map((p) => <RigaPartita key={p.id} p={p} compact />)}
          </div>
        )}
      </div>

      {/* Tab per tipologia */}
      {!isPortiere && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Link href="/partite/nuova" className="btn-azione">+ Nuova partita</Link>
        </div>
      )}

      <div className="sub-nav">
        {TIPI.map((t) => {
          const n = perTipo(t).length
          return (
            <button key={t} type="button"
              className={`sub-nav-link ${tabTipo === t ? 'active' : ''}`}
              onClick={() => setTabTipo(t)}>
              {TIPO_EMOJI[t]} {TIPO_LABEL[t]} {n > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({n})</span>}
            </button>
          )
        })}
      </div>

      <div className="partite-list">
        {perTipo(tabTipo).length === 0
          ? <div className="empty">Nessuna partita di tipo {TIPO_LABEL[tabTipo]} questa stagione.</div>
          : perTipo(tabTipo).map((p) => <RigaPartita key={p.id} p={p} />)}
      </div>
    </div>
  )
}
