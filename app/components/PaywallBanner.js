'use client'

import { useState } from 'react'
import Link from 'next/link'

// Dati demo realistici per la preview
const DEMO = {
  nome: 'Marco Rossi',
  stagione: '2024-25',
  presenzeA: 34,
  totA: 38,
  pctPresenza: 89,
  mediaA: 6.72,
  mediaCat: 6.31,
  trend: '+0.18 vs mese scorso',
  streakMax: 12,
  streakAttuale: 5,
  votoMax: 7.75,
  votoMin: 5.25,
  sopraMedia: 21,
  sottoMedia: 13,
  parCamp: 14,
  mediaParCamp: 6.85,
  cleanSheet: 6,
  parAm: 4,
  mediaParAm: 6.40,
  mesi: [
    { label: 'Set', val: 6.3 },
    { label: 'Ott', val: 6.5 },
    { label: 'Nov', val: 6.6 },
    { label: 'Dic', val: 6.8 },
    { label: 'Gen', val: 6.7 },
    { label: 'Feb', val: 6.9 },
  ],
  parametri: [
    { nome: 'Tecnica di base', val: 6.8 },
    { nome: 'Uscite', val: 7.1 },
    { nome: 'Gioco con i piedi', val: 6.2 },
    { nome: 'Posizionamento', val: 6.9 },
    { nome: 'Leadership', val: 6.5 },
  ],
}

function DemoModal({ onClose }) {
  const maxBar = Math.max(...DEMO.mesi.map((m) => m.val))

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box demo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} type="button">✕</button>

        <div className="demo-header">
          <div className="demo-badge">📊 Anteprima esempio</div>
          <h2 style={{ margin: '8px 0 2px' }}>{DEMO.nome}</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: 0 }}>Stagione {DEMO.stagione} — Prima Squadra</p>
        </div>

        {/* Riepilogo numeri chiave */}
        <div className="demo-kpi-grid">
          <div className="demo-kpi">
            <div className="demo-kpi-val">{DEMO.presenzeA}/{DEMO.totA}</div>
            <div className="demo-kpi-label">Presenze</div>
          </div>
          <div className="demo-kpi">
            <div className="demo-kpi-val" style={{ color: 'var(--azzurro)' }}>{DEMO.mediaA}</div>
            <div className="demo-kpi-label">Media voto</div>
          </div>
          <div className="demo-kpi">
            <div className="demo-kpi-val" style={{ color: 'var(--campo)' }}>{DEMO.pctPresenza}%</div>
            <div className="demo-kpi-label">% presenze</div>
          </div>
          <div className="demo-kpi">
            <div className="demo-kpi-val" style={{ color: 'var(--campo)' }}>{DEMO.cleanSheet}</div>
            <div className="demo-kpi-label">Clean sheet</div>
          </div>
        </div>

        {/* Trend e streak */}
        <div className="demo-section">
          <div className="demo-stat-row">
            <span>📈 Trend mensile</span><b style={{ color: 'var(--campo)' }}>{DEMO.trend}</b>
          </div>
          <div className="demo-stat-row">
            <span>🔥 Serie presenze attuale</span><b>{DEMO.streakAttuale} allenamenti consecutivi</b>
          </div>
          <div className="demo-stat-row">
            <span>⭐ Serie massima stagione</span><b>{DEMO.streakMax} consecutivi</b>
          </div>
          <div className="demo-stat-row">
            <span>🏆 Voto migliore</span><b style={{ color: 'var(--campo)' }}>{DEMO.votoMax}</b>
          </div>
          <div className="demo-stat-row">
            <span>📉 Voto peggiore</span><b style={{ color: 'var(--rosso)' }}>{DEMO.votoMin}</b>
          </div>
          <div className="demo-stat-row">
            <span>✅ Allenamenti sopra media</span><b>{DEMO.sopraMedia} su {DEMO.presenzeA}</b>
          </div>
          <div className="demo-stat-row">
            <span>👥 Confronto categoria</span>
            <b style={{ color: 'var(--campo)' }}>+{(DEMO.mediaA - DEMO.mediaCat).toFixed(2)} ▲ sopra media</b>
          </div>
        </div>

        {/* Grafico mensile */}
        <div className="demo-section">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Andamento mensile</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 80 }}>
            {DEMO.mesi.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--azzurro)' }}>{m.val}</div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: `linear-gradient(180deg, var(--azzurro), #0a5a8a)`,
                  height: `${Math.round((m.val / 10) * 60)}px`,
                  minHeight: 4,
                }} />
                <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per caratteristica */}
        <div className="demo-section">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Per caratteristica</div>
          {DEMO.parametri.map((p) => (
            <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-soft)' }}>{p.nome}</span>
              <div style={{ width: 100, height: 6, background: 'var(--linea)', borderRadius: 3, flexShrink: 0 }}>
                <div style={{ width: `${(p.val / 10) * 100}%`, height: '100%', background: 'var(--azzurro)', borderRadius: 3 }} />
              </div>
              <b style={{ fontSize: 13, minWidth: 28, textAlign: 'right' }}>{p.val}</b>
            </div>
          ))}
        </div>

        {/* Partite */}
        <div className="demo-section">
          <div className="demo-stat-row">
            <span>⚽ Partite campionato</span><b>{DEMO.parCamp} · media {DEMO.mediaParCamp}</b>
          </div>
          <div className="demo-stat-row">
            <span>🏳️ Amichevoli</span><b>{DEMO.parAm} · media {DEMO.mediaParAm}</b>
          </div>
        </div>

        {/* CTA */}
        <div className="demo-cta">
          <p>Queste sono le statistiche <b>reali</b> che vedrai con i tuoi dati di stagione.</p>
          <Link href="/abbonati" className="btn" style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: 10 }}>
            🔓 Sblocca le statistiche — Abbonati
          </Link>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, textAlign: 'center' }}>
            Disdici in qualsiasi momento · Pagamento sicuro via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaywallBanner({ chiave, label, wrap = false, children, mostraDemo = false }) {
  const [demoOpen, setDemoOpen] = useState(false)

  const banner = (
    <div className="paywall-banner">
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      <div className="paywall-icon">🔒</div>
      <div className="paywall-text">
        <b>{label ?? 'Funzionalità a pagamento'}</b>
        <p>Abbonati per sbloccare questa sezione.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {mostraDemo && (
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--azzurro)', borderRadius: 'var(--r-sm)',
              background: 'transparent', color: 'var(--azzurro)', whiteSpace: 'nowrap',
            }}
          >
            👁 Vedi anteprima
          </button>
        )}
        <Link href="/abbonati" className="btn paywall-cta">Abbonati</Link>
      </div>
    </div>
  )

  if (!wrap) return banner

  return (
    <div className="paywall-wrap">
      <div className="paywall-overlay" aria-hidden="true">{banner}</div>
      <div className="paywall-content" inert="true">{children}</div>
    </div>
  )
}
