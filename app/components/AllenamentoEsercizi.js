'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AllenamentoEsercizi({ allenamentoId, esercizi, selezionatiIniziali }) {
  const router = useRouter()
  const [sel, setSel] = useState(new Set(selezionatiIniziali))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const toggle = (id) => {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
    setDone(false)
  }

  const gruppi = {}
  for (const e of esercizi) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
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

  if (esercizi.length === 0) {
    return <div className="empty">Nessun esercizio in libreria. Creane nella sezione <a href="/esercizi" className="link-inline">Esercizi</a>.</div>
  }

  return (
    <div className="lista-editor">
      {error && <div className="err">{error}</div>}
      {chiavi.map((k) => (
        <div className="elenco-blocco" key={k}>
          <h3>{k}</h3>
          {gruppi[k].map((e) => (
            <label className="es-pick" key={e.id}>
              <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} />
              <span><b>{e.titolo}</b>{e.descrizione_breve ? ` \u2014 ${e.descrizione_breve}` : ''}</span>
            </label>
          ))}
        </div>
      ))}
      <div className="form-actions">
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva esercizi'}</button>
      </div>
    </div>
  )
}
