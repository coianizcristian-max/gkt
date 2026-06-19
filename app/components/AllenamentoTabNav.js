'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function AllenamentoTabNav({ tabs, tabAttivo }) {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <div className="sub-nav" style={{ marginBottom: 20 }}>
      {tabs.map((t) => (
        <button key={t.id} type="button"
          className={`sub-nav-link ${tabAttivo === t.id ? 'active' : ''}`}
          onClick={() => router.replace(`${pathname}?tab=${t.id}`, { scroll: false })}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
