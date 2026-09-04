'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEFAULT = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

// Appiattisce l'albero ricevuto dal server in un elenco ordinato con livello,
// così possiamo indentare le sotto-funzionalità sotto il padre.
function flatten(albero) {
  const out = []
  const visita = (nodo, livello) => {
    out.push({ chiave: nodo.chiave, label: nodo.label, free: nodo.free, livello })
    for (const f of nodo.figli ?? []) visita(f, livello + 1)
  }
  for (const s of albero) {
    out.push({ sezione: s.sezione })
    for (const f of s.funzionalita) visita(f, 0)
  }
  return out
}

export default function GatingManager({
  albero,
  tuttoFree: tuttoFreeIniziale,
  feeContatto: feeIniziale,
  prezziIniziali,
  giorniIniziali,
  lifetimeIniziale,
}) {
  const router = useRouter()
  const righe = flatten(albero)

  const [tuttoFree, setTuttoFree] = useState(tuttoFreeIniziale)
  const [stato, setStato] = useState(() => {
    const m = {}
    for (const r of righe) if (r.chiave) m[r.chiave] = r.free
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
  const [giorni, setGiorni] = useState({
    allenatore: giorniIniziali?.allenatore ?? '30',
    portiere:   giorniIniziali?.portiere   ?? '30',
  })
  const [lifetime, setLifetime] = useState({
    allenatore: lifetimeIniziale?.allenatore ?? true,
    portiere:   lifetimeIniziale?.portiere   ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const tocca = () => setDone(false)
  const updPrezzo = (ruolo, piano) => (e) => { setPrezzi((s) => ({ ...s, [ruolo]: { ...s[ruolo], [piano]: e.target.value } })); tocca() }
  const updGiorni = (ruolo) => (e) => { setGiorni((s) => ({ ...s, [ruolo]: e.target.value })); tocca() }
  const toggleLifetime = (ruolo) => { setLifetime((s) => ({ ...s, [ruolo]: !s[ruolo] })); tocca() }
  function toggle(chiave) { setStato((s) => ({ ...s, [chiave]: !s[chiave] })); tocca() }

  async function salva() {
    setSaving(true); setDone(false)
    const supabase = createClient()

    const rows = [
      { chiave: '__tutto_free',         label: 'Tutto free', free: tuttoFree },
      { chiave: 'fee_contatto_importo', label: fee,          free: false },
      { chiave: 'prezzo_allenatore_mensile',  label: prezzi.allenatore.mensile,  free: false },
      { chiave: 'prezzo_allenatore_annuale',  label: prezzi.allenatore.annuale,  free: false },
      { chiave: 'prezzo_allenatore_lifetime', label: prezzi.allenatore.lifetime, free: false },
      { chiave: 'prezzo_portiere_mensile',    label: prezzi.portiere.mensile,    free: false },
      { chiave: 'prezzo_portiere_annuale',    label: prezzi.portiere.annuale,    free: false },
      { chiave: 'prezzo_portiere_lifetime',   label: prezzi.portiere.lifetime,   free: false },
      { chiave: 'giorni_prova_allenatore',    label: String(giorni.allenatore || '0'), free: false },
      { chiave: 'giorni_prova_portiere',      label: String(giorni.portiere   || '0'), free: false },
      { chiave: 'lifetime_attivo_allenatore', label: 'A vita attivo (allenatore)', free: lifetime.allenatore },
      { chiave: 'lifetime_attivo_portiere',   label: 'A vita attivo (portiere)',   free: lifetime.portiere },
      // Un record per ogni funzionalità (foglie + padri): salva lo stato free/paid.
      ...righe.filter((r) => r.chiave).map((r) => ({ chiave: r.chiave, label: r.label, free: stato[r.chiave] ?? r.free })),
    ]
    const { error } = await supabase.from('funzionalita_config').upsert(rows, { onConflict: 'chiave' })
    if (error) { alert('Errore: ' + error.message); setSaving(false); return }
    setDone(true); setSaving(false); router.refresh()
  }

  const PrezzoField = ({ ruolo, piano, label }) => (
    <div className="prezzo-field-row">
      <span className="prezzo-field-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>€</span>
        <input type="number" min="0.50" step="0.10" value={prezzi[ruolo][piano]}
          onChange={updPrezzo(ruolo, piano)} className="prezzo-field-input" />
      </div>
    </div>
  )

  return (
    <div className="lista-editor">
      <p className="sub-intro">Configura prezzi, prova gratuita, funzionalità e accessi. Clicca <b>Salva</b> in fondo per applicare tutte le modifiche.</p>

      {/* TUTTO FREE */}
      <div className="scheda" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🌐 TUTTO FREE</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 3 }}>Tutti accedono a tutto senza abbonamento. Utile per periodi di prova.</div>
        </div>
        <button type="button" className={`toggle-switch ${tuttoFree ? 'on' : ''}`}
          onClick={() => { setTuttoFree((v) => !v); tocca() }} role="switch" aria-checked={tuttoFree}>
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
            <div className="prezzo-field-row" style={{ marginTop: 2 }}>
              <span className="prezzo-field-label" style={{ fontSize: 12, color: lifetime.allenatore ? 'var(--ink-soft)' : 'var(--rosso)' }}>
                Piano «A vita» {lifetime.allenatore ? 'mostrato' : 'nascosto'}
              </span>
              <button type="button" className={`toggle-switch sm ${lifetime.allenatore ? 'on' : ''}`}
                onClick={() => toggleLifetime('allenatore')} role="switch" aria-checked={lifetime.allenatore}>
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Portiere</div>
            <PrezzoField ruolo="portiere" piano="mensile"  label="Mensile" />
            <PrezzoField ruolo="portiere" piano="annuale"  label="Annuale" />
            <PrezzoField ruolo="portiere" piano="lifetime" label="A vita" />
            <div className="prezzo-field-row" style={{ marginTop: 2 }}>
              <span className="prezzo-field-label" style={{ fontSize: 12, color: lifetime.portiere ? 'var(--ink-soft)' : 'var(--rosso)' }}>
                Piano «A vita» {lifetime.portiere ? 'mostrato' : 'nascosto'}
              </span>
              <button type="button" className={`toggle-switch sm ${lifetime.portiere ? 'on' : ''}`}
                onClick={() => toggleLifetime('portiere')} role="switch" aria-checked={lifetime.portiere}>
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
        <p className="sub-intro" style={{ marginTop: 12 }}>
          Se hai configurato i Price ID Stripe nelle variabili d&apos;ambiente, i prezzi Stripe avranno la precedenza.
          Per usare questi prezzi dinamici, lascia vuote le variabili STRIPE_PRICE_*.
        </p>
      </div>

      {/* Prova gratuita */}
      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 6px' }}>🎁 Prova gratuita alla prima iscrizione</h3>
        <p className="sub-intro" style={{ marginTop: 0, marginBottom: 12 }}>
          Giorni di accesso completo concessi <b>una sola volta</b>, alla prima iscrizione. Alla scadenza si resta sul piano free
          finché non si sottoscrive un abbonamento. Metti <b>0</b> per disattivare la prova.
        </p>
        <div className="prezzi-grid">
          <div className="prezzo-field-row">
            <span className="prezzo-field-label">Allenatore / Staff</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input type="number" min="0" step="1" value={giorni.allenatore}
                onChange={updGiorni('allenatore')} className="prezzo-field-input" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>gg</span>
            </div>
          </div>
          <div className="prezzo-field-row">
            <span className="prezzo-field-label">Portiere</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input type="number" min="0" step="1" value={giorni.portiere}
                onChange={updGiorni('portiere')} className="prezzo-field-input" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>gg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee contatto */}
      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px' }}>💳 Fee sblocco contatti allenatore</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>€</span>
          <input type="number" min="0.50" step="0.10" value={fee}
            onChange={(e) => { setFee(e.target.value); tocca() }}
            style={{ width: 90, padding: '8px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', fontSize: 16 }} />
          <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>una tantum per allenatore</span>
        </div>
      </div>

      {/* Funzionalità (albero) */}
      <div className="elenco-blocco">
        <h3>Funzionalità app</h3>
        <p className="sub-intro" style={{ marginTop: 0 }}>
          Ogni interruttore è indipendente. Le sotto-voci sono indentate sotto la funzionalità padre.
        </p>
        {righe.map((r, i) => {
          if (r.sezione) {
            return (
              <div key={`sez-${i}`} style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--ink-soft)', margin: '18px 0 6px',
              }}>
                {r.sezione}
              </div>
            )
          }
          const isFiglio = r.livello > 0
          const on = stato[r.chiave]
          return (
            <div key={r.chiave} className="lista-riga" style={{ gap: 12, paddingLeft: isFiglio ? 22 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: isFiglio ? 500 : 600, fontSize: 14 }}>
                  {isFiglio && <span style={{ color: 'var(--ink-soft)', marginRight: 6 }}>↳</span>}
                  {r.label}
                </div>
                <div style={{ fontSize: 12, color: on ? 'var(--campo)' : 'var(--rosso)', marginTop: 2 }}>
                  {on ? '✓ FREE' : '🔒 A pagamento'}
                </div>
              </div>
              <button type="button" className={`toggle-switch sm ${on ? 'on' : ''}`}
                onClick={() => toggle(r.chiave)} role="switch" aria-checked={!!on}>
                <span className="toggle-thumb" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <button className="btn" onClick={salva} disabled={saving} type="button">
          {saving ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva configurazione'}
        </button>
      </div>
    </div>
  )
}
