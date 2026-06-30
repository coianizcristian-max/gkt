'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Selettore "Duplica da": mostra solo gli allenamenti che hanno almeno un
// esercizio assegnato, permette di sceglierne uno per data e ne mostra
// l'anteprima ordinata. Al conferma, restituisce al genitore l'elenco
// ordinato di esercizio_id da copiare nel nuovo allenamento.
export default function DuplicaAllenamentoPicker({ onConferma, onAnnulla }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [selezionatoId, setSelezionatoId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      // Solo allenamenti con almeno un esercizio collegato (join "!inner")
      const { data, error } = await supabase
        .from('allenamenti')
        .select('id, data, squadre(nome), allenamento_esercizi!inner(id)')
        .order('data', { ascending: false })
      if (!error && data) {
        // Dedup: con la join possono arrivare righe ripetute per stesso allenamento
        const visti = new Map()
        for (const r of data) if (!visti.has(r.id)) visti.set(r.id, r)
        setLista([...visti.values()])
      }
      setLoading(false)
    }
    carica()
  }, [])

  async function seleziona(id) {
    setSelezionatoId(id)
    setPreview([])
    if (!id) return
    setPreviewLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('allenamento_esercizi')
      .select('ordine, esercizio_id, esercizi(titolo)')
      .eq('allenamento_id', id)
      .order('ordine')
    setPreview(data ?? [])
    setPreviewLoading(false)
  }

  const oggi = new Date().toISOString().slice(0, 10)

  return (
    <div className="scheda" style={{ marginTop: 14, background: 'var(--carta)' }}>
      <h3 style={{ marginTop: 0 }}>Duplica esercizi da un altro allenamento</h3>

      {loading && <p className="sub-intro">Caricamento allenamenti…</p>}
      {!loading && lista.length === 0 && (
        <p className="sub-intro">Non hai ancora nessun allenamento con esercizi da duplicare.</p>
      )}

      {!loading && lista.length > 0 && (
        <div className="field">
          <label>Allenamento sorgente</label>
          <select value={selezionatoId} onChange={(e) => seleziona(e.target.value)}>
            <option value="">— Seleziona una data —</option>
            {lista.map((a) => (
              <option key={a.id} value={a.id}>
                {new Date(a.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                {' — '}{a.squadre?.nome ?? 'Categoria sconosciuta'}
                {a.data > oggi ? ' (futuro)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {previewLoading && <p className="sub-intro">Carico anteprima…</p>}

      {!previewLoading && selezionatoId && preview.length > 0 && (
        <div className="elenco-blocco" style={{ marginTop: 10 }}>
          <h4 style={{ margin: '0 0 6px' }}>Anteprima ({preview.length} esercizi, in ordine)</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {preview.map((r) => (
              <li key={r.esercizio_id} style={{ marginBottom: 4 }}>{r.esercizi?.titolo ?? 'Esercizio'}</li>
            ))}
          </ol>
        </div>
      )}

      {!previewLoading && selezionatoId && preview.length === 0 && (
        <p className="sub-intro">Nessun esercizio trovato per questo allenamento.</p>
      )}

      <div className="form-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn-ghost" onClick={onAnnulla}>Annulla</button>
        <button
          type="button"
          className="btn"
          disabled={!selezionatoId || preview.length === 0}
          onClick={() => onConferma(preview.map((r) => r.esercizio_id))}
        >
          Usa questi {preview.length || ''} esercizi
        </button>
      </div>
    </div>
  )
}
