'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEP_ANNO      = 1
const STEP_SOCIETA   = 2
const STEP_DATE      = 3
const STEP_CATEGORIE = 4

// redirectAfter: dove mandare dopo la creazione (default /dashboard)
// isNuova: true se è una stagione aggiuntiva (non primo accesso)
export default function SetupWizard({ anniDisponibili, ownerId, redirectAfter = '/dashboard', isNuova = false }) {
  const router = useRouter()
  const [step, setStep]         = useState(STEP_ANNO)
  const [anno, setAnno]         = useState(null)
  const [societa, setSocieta]   = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine]     = useState('')
  const [categorie, setCategorie]   = useState([''])
  const [renderAttiva, setRenderAttiva] = useState(!isNuova) // primo accesso → attiva subito
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  // ── Step 1: anno ──────────────────────────────────────────────
  if (step === STEP_ANNO) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">Passo 1 di 4</div>
            <h2>{isNuova ? 'Nuova stagione' : 'Benvenuto in GKSeason!'}</h2>
            <p className="sub-intro">
              {isNuova
                ? 'Crea una nuova stagione: puoi cambiare società, date e categorie rispetto a quelle precedenti.'
                : 'Prima di iniziare, configura la tua stagione. Ci vogliono meno di 2 minuti.'}
            </p>
          </div>

          <h3 className="wizard-sezione">Seleziona l&apos;anno della stagione</h3>
          <div className="wizard-anni">
            {anniDisponibili.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`wizard-anno-btn ${anno?.id === a.id ? 'selected' : ''}`}
                onClick={() => setAnno(a)}
              >
                {a.nome}
              </button>
            ))}
          </div>

          {isNuova && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={renderAttiva}
                onChange={(e) => setRenderAttiva(e.target.checked)}
              />
              Passa subito a lavorare su questa stagione
            </label>
          )}

          <div className="wizard-footer">
            {isNuova && (
              <button className="btn-ghost" type="button" onClick={() => router.back()}>
                ← Annulla
              </button>
            )}
            <button
              className="btn"
              disabled={!anno}
              onClick={() => setStep(STEP_SOCIETA)}
              type="button"
            >
              Continua →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: società ───────────────────────────────────────────
  if (step === STEP_SOCIETA) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">Passo 2 di 4 · Stagione {anno.nome}</div>
            <h2>Nome della società</h2>
            <p className="sub-intro">
              Apparirà nell&apos;intestazione dell&apos;area riservata e nei documenti esportati.
            </p>
          </div>

          <div className="field">
            <label>Nome società / club</label>
            <input
              value={societa}
              onChange={(e) => setSocieta(e.target.value)}
              placeholder="es. A.S.D. Azzurra Sandrigo"
              autoFocus
            />
          </div>

          <div className="wizard-footer">
            <button className="btn-ghost" onClick={() => setStep(STEP_ANNO)} type="button">← Indietro</button>
            <button
              className="btn"
              disabled={!societa.trim()}
              onClick={() => setStep(STEP_DATE)}
              type="button"
            >
              Continua →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: date ──────────────────────────────────────────────
  if (step === STEP_DATE) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">Passo 3 di 4 · {societa} · {anno.nome}</div>
            <h2>Date della stagione</h2>
            <p className="sub-intro">
              Servono per generare automaticamente gli allenamenti dalle ricorrenze.
              Puoi modificarle in qualsiasi momento da Supervisore → Stagioni.
            </p>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Data inizio</label>
              <input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
            </div>
            <div className="field">
              <label>Data fine</label>
              <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
            </div>
          </div>

          <p className="sub-intro" style={{ fontSize: 12, marginTop: 4 }}>
            💡 Le date sono facoltative — puoi saltare e impostarle dopo.
          </p>

          <div className="wizard-footer">
            <button className="btn-ghost" onClick={() => setStep(STEP_SOCIETA)} type="button">← Indietro</button>
            <button className="btn" onClick={() => setStep(STEP_CATEGORIE)} type="button">
              Continua →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4: categorie ─────────────────────────────────────────
  function aggiungiCategoria() { setCategorie((p) => [...p, '']) }
  function rimuoviCategoria(idx) { setCategorie((p) => p.filter((_, i) => i !== idx)) }
  function aggiornaCategoria(idx, val) { setCategorie((p) => p.map((c, i) => i === idx ? val : c)) }

  async function crea() {
    const catValide = categorie.map((c) => c.trim()).filter(Boolean)
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/crea-stagione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annoNome: anno.nome,
          societa: societa.trim(),
          dataInizio: dataInizio || null,
          dataFine: dataFine || null,
          categorie: catValide,
          renderAttiva,
        }),
      })
      const body = await res.json()
      if (!res.ok) { setErr(body.error ?? 'Errore.'); setBusy(false); return }
      // Hard reload per forzare il server a rileggere la stagione appena creata
      window.location.href = redirectAfter
    } catch (e) { setErr('Errore di rete.'); setBusy(false) }
  }

  return (
    <div className="wizard-wrap">
      <div className="wizard-box">
        <div className="wizard-header">
          <div className="wizard-step-indicator">Passo 4 di 4 · {societa} · {anno.nome}</div>
          <h2>Categorie della stagione</h2>
          <p className="sub-intro">
            Aggiungi le squadre/categorie che alleni (es. Under 15, Under 17, Prima Squadra).
            Puoi aggiungerne altre in qualsiasi momento da Le mie categorie.
          </p>
        </div>

        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {categorie.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8 }}>
              <input
                value={c}
                onChange={(e) => aggiornaCategoria(idx, e.target.value)}
                placeholder={`Categoria ${idx + 1} (es. Under 17)`}
                style={{ flex: 1 }}
                autoFocus={idx === categorie.length - 1}
              />
              {categorie.length > 1 && (
                <button className="btn-mini btn-del" type="button" onClick={() => rimuoviCategoria(idx)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <button className="btn-ghost" type="button" onClick={aggiungiCategoria} style={{ marginBottom: 12 }}>
          + Aggiungi categoria
        </button>

        <p className="sub-intro" style={{ fontSize: 12 }}>
          💡 Puoi saltare e aggiungere le categorie dopo.
        </p>

        {renderAttiva && isNuova && (
          <div className="err" style={{ marginTop: 12, background: 'rgba(10,126,194,0.10)', borderColor: 'var(--azzurro)', color: 'var(--azzurro)' }}>
            ℹ️ Passerai subito a lavorare su questa stagione. Quella attuale resta comunque attiva: potrai
            tornarci quando vuoi dal selettore in alto a sinistra.
          </div>
        )}

        <div className="wizard-footer">
          <button className="btn-ghost" onClick={() => setStep(STEP_DATE)} type="button">← Indietro</button>
          <button className="btn" onClick={crea} disabled={busy} type="button">
            {busy ? 'Creazione...' : '🚀 Crea stagione'}
          </button>
        </div>
      </div>
    </div>
  )
}
