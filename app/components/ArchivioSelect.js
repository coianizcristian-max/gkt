'use client'

import { useRouter } from 'next/navigation'

export default function ArchivioSelect({ stagioni, selectedId }) {
  const router = useRouter()
  return (
    <div className="cal-bar">
      <label className="lista-ord" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        Stagione
        <select value={selectedId} onChange={(e) => router.push(`/archivio?stagione=${e.target.value}`)}>
          {stagioni.map((s) => <option key={s.id} value={s.id}>{s.nome}{s.attiva ? ' (attiva)' : ''}</option>)}
        </select>
      </label>
    </div>
  )
}
