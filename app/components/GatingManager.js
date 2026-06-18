'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GatingManager({ funzionalita, tuttoFree: tuttoFreeIniziale, feeContatto: feeIniziale }) {
  const router = useRouter()
  const [tuttoFree, setTuttoFree] = useState(tuttoFreeIniziale)
  const [stato, setStato] = useState(() => {
    const m = {}
    for (const f of funzionalita) m[f.chiave] = f.free
    return m
  })
  const [fee, setFee] = useState(feeIniziale ?? '2.90')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setSaving(true); setDone(false)
    const supabase = createClient()

    const rows = [
      { chiave: '__tutto_free', label: 'Tutto free', free: tuttoFree },
      { chiave: 'fee_contatto_importo', label: fee, free: false },
      ...funzionalita.map((f) => ({
        chiave: f.chiave, label: f.label, free: stato[f.chiave] ?? f.free,
      })),
    ]
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
        <b> TUTTO FREE</b> sblocca tutto per tutti temporaneamente.
      </p>

      {/* Interruttore globale */}
      <div className="scheda" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🌐 TUTTO FREE</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 3 }}>
            Tutti gli allenatori accedono a tutto senza abbonamento. Utile per periodi di prova.
          </div>
        </div>
        <button type="button" className={`toggle-switch ${tuttoFree ? 'on' : ''}`}
          onClick={() => { setTuttoFree((v) => !v); setDone(false) }}
          role="switch" aria-checked={tuttoFree}>
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Fee contatto allenatore */}
      <div className="scheda" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 10px' }}>💳 Fee sblocco contatti allenatore</h3>
        <p className="sub-intro" style={{ margin: '0 0 12px' }}>
          Chi cerca un allenatore dalla home pubblica vede bio, esperienze e certificati gratuitamente.
          Per vedere telefono ed email paga questa fee una tantum (in euro).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>€</span>
          <input
            type="number"
            min="0.50"
            step="0.10"
            value={fee}
            onChange={(e) => { setFee(e.target.value); setDone(false) }}
            style={{ width: 90, padding: '8px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', fontSize: 16 }}
          />
          <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>pagamento una tantum per allenatore</span>
        </div>
      </div>

      {/* Funzionalità singole */}
      <div className="elenco-blocco">
        <h3>Funzionalità app</h3>
        <p className="sub-intro">Attive solo quando TUTTO FREE è disattivato.</p>
        {funzionalita.map((f) => (
          <div key={f.chiave} className="lista-riga" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: stato[f.chiave] ? 'var(--campo)' : 'var(--rosso)', marginTop: 2 }}>
                {stato[f.chiave] ? '✓ FREE — tutti possono usarla' : '🔒 A pagamento — richiede abbonamento'}
              </div>
            </div>
            <button type="button"
              className={`toggle-switch sm ${stato[f.chiave] ? 'on' : ''}`}
              onClick={() => toggle(f.chiave)}
              role="switch" aria-checked={stato[f.chiave]}>
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
