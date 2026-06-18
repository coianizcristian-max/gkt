'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function PartiteLista({ partite, categorie, isPortiere = false }) {
  const [filtro, setFiltro] = useState('')
  const lista = partite.filter((p) => !filtro || p.squadra_id === filtro)
  return (
    <div className="cal">
      <div className="cal-bar">
        {!isPortiere && <Link href="/partite/nuova" className="btn-azione">+ Nuova partita</Link>}
        {!isPortiere && (
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Tutte le categorie</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>
      {lista.length === 0 ? (
        <div className="empty">Nessuna partita inserita.</div>
      ) : (
        <div className="partite-list">
          {lista.map((p) => {
            const cs = p.gol_subiti === 0 && p.gol_subiti != null
            const haRis = p.gol_fatti != null && p.gol_subiti != null
            const esito = !haRis ? null : (p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X')
            const esitoLabel = { V: 'Vinta', P: 'Persa', X: 'Pareggio' }
            // Il portiere vede la lista ma può solo aprire la scheda (non inserisce valutazioni)
            return (
              <Link key={p.id} href={`/partite/${p.id}`} className="partita-row">
                <span className="pr-data">{new Date(p.data + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                <span className="pr-cat">{p.squadra_nome}</span>
                <span className="pr-match">
                  {p.casa ? 'Casa' : 'Trasferta'} &middot; vs {p.avversario || '\u2014'}
                  {p.tipo === 'amichevole' && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-soft)', background: 'var(--carta)', borderRadius: 4, padding: '1px 5px' }}>amichevole</span>}
                </span>
                <span className="pr-score">{p.gol_fatti ?? '\u2013'}&ndash;{p.gol_subiti ?? '\u2013'}</span>
                <span className="pr-esito-cell">{esito && <span className={`pr-esito esito-${esito}`}>{esitoLabel[esito]}</span>}</span>
                <span className="pr-cs-cell">{cs && <span className="badge-cs">Clean sheet</span>}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
