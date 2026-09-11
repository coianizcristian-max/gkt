'use client'

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function ArchivioSelect({ stagioni, selectedId }) {
  const router = useRouter()
  const t = useTranslations('archivioSelect')
  return (
    <div className="cal-bar">
      <label className="lista-ord" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {t('stagione')}
        <select value={selectedId} onChange={(e) => router.push(`/archivio?stagione=${e.target.value}`)}>
          {stagioni.map((s) => <option key={s.id} value={s.id}>{s.nome}{s.attiva ? t('attivaSuffix') : ''}</option>)}
        </select>
      </label>
    </div>
  )
}
