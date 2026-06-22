'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COLORI = {
  'Capitano': '#0a7ec2',
  'Talento': '#e8a72c',
  'Leader': '#7c3aed',
  'Da osservare': '#4a5b68',
  'Recupero infortunio': '#c0392b',
}
const colore = (tag) => COLORI[tag] ?? '#1f8a4c'

export default function TagManager({ portiereId, tagAttivi, tagDisponibili }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const attiviSet = new Set(tagAttivi)

  async function toggle(tag) {
    setBusy(true)
    const supabase = createClient()
    if (attiviSet.has(tag)) {
      await supabase.from('portiere_tag').delete().eq('portiere_id', portiereId).eq('tag', tag)
    } else {
      await supabase.from('portiere_tag').insert({ portiere_id: portiereId, tag })
    }
    setBusy(false); router.refresh()
  }

  return (
    <div className="scheda" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>🏷 Tag</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tagDisponibili.map((tag) => {
          const attivo = attiviSet.has(tag)
          const c = colore(tag)
          return (
            <button key={tag} type="button" onClick={() => toggle(tag)} disabled={busy}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${c}`,
                background: attivo ? c : 'transparent',
                color: attivo ? '#fff' : c,
                transition: 'all 0.15s',
              }}>
              {attivo ? '✓ ' : ''}{tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
