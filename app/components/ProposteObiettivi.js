'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const STATI = {
  da_gestire:  { labelKey: 'daGestire',  glifo: '☐', colore: 'var(--ink-soft)' },
  gestito:     { labelKey: 'gestito',    glifo: '✔', colore: 'var(--campo)' },
  non_gestito: { labelKey: 'nonGestito', glifo: '✘', colore: 'var(--rosso)' },
}

export default function ProposteObiettivi({ portiereId, stagioneId, ruolo, proposte = [] }) {
  const t = useTranslations('proposteObiettivi')
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
    if (!confirm(t('confermaElim'))) return
    const supabase = createClient()
    const { error } = await supabase.from('proposte_obiettivi').delete().eq('id', prop.id)
    if (error) { setError(error.message); return }
    setLista((l) => l.filter((p) => p.id !== prop.id))
    router.refresh()
  }

  const pendenti = lista.filter((p) => p.stato === 'da_gestire').length

  return (
    <div className="lista-editor">
      <p className="sub-intro">{isCoach ? t('introCoach') : t('introPortiere')}</p>

      {isCoach && pendenti > 0 && (
        <div className="scheda" style={{ marginBottom: 12, borderLeft: '4px solid var(--giallo)' }}>
          {t.rich('pendenti', { n: pendenti, b: (ch) => <b style={{ color: 'var(--giallo)' }}>{ch}</b> })}
        </div>
      )}

      {error && <div className="err">{error}</div>}

      <div className="obiettivo-card" style={{ borderLeftColor: 'var(--azzurro)', marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field field-full">
            <label>{t('nuovaLabel')}</label>
            <textarea
              rows={3}
              value={nuovo}
              onChange={(e) => setNuovo(e.target.value)}
              placeholder={t('placeholder')}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={aggiungi} disabled={busy || !nuovo.trim()}>
            {busy ? t('aggiungo') : t('aggiungi')}
          </button>
        </div>
      </div>

      {lista.length === 0 && <div className="empty">{t('nessuna')}</div>}

      {lista.map((p) => {
        const st = STATI[p.stato] ?? STATI.da_gestire
        return (
          <div key={p.id} className="obiettivo-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {isCoach ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {Object.entries(STATI).map(([k, s]) => (
                  <button
                    key={k}
                    type="button"
                    title={t(s.labelKey)}
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
                title={t(st.labelKey)}
                style={{
                  width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${st.colore}`, color: st.colore,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 17,
                }}
              >{st.glifo}</div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>{p.testo}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                <span style={{ color: st.colore, fontWeight: 600 }}>{st.glifo} {t(st.labelKey)}</span>
              </div>
            </div>

            {(isCoach || p.stato === 'da_gestire') && (
              <button type="button" className="btn-mini btn-del" style={{ flexShrink: 0 }} onClick={() => elimina(p)}>{t('elimina')}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
