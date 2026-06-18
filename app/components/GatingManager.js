'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GatingManager({ funzionalita, tuttoFree: tuttoFreeIniziale }) {
  const router = useRouter()
  const [tuttoFree, setTuttoFree] = useState(tuttoFreeIniziale)
  const [stato, setStato] = useState(() => {
    const m = {}
    for (const f of funzionalita) m[f.chiave] = f.free
    return m
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setSaving(true); setDone(false)
    const supabase = createClient()

    // Upsert interruttore globale
    await supabase.from('funzionalita_config').upsert(
      { chiave: '__tutto_free', label: 'Tutto free', free: tuttoFree },
      { onConflict: 'chiave' }
    )

    // Upsert ogni funzionalità
    const rows = funzionalita.map((f) => ({
      chiave: f.chiave,
      label: f.label,
      free: stato[f.chiave] ?? f.free,
    }))
    const { error } = await supabase.from('funzionalita_config').upsert(rows, { onConflict: 'chiave' })
    if (error) { alert('Errore: ' + error.message); setSaving(false); return }
    setDone(true); setSaving(false); router.refresh()
  }

  function toggle(chiave) {
    setStato((s) => ({ ...s, [chiave]: !s[chiave] }))
    setDone(false)
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Controlla quali funzionalità sono disponibili gratuitamente e quali richiedono un abbonamento.
        L&apos;interruttore <b>TUTTO FREE</b> sblocca temporaneamente tutto per tutti, ignorando le impostazioni singole.
      </p>

      {/* Interruttore globale */}
      <div className="scheda" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🌐 TUTTO FREE</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 3 }}>
            Attivando questo interruttore tutti gli allenatori accedono a tutte le funzionalità senza abbonamento.
            Utile per periodi di prova o manutenzione.
          </div>
        </div>
        <button
          type="button"
          className={`toggle-switch ${tuttoFree ? 'on' : ''}`}
          onClick={() => { setTuttoFree((v) => !v); setDone(false) }}
          aria-checked={tuttoFree}
          role="switch"
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Tabella funzionalità */}
      <div className="elenco-blocco">
        <h3>Funzionalità singole</h3>
        <p className="sub-intro">
          Queste impostazioni si applicano solo quando &ldquo;TUTTO FREE&rdquo; è disattivato.
          <b> FREE</b> = disponibile a tutti · <b>A pagamento</b> = richiede abbonamento attivo.
        </p>
        {funzionalita.map((f) => (
          <div key={f.chiave} className="lista-riga" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: stato[f.chiave] ? 'var(--campo)' : 'var(--rosso)', marginTop: 2 }}>
                {stato[f.chiave] ? '✓ FREE — tutti possono usarla' : '🔒 A pagamento — richiede abbonamento'}
              </div>
            </div>
            <button
              type="button"
              className={`toggle-switch sm ${stato[f.chiave] ? 'on' : ''}`}
              onClick={() => toggle(f.chiave)}
              role="switch"
              aria-checked={stato[f.chiave]}
              title={stato[f.chiave] ? 'Rendi a pagamento' : 'Rendi gratuita'}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <button className="btn" onClick={salva} disabled={saving} type="button">
          {saving ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva configurazione'}
        </button>
      </div>
    </div>
  )
}
