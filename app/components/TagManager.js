'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { etichettaTag } from '@/lib/tagPortiere'

const COLORI = {
  'Capitano': '#0a7ec2',
  'Talento': '#e8a72c',
  'Leader': '#7c3aed',
  'Da osservare': '#4a5b68',
  'Recupero infortunio': '#c0392b',
}
const colore = (tag) => COLORI[tag] ?? '#1f8a4c'
// I valori dei tag restano in italiano nel DB; qui si localizza solo l'etichetta.
// Mappa condivisa con PortieriSearch: vedi lib/tagPortiere.js

export default function TagManager({ portiereId, tagAttivi, tagDisponibili }) {
  const t = useTranslations('tagManager')
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const attiviSet = new Set(tagAttivi)
  const labelTag = (tag) => etichettaTag(tag, t)

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
    <div className="scheda tag-scheda" style={{ marginBottom: 16 }}>
      {/* titolo e tag sulla stessa riga: occupano poco spazio */}
      <div className="tag-riga">
        <span className="tag-tit">{t('titolo')}</span>
        {tagDisponibili.map((tag) => {
          const attivo = attiviSet.has(tag)
          const c = colore(tag)
          return (
            <button key={tag} type="button" onClick={() => toggle(tag)} disabled={busy}
              className="tag-chip"
              style={{ borderRadius: 999, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${c}`, background: attivo ? c : 'transparent', color: attivo ? '#fff' : c, transition: 'all 0.15s' }}>
              {attivo ? '✓ ' : ''}{labelTag(tag)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
