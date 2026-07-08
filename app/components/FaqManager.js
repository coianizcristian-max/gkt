'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FaqManager({ faq }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function aggiungi(target) {
    setAdding(true)
    const supabase = createClient()
    const maxOrd = faq.filter((f) => f.target === target).reduce((m, f) => Math.max(m, f.ordine), 0)
    const { error } = await supabase.from('faq_interne').insert({
      categoria: 'Nuova categoria', domanda: 'Nuova domanda', risposta: '', target, ordine: maxOrd + 1,
    })
    if (error) alert('Errore: ' + error.message)
    setAdding(false)
    router.refresh()
  }

  const allenatore = faq.filter((f) => f.target === 'allenatore')
  const portiere = faq.filter((f) => f.target === 'portiere')

  return (
    <div className="lista-editor">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" disabled={adding} onClick={() => aggiungi('allenatore')} type="button">+ Domanda per allenatori</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('portiere')} type="button">+ Domanda per portieri</button>
      </div>

      <h3 style={{ marginBottom: 8 }}>Allenatori e staff ({allenatore.length})</h3>
      {allenatore.length === 0 && <p className="sub-intro">Nessuna domanda ancora.</p>}
      {allenatore.map((f) => <FaqRiga key={f.id} f={f} onChanged={() => router.refresh()} />)}

      <h3 style={{ margin: '28px 0 8px' }}>Portieri ({portiere.length})</h3>
      {portiere.length === 0 && <p className="sub-intro">Nessuna domanda ancora.</p>}
      {portiere.map((f) => <FaqRiga key={f.id} f={f} onChanged={() => router.refresh()} />)}
    </div>
  )
}

function FaqRiga({ f, onChanged }) {
  const [categoria, setCategoria] = useState(f.categoria)
  const [domanda, setDomanda] = useState(f.domanda)
  const [risposta, setRisposta] = useState(f.risposta)
  const [ordine, setOrdine] = useState(f.ordine)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('faq_interne').update({
      categoria: categoria.trim() || 'Senza categoria',
      domanda: domanda.trim(),
      risposta: risposta.trim(),
      ordine: Number(ordine) || 0,
    }).eq('id', f.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false)
    onChanged()
  }

  async function elimina() {
    if (!confirm('Eliminare questa domanda?')) return
    const supabase = createClient()
    await supabase.from('faq_interne').delete().eq('id', f.id)
    onChanged()
  }

  return (
    <div className="scheda" style={{ marginBottom: 10 }}>
      <div className="form-grid">
        <div className="field">
          <label>Categoria</label>
          <input value={categoria} onChange={(e) => { setCategoria(e.target.value); setDone(false) }} />
        </div>
        <div className="field">
          <label>Ordine</label>
          <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} style={{ width: 90 }} />
        </div>
        <div className="field field-full">
          <label>Domanda</label>
          <input value={domanda} onChange={(e) => { setDomanda(e.target.value); setDone(false) }} />
        </div>
        <div className="field field-full">
          <label>Risposta</label>
          <textarea rows="3" value={risposta} onChange={(e) => { setRisposta(e.target.value); setDone(false) }} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost btn-del" onClick={elimina} type="button">Elimina</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva'}</button>
      </div>
    </div>
  )
}
