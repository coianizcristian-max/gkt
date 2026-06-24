'use client'

import { useState } from 'react'

// Voci fisse con le loro label e chiavi — label è solo display,
// chiave è quella salvata in DB e usata dal layout
const VOCI_DEFAULT = [
  { chiave: 'dashboard',     label: 'Dashboard' },
  { chiave: 'portieri',      label: 'Portieri / La mia scheda' },
  { chiave: 'calendario',    label: 'Calendario' },
  { chiave: 'ricorrenze',    label: 'Ricorrenze' },
  { chiave: 'partite',       label: 'Partite' },
  { chiave: 'statistiche',   label: 'Statistiche' },
  { chiave: 'esercizi',      label: 'Esercizi' },
  { chiave: 'profilo',       label: 'Profilo allenatore' },
  { chiave: 'inviti',        label: 'Inviti' },
  { chiave: 'contatti',      label: 'Contatti ricevuti' },
  { chiave: 'come-iniziare', label: 'Come iniziare' },
  { chiave: 'archivio',      label: 'Archivio' },
  { chiave: 'suggerimenti',  label: 'Suggerimenti' },
  { chiave: 'newsletter',    label: 'Newsletter' },
  { chiave: 'account',       label: 'Account' },
  { chiave: 'supervisore',   label: 'Supervisore' },
  { chiave: 'abbonati',      label: 'Abbonati' },
]

export default function SidebarOrdineEditor({ ordineIniziale }) {
  // Costruisce lista partendo dall'ordine salvato, aggiungendo eventuali voci nuove in fondo
  const init = () => {
    const salvate = ordineIniziale ?? []
    const byChiave = {}
    for (const r of salvate) byChiave[r.chiave] = r

    const lista = VOCI_DEFAULT.map((v) => ({
      ...v,
      ordine: byChiave[v.chiave]?.ordine ?? 99,
    })).sort((a, b) => a.ordine - b.ordine)

    return lista
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
    const payload = voci.map((v, i) => ({ chiave: v.chiave, ordine: i + 1, label: v.label }))
    const res = await fetch('/api/sidebar-ordine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voci: payload }),
    })
    const body = await res.json()
    if (!res.ok) { setErr(body.error ?? 'Errore.'); setBusy(false); return }
    setSalvato(true)
    setBusy(false)
  }

  return (
    <div className="lista-editor" style={{ maxWidth: 480 }}>
      <p className="sub-intro" style={{ marginBottom: 16 }}>
        Trascina (con ↑ ↓) le voci per cambiare l&apos;ordine nella sidebar sinistra.
        L&apos;ordine viene applicato a tutti gli utenti al prossimo caricamento della pagina.
        Le voci che non si applicano al ruolo dell&apos;utente restano comunque nascoste.
      </p>

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
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{v.label}</span>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                className="btn-mini"
                type="button"
                onClick={() => sposta(idx, -1)}
                disabled={idx === 0}
                title="Sposta su"
                style={{ padding: '2px 8px', opacity: idx === 0 ? 0.3 : 1 }}
              >↑</button>
              <button
                className="btn-mini"
                type="button"
                onClick={() => sposta(idx, 1)}
                disabled={idx === voci.length - 1}
                title="Sposta giù"
                style={{ padding: '2px 8px', opacity: idx === voci.length - 1 ? 0.3 : 1 }}
              >↓</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio...' : 'Salva ordine'}
        </button>
        {salvato && <span style={{ color: 'var(--campo)', fontSize: 13, fontWeight: 600 }}>✓ Salvato</span>}
      </div>

      <p className="sub-intro" style={{ marginTop: 12, fontSize: 12 }}>
        Nota: l&apos;ordine si aggiorna al prossimo caricamento della pagina per tutti gli utenti.
        Non è necessario rifare il deploy.
      </p>
    </div>
  )
}
