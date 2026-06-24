'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AnniManager({ anni }) {
  const router = useRouter()
  const [nuovoNome, setNuovoNome] = useState('')
  const [busy, setBusy] = useState(false)

  async function aggiungi() {
    if (!nuovoNome.trim()) return
    setBusy(true)
    const supabase = createClient()
    const maxOrd = anni.reduce((m, a) => Math.max(m, a.ordine), 0)
    const { error } = await supabase.from('anni_stagione')
      .insert({ nome: nuovoNome.trim(), ordine: maxOrd + 1, attivo: true })
    if (error) alert('Errore: ' + error.message)
    else { setNuovoNome(''); router.refresh() }
    setBusy(false)
  }

  async function toggleAttivo(id, attivo) {
    const supabase = createClient()
    await supabase.from('anni_stagione').update({ attivo: !attivo }).eq('id', id)
    router.refresh()
  }

  async function elimina(id) {
    if (!confirm('Eliminare questo anno? Non influenza le stagioni già create dagli allenatori.')) return
    const supabase = createClient()
    await supabase.from('anni_stagione').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      {anni.map((a) => (
        <div key={a.id} className="lista-riga" style={{ opacity: a.attivo ? 1 : 0.5 }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{a.nome}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {a.attivo ? 'Visibile agli allenatori' : 'Nascosto'}
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
          onChange={(e) => setNuovoNome(e.target.value)}
          placeholder="es. 2027-28"
          onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
          style={{ flex: 1 }}
        />
        <button className="btn" type="button" onClick={aggiungi} disabled={busy || !nuovoNome.trim()}>
          + Aggiungi anno
        </button>
      </div>
    </div>
  )
}
