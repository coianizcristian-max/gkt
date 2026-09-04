'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Stato della proposta ↔ quadratino accanto al testo:
//   da_gestire  → quadratino vuoto  (☐)  — in attesa del preparatore
//   gestito     → spunta verde      (✔)
//   non_gestito → X rossa           (✘)
const STATI = {
  da_gestire:  { label: 'Da gestire',  glifo: '☐', colore: 'var(--ink-soft)' },
  gestito:     { label: 'Gestito',     glifo: '✔', colore: 'var(--campo)' },
  non_gestito: { label: 'Non gestito', glifo: '✘', colore: 'var(--rosso)' },
}

export default function ProposteObiettivi({ portiereId, stagioneId, ruolo, proposte = [] }) {
  const router = useRouter()
  const isCoach = ruolo === 'allenatore' || ruolo === 'staff'
  const [lista, setLista] = useState(proposte)
  const [nuovo, setNuovo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setLista(proposte) }, [proposte])

  async function aggiungi() {
    const testo = nuovo.trim()
    if (!testo) return
    setBusy(true); setError('')
    const supabase = createClient()
    const { data, error } = await supabase.from('proposte_obiettivi')
      .insert({ portiere_id: portiereId, stagione_id: stagioneId ?? null, testo, stato: 'da_gestire' })
      .select('*').single()
    if (error) { setError(error.message); setBusy(false); return }
    setLista((l) => [data, ...l])
    setNuovo(''); setBusy(false)
    router.refresh()
  }

  // Solo il preparatore cambia lo stato (quadratino cliccabile).
  async function cambiaStato(prop, nuovoStato) {
    if (!isCoach) return
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const patch = nuovoStato === 'da_gestire'
      ? { stato: 'da_gestire', gestito_da: null, gestito_il: null }
      : { stato: nuovoStato, gestito_da: user?.id ?? null, gestito_il: new Date().toISOString() }
    const { error } = await supabase.from('proposte_obiettivi').update(patch).eq('id', prop.id)
    if (error) { setError(error.message); return }
    setLista((l) => l.map((p) => (p.id === prop.id ? { ...p, ...patch } : p)))
    router.refresh()
  }

  async function elimina(prop) {
    if (!confirm('Eliminare questa proposta?')) return
    const supabase = createClient()
    const { error } = await supabase.from('proposte_obiettivi').delete().eq('id', prop.id)
    if (error) { setError(error.message); return }
    setLista((l) => l.filter((p) => p.id !== prop.id))
    router.refresh()
  }

  const pendenti = lista.filter((p) => p.stato === 'da_gestire').length

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        {isCoach
          ? 'Le proposte di obiettivo personale arrivate dal portiere. Assegna a ciascuna un esito col quadratino: ✔ gestito (la trasformi/consideri), ✘ non gestito, oppure lasciala ☐ da gestire. Finché resta ☐, il portiere risulta in attesa e vedi l\u2019avviso in dashboard.'
          : 'Qui puoi proporre al tuo preparatore uno o più obiettivi personali: scrivine uno alla volta. Accanto a ogni proposta il quadratino mostra l\u2019esito deciso dal preparatore (☐ in attesa, ✔ gestito, ✘ non gestito): tu puoi vederlo ma non modificarlo.'}
      </p>

      {isCoach && pendenti > 0 && (
        <div className="scheda" style={{ marginBottom: 12, borderLeft: '4px solid var(--giallo)' }}>
          <b style={{ color: 'var(--giallo)' }}>{pendenti}</b> {pendenti === 1 ? 'proposta ancora da gestire' : 'proposte ancora da gestire'}.
        </div>
      )}

      {error && <div className="err">{error}</div>}

      {/* Inserimento (sia preparatore sia portiere) — stessa impaginazione del tab Obiettivi */}
      <div className="obiettivo-card" style={{ borderLeftColor: 'var(--azzurro)', marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field field-full">
            <label>Nuova proposta di obiettivo personale</label>
            <textarea
              rows={3}
              value={nuovo}
              onChange={(e) => setNuovo(e.target.value)}
              placeholder="Scrivi qui la proposta… (es. &ldquo;Migliorare le uscite alte in presa&rdquo;)"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={aggiungi} disabled={busy || !nuovo.trim()}>
            {busy ? 'Aggiungo…' : '+ Aggiungi proposta'}
          </button>
        </div>
      </div>

      {lista.length === 0 && <div className="empty">Nessuna proposta inserita.</div>}

      {lista.map((p) => {
        const st = STATI[p.stato] ?? STATI.da_gestire
        return (
          <div key={p.id} className="obiettivo-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Quadratino stato */}
            {isCoach ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {Object.entries(STATI).map(([k, s]) => (
                  <button
                    key={k}
                    type="button"
                    title={s.label}
                    onClick={() => cambiaStato(p, k)}
                    style={{
                      width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
                      border: p.stato === k ? `2px solid ${s.colore}` : '1px solid var(--linea)',
                      background: p.stato === k ? s.colore : 'var(--carta)',
                      color: p.stato === k ? '#fff' : s.colore,
                      fontWeight: 700, fontSize: 15, lineHeight: 1,
                    }}
                  >{s.glifo}</button>
                ))}
              </div>
            ) : (
              <div
                title={st.label}
                style={{
                  width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${st.colore}`, color: st.colore,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 17,
                }}
              >{st.glifo}</div>
            )}

            {/* Testo + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>{p.testo}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                <span style={{ color: st.colore, fontWeight: 600 }}>{st.glifo} {st.label}</span>
              </div>
            </div>

            {/* Elimina: preparatore sempre, portiere solo se ancora da gestire */}
            {(isCoach || p.stato === 'da_gestire') && (
              <button type="button" className="btn-mini btn-del" style={{ flexShrink: 0 }} onClick={() => elimina(p)}>Elimina</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
