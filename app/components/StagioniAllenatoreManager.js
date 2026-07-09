'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function fmtData(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function StagioniAllenatoreManager({ stagioni, ownerId, stagioneCorrenteId }) {
  const router = useRouter()
  const [busy, setBusy] = useState(null) // id della stagione in elaborazione

  async function passaAQuesta(id) {
    setBusy(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profili').update({ stagione_corrente_id: id }).eq('id', user.id)
    if (error) alert('Errore: ' + error.message)
    setBusy(null)
    router.refresh()
  }

  async function archivia(id) {
    if (!confirm('Archiviare questa stagione? Resta tutto conservato, ma sparirà dal selettore rapido finché non la riattivi.')) return
    setBusy(id)
    const supabase = createClient()
    const { error } = await supabase.from('stagioni').update({ attiva: false }).eq('id', id)
    if (error) alert('Errore: ' + error.message)
    setBusy(null)
    router.refresh()
  }

  async function riattiva(id) {
    setBusy(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const e1 = (await supabase.from('stagioni').update({ attiva: true }).eq('id', id)).error
    const e2 = (await supabase.from('profili').update({ stagione_corrente_id: id }).eq('id', user.id)).error
    if (e1 || e2) alert('Errore: ' + (e1 || e2).message)
    setBusy(null)
    router.refresh()
  }

  if (stagioni.length === 0) {
    return (
      <div className="empty">
        Nessuna stagione ancora.{' '}
        <Link href="/stagioni/nuova" className="link-inline">Crea la tua prima stagione →</Link>
      </div>
    )
  }

  return (
    <div className="lista-editor">
      {stagioni.map((s) => {
        const isCorrente = s.id === stagioneCorrenteId
        return (
          <div key={s.id} className={`stagione-card ${isCorrente ? 'attiva' : ''}`}>
            <div className="stagione-top">
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{s.nome}</div>
                {s.societa_nome && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{s.societa_nome}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {isCorrente && <span className="badge-attiva">✓ Stai lavorando qui</span>}
                {!isCorrente && s.attiva && (
                  <button className="btn-mini" type="button" disabled={busy === s.id} onClick={() => passaAQuesta(s.id)}>
                    {busy === s.id ? '...' : 'Passa a questa'}
                  </button>
                )}
                {s.attiva && (
                  <button className="btn-mini btn-ghost" type="button" disabled={busy === s.id} onClick={() => archivia(s.id)}>
                    Archivia
                  </button>
                )}
                {!s.attiva && (
                  <button className="btn-mini" type="button" disabled={busy === s.id} onClick={() => riattiva(s.id)}>
                    {busy === s.id ? '...' : 'Riattiva'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
              <span>📅 {fmtData(s.data_inizio)} → {fmtData(s.data_fine)}</span>
              {!s.attiva && <span style={{ color: 'var(--rosso)' }}>Archiviata</span>}
            </div>
          </div>
        )
      })}

      <div style={{ marginTop: 8 }}>
        <Link href="/stagioni/nuova" className="btn-ghost">+ Nuova stagione</Link>
      </div>
    </div>
  )
}
