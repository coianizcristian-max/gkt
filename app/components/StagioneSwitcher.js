'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StagioneSwitcher({ stagioni, stagioneCorrenteId }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function cambia(e) {
    const id = e.target.value
    if (!id || id === stagioneCorrenteId) return
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profili').update({ stagione_corrente_id: id }).eq('id', user.id)
    if (error) alert('Errore: ' + error.message)
    setBusy(false)
    router.refresh()
  }

  // Se c'è una sola stagione attiva, non serve nessun selettore: solo etichetta.
  if (stagioni.length <= 1) {
    const s = stagioni[0]
    return s ? <span className="brand-stagione">{s.societa_nome ? `${s.nome} · ${s.societa_nome}` : s.nome}</span> : null
  }

  return (
    <div className="brand-stagione-switch-wrap">
      <select
        className="brand-stagione-switch"
        value={stagioneCorrenteId ?? ''}
        onChange={cambia}
        disabled={busy}
      >
        {stagioni.map((s) => (
          <option key={s.id} value={s.id}>
            {s.societa_nome ? `${s.nome} · ${s.societa_nome}` : s.nome}
          </option>
        ))}
      </select>
      <span className="brand-stagione-switch-arrow" aria-hidden="true">▾</span>
    </div>
  )
}
