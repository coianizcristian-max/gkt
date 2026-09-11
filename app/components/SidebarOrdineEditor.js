'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

// chiave = salvata in DB e usata dal layout; labelIt = etichetta salvata nel payload (invariata).
const VOCI_DEFAULT = [
  { chiave: 'dashboard',     labelIt: 'Dashboard' },
  { chiave: 'portieri',      labelIt: 'Portieri / La mia scheda' },
  { chiave: 'calendario',    labelIt: 'Calendario' },
  { chiave: 'ricorrenze',    labelIt: 'Ricorrenze' },
  { chiave: 'partite',       labelIt: 'Partite' },
  { chiave: 'statistiche',   labelIt: 'Statistiche' },
  { chiave: 'esercizi',      labelIt: 'Esercizi' },
  { chiave: 'profilo',       labelIt: 'Profilo allenatore' },
  { chiave: 'inviti',        labelIt: 'Inviti' },
  { chiave: 'contatti',      labelIt: 'Contatti ricevuti' },
  { chiave: 'come-iniziare', labelIt: 'Come iniziare' },
  { chiave: 'archivio',      labelIt: 'Archivio' },
  { chiave: 'suggerimenti',  labelIt: 'Suggerimenti' },
  { chiave: 'newsletter',    labelIt: 'Newsletter' },
  { chiave: 'account',       labelIt: 'Account' },
  { chiave: 'supervisore',   labelIt: 'Supervisore' },
  { chiave: 'abbonati',      labelIt: 'Abbonati' },
]

export default function SidebarOrdineEditor({ ordineIniziale }) {
  const t = useTranslations('sidebarOrdine')
  const init = () => {
    const salvate = ordineIniziale ?? []
    const byChiave = {}
    for (const r of salvate) byChiave[r.chiave] = r
    return VOCI_DEFAULT.map((v) => ({
      ...v,
      ordine: byChiave[v.chiave]?.ordine ?? 99,
    })).sort((a, b) => a.ordine - b.ordine)
  }

  const [voci, setVoci] = useState(init)
  const [salvato, setSalvato] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function sposta(idx, dir) {
    const nuova = [...voci]
    const target = idx + dir
    if (target < 0 || target >= nuova.length) return
    ;[nuova[idx], nuova[target]] = [nuova[target], nuova[idx]]
    setVoci(nuova)
    setSalvato(false)
  }

  async function salva() {
    setBusy(true); setErr(''); setSalvato(false)
    const payload = voci.map((v, i) => ({ chiave: v.chiave, ordine: i + 1, label: v.labelIt }))
    const res = await fetch('/api/sidebar-ordine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voci: payload }),
    })
    const body = await res.json()
    if (!res.ok) { setErr(body.error ?? t('errore')); setBusy(false); return }
    setSalvato(true)
    setBusy(false)
  }

  return (
    <div className="lista-editor" style={{ maxWidth: 480 }}>
      <p className="sub-intro" style={{ marginBottom: 16 }}>{t('intro')}</p>

      {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}

      <div style={{ border: '1px solid var(--linea)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 16 }}>
        {voci.map((v, idx) => (
          <div
            key={v.chiave}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: idx % 2 === 0 ? 'var(--bianco)' : 'var(--carta)',
              borderBottom: idx < voci.length - 1 ? '1px solid var(--linea)' : 'none',
            }}
          >
            <span style={{ color: 'var(--ink-soft)', fontSize: 13, width: 22, textAlign: 'right', flexShrink: 0 }}>
              {idx + 1}.
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{t('voce_' + v.chiave)}</span>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                className="btn-mini"
                type="button"
                onClick={() => sposta(idx, -1)}
                disabled={idx === 0}
                title={t('su')}
                style={{ padding: '2px 8px', opacity: idx === 0 ? 0.3 : 1 }}
              >↑</button>
              <button
                className="btn-mini"
                type="button"
                onClick={() => sposta(idx, 1)}
                disabled={idx === voci.length - 1}
                title={t('giu')}
                style={{ padding: '2px 8px', opacity: idx === voci.length - 1 ? 0.3 : 1 }}
              >↓</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? t('salvataggio') : t('salva')}
        </button>
        {salvato && <span style={{ color: 'var(--campo)', fontSize: 13, fontWeight: 600 }}>{t('salvato')}</span>}
      </div>

      <p className="sub-intro" style={{ marginTop: 12, fontSize: 12 }}>{t('nota')}</p>
    </div>
  )
}
