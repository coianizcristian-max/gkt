'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEFAULT = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

export default function GatingManager({ funzionalita, tuttoFree: tuttoFreeIniziale, feeContatto: feeIniziale, prezziIniziali }) {
  const router = useRouter()
  const [tuttoFree, setTuttoFree] = useState(tuttoFreeIniziale)
  const [stato, setStato] = useState(() => {
    const m = {}
    for (const f of funzionalita) m[f.chiave] = f.free
    return m
  })
  const [fee, setFee] = useState(feeIniziale ?? '2.90')
  const [prezzi, setPrezzi] = useState({
    allenatore: {
      mensile:  prezziIniziali?.allenatore?.mensile  ?? DEFAULT.allenatore.mensile,
      annuale:  prezziIniziali?.allenatore?.annuale  ?? DEFAULT.allenatore.annuale,
      lifetime: prezziIniziali?.allenatore?.lifetime ?? DEFAULT.allenatore.lifetime,
    },
    portiere: {
      mensile:  prezziIniziali?.portiere?.mensile  ?? DEFAULT.portiere.mensile,
      annuale:  prezziIniziali?.portiere?.annuale  ?? DEFAULT.portiere.annuale,
      lifetime: prezziIniziali?.portiere?.lifetime ?? DEFAULT.portiere.lifetime,
    },
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const updPrezzo = (ruolo, piano) => (e) => {
    setPrezzi((s) => ({ ...s, [ruolo]: { ...s[ruolo], [piano]: e.target.value } }))
    setDone(false)
  }

  async function salva() {
    setSaving(true); setDone(false)
    const supabase = createClient()

    const rows = [
      { chiave: '__tutto_free',            label: 'Tutto free',    free: tuttoFree },
      { chiave: 'fee_contatto_importo',    label: fee,             free: false },
      { chiave: 'prezzo_allenatore_mensile',  label: prezzi.allenatore.mensile,  free: false },
      { chiave: 'prezzo_allenatore_annuale',  label: prezzi.allenatore.annuale,  free: false },
      { chiave: 'prezzo_allenatore_lifetime', label: prezzi.allenatore.lifetime, free: false },
      { chiave: 'prezzo_portiere_mensile',    label: prezzi.portiere.mensile,    free: false },
      { chiave: 'prezzo_portiere_annuale',    label: prezzi.portiere.annuale,    free: false },
      { chiave: 'prezzo_portiere_lifetime',   label: prezzi.portiere.lifetime,   free: false },
      ...funzionalita.map((f) => ({ chiave: f.chiave, label: f.label, free: stato[f.chiave] ?? f.free })),
    ]
    const { error } = await supabase.from('funzionalita_config').upsert(rows, { onConflict: 'chiave' })
    if (error) { alert('Errore: ' + error.message); setSaving(false); return }
    setDone(true); setSaving(false); router.refresh()
  }

  function toggle(chiave) { setStato((s) => ({ ...s, [chiave]: !s[chiave] })); setDone(false) }

  const PrezzoField = ({ ruolo, piano, label }) => (
    <div className="prezzo-field-row">
      <span className="prezzo-field-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>€</span>
        <input type="number" min="0.50" step="0.10" value={prezzi[ruolo][piano]}
          onChange={updPrezzo(ruolo, piano)}
          className="prezzo-field-input" />
      </div>
    </div>
  )

  return (
    <div className="lista-editor">
      <p className="sub-intro">Configura prezzi, funzionalità e accessi. Clicca <b>Salva</b> in fondo per applicare tutte le modifiche.</p>

      {/* TUTTO FREE */}
      <div className="scheda" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🌐 TUTTO FREE</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 3 }}>Tutti accedono a tutto senza abbonamento. Utile per periodi di prova.</div>
        </div>
        <button type="button" className={`toggle-switch ${tuttoFree ? 'on' : ''}`}
          onClick={() => { setTuttoFree((v) => !v); setDone(false) }} role="switch" aria-checked={tuttoFree}>
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Prezzi abbonamento */}
      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>💰 Prezzi abbonamento</h3>
        <div className="prezzi-grid">
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Allenatore / Staff</div>
            <PrezzoField ruolo="allenatore" piano="mensile"  label="Mensile" />
            <PrezzoField ruolo="allenatore" piano="annuale"  label="Annuale" />
            <PrezzoField ruolo="allenatore" piano="lifetime" label="A vita" />
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Portiere</div>
            <PrezzoField ruolo="portiere" piano="mensile"  label="Mensile" />
            <PrezzoField ruolo="portiere" piano="annuale"  label="Annuale" />
            <PrezzoField ruolo="portiere" piano="lifetime" label="A vita" />
          </div>
        </div>
        <p className="sub-intro" style={{ marginTop: 12 }}>
          Se hai configurato i Price ID Stripe nelle variabili d&apos;ambiente, i prezzi Stripe avranno la precedenza.
          Per usare questi prezzi dinamici, lascia vuote le variabili STRIPE_PRICE_*.
        </p>
      </div>

      {/* Fee contatto */}
      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px' }}>💳 Fee sblocco contatti allenatore</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>€</span>
          <input type="number" min="0.50" step="0.10" value={fee}
            onChange={(e) => { setFee(e.target.value); setDone(false) }}
            style={{ width: 90, padding: '8px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', fontSize: 16 }} />
          <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>una tantum per allenatore</span>
        </div>
      </div>

      {/* Funzionalità */}
      <div className="elenco-blocco">
        <h3>Funzionalità app</h3>
        {funzionalita.map((f) => (
          <div key={f.chiave} className="lista-riga" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: stato[f.chiave] ? 'var(--campo)' : 'var(--rosso)', marginTop: 2 }}>
                {stato[f.chiave] ? '✓ FREE' : '🔒 A pagamento'}
              </div>
            </div>
            <button type="button" className={`toggle-switch sm ${stato[f.chiave] ? 'on' : ''}`}
              onClick={() => toggle(f.chiave)} role="switch" aria-checked={stato[f.chiave]}>
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
