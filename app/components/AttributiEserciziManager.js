'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AttributiEserciziManager({ attributi }) {
  const router = useRouter()
  const [nuovoNome, setNuovoNome] = useState('')
  const [busy, setBusy] = useState(false)

  async function aggiungi() {
    if (!nuovoNome.trim()) return
    setBusy(true)
    const supabase = createClient()
    const maxOrd = attributi.reduce((m, a) => Math.max(m, a.ordine ?? 0), 0)
    await supabase.from('attributi_esercizio').insert({ nome: nuovoNome.trim(), ordine: maxOrd + 1, attivo: true })
    setNuovoNome('')
    setBusy(false)
    router.refresh()
  }

  async function toggleAttivo(id, attuale) {
    const supabase = createClient()
    await supabase.from('attributi_esercizio').update({ attivo: !attuale }).eq('id', id)
    router.refresh()
  }

  async function elimina(id) {
    if (!confirm('Eliminare questo attributo? Verrà rimosso anche dagli esercizi che lo usano.')) return
    const supabase = createClient()
    await supabase.from('attributi_esercizio').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      {attributi.map(a => (
        <div key={a.id} className="lista-riga" style={{ opacity: a.attivo ? 1 : 0.5 }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{a.nome}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {a.attivo ? 'Visibile' : 'Nascosto'}
          </span>
          <button className="btn-mini" type="button" onClick={() => toggleAttivo(a.id, a.attivo)}>
            {a.attivo ? 'Nascondi' : 'Mostra'}
          </button>
          <button className="btn-mini btn-del" type="button" onClick={() => elimina(a.id)}>
            Elimina
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={nuovoNome}
          onChange={e => setNuovoNome(e.target.value)}
          placeholder="es. Esplosività"
          onKeyDown={e => e.key === 'Enter' && aggiungi()}
          style={{ flex: 1 }}
        />
        <button className="btn" type="button" onClick={aggiungi} disabled={busy || !nuovoNome.trim()}>
          + Aggiungi
        </button>
      </div>
    </div>
  )
}
