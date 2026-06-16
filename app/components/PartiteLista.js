'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function PartiteLista({ partite, categorie }) {
  const [filtro, setFiltro] = useState('')
  const lista = partite.filter((p) => !filtro || p.squadra_id === filtro)
  return (
    <div className="cal">
      <div className="cal-bar">
        <Link href="/partite/nuova" className="btn-azione">+ Nuova partita</Link>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      {lista.length === 0 ? (
        <div className="empty">Nessuna partita inserita.</div>
      ) : (
        <div className="partite-list">
          {lista.map((p) => {
            const cs = p.gol_subiti === 0
            const haRis = p.gol_fatti != null && p.gol_subiti != null
            const esito = !haRis ? null : (p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X')
            const esitoLabel = { V: 'Vinta', P: 'Persa', X: 'Pareggio' }
            return (
              <Link key={p.id} href={`/partite/${p.id}`} className="partita-row">
                <span className="pr-data">{new Date(p.data + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                <span className="pr-cat">{p.squadra_nome}</span>
                <span className="pr-match">{p.casa ? 'Casa' : 'Trasferta'} &middot; vs {p.avversario || '\u2014'}</span>
                {esito && <span className={`pr-esito esito-${esito}`}>{esitoLabel[esito]}</span>}
                <span className="pr-score">{p.gol_fatti ?? '\u2013'}&ndash;{p.gol_subiti ?? '\u2013'}</span>
                {cs && <span className="badge-cs">Clean sheet</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
