'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function ParametriValutazioneManager({ parametri, attiviMap }) {
  const t = useTranslations('parametriValutazione')
  const [stato, setStato] = useState(attiviMap)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(id) {
    setStato((s) => ({ ...s, [id]: !s[id] }))
    setSaved(false)
  }

  async function salva() {
    const attivi = Object.values(stato).filter(Boolean).length
    if (attivi === 0) { alert(t('almenoUno')); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const rows = parametri.map((p) => ({
      allenatore_id: user.id,
      parametro_id: p.id,
      attivo: !!stato[p.id],
    }))
    const { error } = await supabase.from('allenatore_parametri').upsert(rows, { onConflict: 'allenatore_id,parametro_id' })
    if (error) alert(t('errore', { msg: error.message }))
    else setSaved(true)
    setSaving(false)
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">{t('intro')}</p>
      <div className="scheda" style={{ marginBottom: 16 }}>
        {parametri.length === 0 && <p className="sub-intro">{t('nessunParametro')}</p>}
        {parametri.map((p) => (
          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--linea)', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!stato[p.id]} onChange={() => toggle(p.id)} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 14 }}>{p.nome}</span>
          </label>
        ))}
      </div>
      <button className="btn" onClick={salva} disabled={saving} type="button">
        {saving ? t('salvataggio') : saved ? t('salvato') : t('salva')}
      </button>
    </div>
  )
}
