'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT') : '')

// Gestione "assenze annunciate" di un portiere per la stagione corrente.
// È un promemoria puramente informativo: NON incide su presenze né statistiche,
// serve solo a far comparire il portiere fra gli "assenti annunciati" negli
// allenamenti che cadono nelle date indicate.
export default function AssenzePreviste({ iscrizioneId, assenzeIniziali = [] }) {
  const router = useRouter()
  const oggi = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
  const [lista, setLista] = useState(
    [...assenzeIniziali].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
  )
  const [inizio, setInizio] = useState(oggi)
  const [fine, setFine] = useState('')
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function aggiungi() {
    if (!iscrizioneId) { setErr('Iscrizione non trovata per questo portiere.'); return }
    if (!inizio) { setErr('Inserisci la data di inizio.'); return }
    if (fine && fine < inizio) { setErr("La data di fine non può precedere l'inizio."); return }
    setBusy(true); setErr('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('assenze_previste').insert({
        iscrizione_id: iscrizioneId,
        data_inizio: inizio,
        data_fine: fine || inizio, // vuoto = singolo giorno
        nota: nota.trim() || null,
      }).select('id, data_inizio, data_fine, nota').single()
      if (error) throw error
      setLista((l) => [...l, data].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio)))
      setFine(''); setNota('')
      router.refresh()
    } catch (e) { setErr(e.message || 'Errore nel salvataggio.') }
    setBusy(false)
  }

  async function elimina(id) {
    setBusy(true); setErr('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('assenze_previste').delete().eq('id', id)
      if (error) throw error
      setLista((l) => l.filter((x) => x.id !== id))
      router.refresh()
    } catch (e) { setErr(e.message || "Errore nell'eliminazione.") }
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop: 16 }}>
      <h2 className="sezione-titolo" style={{ marginTop: 0 }}>📅 Assenze annunciate</h2>
      <p className="sub-intro">
        Segnala in anticipo i giorni in cui il portiere non ci sarà. È solo un promemoria:
        comparirà fra gli assenti annunciati negli allenamenti di quelle date e <b>non incide su
        presenze o statistiche</b>.
      </p>
      {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}

      {lista.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {lista.map((a) => (
            <div key={a.id} className="lista-riga" style={{ alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>
                {fmt(a.data_inizio)}
                {a.data_fine && a.data_fine !== a.data_inizio ? ` → ${fmt(a.data_fine)}` : ''}
              </span>
              {a.nota && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>· {a.nota}</span>}
              <button type="button" className="btn-mini btn-del" style={{ marginLeft: 'auto' }}
                disabled={busy} onClick={() => elimina(a.id)}>Elimina</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="sub-intro" style={{ marginBottom: 12 }}>Nessuna assenza annunciata.</p>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div className="field"><label>Dal</label>
          <input type="date" value={inizio} onChange={(e) => setInizio(e.target.value)} /></div>
        <div className="field"><label>Al (opz.)</label>
          <input type="date" value={fine} min={inizio} onChange={(e) => setFine(e.target.value)} /></div>
        <div className="field field-full"><label>Nota (opz.)</label>
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Es. vacanza, impegno scolastico, convocazione" /></div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn" disabled={busy} onClick={aggiungi}>
          {busy ? '…' : 'Aggiungi assenza'}
        </button>
      </div>
    </div>
  )
}
