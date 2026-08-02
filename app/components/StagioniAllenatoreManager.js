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
  const [eliminaId, setEliminaId] = useState(null) // id della stagione in fase di eliminazione (mostra il pannello)
  const [anteprima, setAnteprima] = useState(null)
  const [nomeDigitato, setNomeDigitato] = useState('')
  const [errore, setErrore] = useState('')
  const [modificaId, setModificaId] = useState(null) // id della stagione in fase di modifica
  const [form, setForm] = useState({ nome: '', societaNome: '', dataInizio: '', dataFine: '' })
  const [erroreMod, setErroreMod] = useState('')

  async function apriEliminazione(s) {
    setEliminaId(s.id); setAnteprima(null); setNomeDigitato(''); setErrore('')
    const res = await fetch('/api/elimina-stagione', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagioneId: s.id, azione: 'anteprima' }),
    })
    const body = await res.json()
    if (!res.ok) { setErrore(body.error); return }
    setAnteprima(body)
  }

  async function confermaEliminazione(s) {
    if (nomeDigitato.trim() !== s.nome) { setErrore('Il nome digitato non corrisponde.'); return }
    if (!confirm(`Ultima conferma: eliminare definitivamente "${s.nome}"${s.societa_nome ? ' — ' + s.societa_nome : ''}? Non si può annullare.`)) return
    setBusy(s.id)
    const res = await fetch('/api/elimina-stagione', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagioneId: s.id, azione: 'elimina', nomeConferma: nomeDigitato.trim() }),
    })
    const body = await res.json()
    setBusy(null)
    if (!res.ok) { setErrore(body.error); return }
    setEliminaId(null)
    router.refresh()
  }

  function apriModifica(s) {
    setEliminaId(null); setModificaId(s.id); setErroreMod('')
    setForm({
      nome: s.nome ?? '',
      societaNome: s.societa_nome ?? '',
      dataInizio: s.data_inizio ?? '',
      dataFine: s.data_fine ?? '',
    })
  }

  async function salvaModifica(s) {
    if (!form.nome.trim()) { setErroreMod('Il nome della stagione è obbligatorio.'); return }
    if (form.dataInizio && form.dataFine && form.dataFine < form.dataInizio) {
      setErroreMod('La data di fine non può essere precedente a quella di inizio.'); return
    }
    setBusy(s.id); setErroreMod('')
    const res = await fetch(`/api/stagioni/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        societaNome: form.societaNome.trim(),
        dataInizio: form.dataInizio || null,
        dataFine: form.dataFine || null,
      }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setErroreMod(body.error || 'Errore durante il salvataggio.'); return }
    setModificaId(null)
    router.refresh()
  }

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
                <button className="btn-mini btn-ghost" type="button" disabled={busy === s.id} onClick={() => apriModifica(s)}>
                  ✎ Modifica
                </button>
                <button className="btn-mini btn-del" type="button" disabled={busy === s.id} onClick={() => apriEliminazione(s)}>
                  🗑 Elimina
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
              <span>📅 {fmtData(s.data_inizio)} → {fmtData(s.data_fine)}</span>
              {!s.attiva && <span style={{ color: 'var(--rosso)' }}>Archiviata</span>}
            </div>

            {modificaId === s.id && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--carta)', border: '1px solid var(--linea)', borderRadius: 8 }}>
                {erroreMod && <div className="err" style={{ marginBottom: 10 }}>{erroreMod}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                    Nome stagione
                    <input value={form.nome}
                      onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setErroreMod('') }}
                      placeholder="Es. 2025-26" />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                    Società <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(facoltativa)</span>
                    <input value={form.societaNome}
                      onChange={(e) => setForm((f) => ({ ...f, societaNome: e.target.value }))}
                      placeholder="Nome del club" />
                  </label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                      Inizio
                      <input type="date" value={form.dataInizio}
                        onChange={(e) => setForm((f) => ({ ...f, dataInizio: e.target.value }))} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
                      Fine
                      <input type="date" value={form.dataFine}
                        onChange={(e) => setForm((f) => ({ ...f, dataFine: e.target.value }))} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <button className="btn-ghost" type="button" onClick={() => { setModificaId(null); setErroreMod('') }}>Annulla</button>
                    <button className="btn" type="button" disabled={busy === s.id || !form.nome.trim()} onClick={() => salvaModifica(s)}>
                      {busy === s.id ? 'Salvataggio...' : 'Salva modifiche'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {eliminaId === s.id && (
              <div style={{ marginTop: 14, padding: 14, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8 }}>
                {errore && <div className="err" style={{ marginBottom: 10 }}>{errore}</div>}
                {!anteprima && !errore && <p className="sub-intro" style={{ margin: 0 }}>Calcolo cosa verrà eliminato…</p>}
                {anteprima && (
                  <>
                    <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--rosso)' }}>
                      ⚠ Eliminando questa stagione sparirà per sempre:
                    </p>
                    <ul style={{ margin: '0 0 14px', paddingLeft: 20, fontSize: 14, color: 'var(--ink)' }}>
                      <li>{anteprima.conteggi.allenamenti} allenamenti ({anteprima.conteggi.valutazioniAllenamento} valutazioni)</li>
                      <li>{anteprima.conteggi.partite} partite ({anteprima.conteggi.valutazioniPartita} valutazioni)</li>
                      <li>{anteprima.conteggi.iscrizioni} iscrizioni portieri</li>
                      <li>{anteprima.conteggi.ricorrenze} ricorrenze impostate</li>
                      <li>{anteprima.conteggi.categorieAttivate} categorie attivate per questa stagione (le categorie in sé restano, solo l&apos;attivazione qui sparisce)</li>
                      {anteprima.conteggi.commentiReport > 0 && <li>{anteprima.conteggi.commentiReport} commenti report stagionale</li>}
                    </ul>
                    <p className="sub-intro" style={{ margin: '0 0 8px' }}>
                      Per confermare, scrivi esattamente il nome della stagione: <b>{s.nome}</b>
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        value={nomeDigitato}
                        onChange={(e) => { setNomeDigitato(e.target.value); setErrore('') }}
                        placeholder={s.nome}
                        style={{ maxWidth: 200 }}
                      />
                      <button className="btn-ghost" type="button" onClick={() => { setEliminaId(null); setErrore('') }}>Annulla</button>
                      <button
                        className="btn"
                        type="button"
                        style={{ background: 'var(--rosso)', borderColor: 'var(--rosso)' }}
                        disabled={busy === s.id || nomeDigitato.trim() !== s.nome}
                        onClick={() => confermaEliminazione(s)}
                      >
                        {busy === s.id ? 'Eliminazione...' : 'Elimina definitivamente'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 8 }}>
        <Link href="/stagioni/nuova" className="btn-ghost">+ Nuova stagione</Link>
      </div>
    </div>
  )
}
