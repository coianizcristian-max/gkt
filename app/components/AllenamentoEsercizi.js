'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AllenamentoEsercizi({ allenamentoId, libreriaMia = [], libreriaPubblica = [], selezionatiIniziali }) {
  const router = useRouter()
  const [sel, setSel] = useState(new Set(selezionatiIniziali))
  const [fonte, setFonte] = useState('mia') // 'mia' | 'pubblica'
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const toggle = (id) => {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
    setDone(false)
  }

  const lista = fonte === 'mia' ? libreriaMia : libreriaPubblica
  const gruppi = {}
  for (const e of lista) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()

  async function salva() {
    setBusy(true); setError(''); setDone(false)
    const supabase = createClient()
    try {
      const { error: dErr } = await supabase.from('allenamento_esercizi').delete().eq('allenamento_id', allenamentoId)
      if (dErr) throw dErr
      const rows = [...sel].map((eid, i) => ({ allenamento_id: allenamentoId, esercizio_id: eid, ordine: i }))
      if (rows.length) {
        const { error: iErr } = await supabase.from('allenamento_esercizi').insert(rows)
        if (iErr) throw iErr
      }
      setDone(true); router.refresh()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="lista-editor">
      {error && <div className="err">{error}</div>}
      <div className="sub-nav">
        <button type="button" className={`sub-nav-link ${fonte === 'mia' ? 'active' : ''}`} onClick={() => setFonte('mia')}>
          La mia libreria ({libreriaMia.length})
        </button>
        <button type="button" className={`sub-nav-link ${fonte === 'pubblica' ? 'active' : ''}`} onClick={() => setFonte('pubblica')}>
          Libreria pubblica ({libreriaPubblica.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="empty">
          {fonte === 'mia'
            ? <>Nessun esercizio nella tua libreria. Creane in <a href="/esercizi" className="link-inline">Esercizi</a>.</>
            : 'Nessun esercizio pubblico disponibile.'}
        </div>
      ) : (
        chiavi.map((k) => (
          <div className="elenco-blocco" key={k}>
            <h3>{k}</h3>
            {gruppi[k].map((e) => (
              <label className="es-pick" key={e.id}>
                <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} />
                <span><b>{e.titolo}</b>{e.descrizione_breve ? ` \u2014 ${e.descrizione_breve}` : ''}</span>
              </label>
            ))}
          </div>
        ))
      )}

      <div className="form-actions">
        <span className="sub-intro" style={{ marginRight: 'auto' }}>{sel.size} selezionati</span>
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva esercizi'}</button>
      </div>
    </div>
  )
}
