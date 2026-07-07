'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Selettore "Duplica da template": mostra i template salvati, permette di
// sceglierne uno e ne mostra l'anteprima ordinata. Alla conferma, restituisce
// al genitore l'elenco ordinato di esercizio_id da copiare nel nuovo allenamento.
export default function DuplicaTemplatePicker({ onConferma, onAnnulla }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [selezionatoId, setSelezionatoId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('template_allenamento')
        .select('id, nome, template_allenamento_esercizi!inner(id)')
        .order('created_at', { ascending: false })
      if (!error && data) {
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
      .from('template_allenamento_esercizi')
      .select('ordine, esercizio_id, esercizi(titolo, durata_minuti, recupero_minuti)')
      .eq('template_id', id)
      .order('ordine')
    setPreview(data ?? [])
    setPreviewLoading(false)
  }

  return (
    <div className="scheda" style={{ marginTop: 14, background: 'var(--carta)' }}>
      <h3 style={{ marginTop: 0 }}>Duplica esercizi da un template</h3>

      {loading && <p className="sub-intro">Caricamento template…</p>}
      {!loading && lista.length === 0 && (
        <p className="sub-intro">
          Non hai ancora nessun template con esercizi. <a href="/template-allenamenti" className="link-inline" target="_blank" rel="noopener noreferrer">Creane uno</a>.
        </p>
      )}

      {!loading && lista.length > 0 && (
        <div className="field">
          <label>Template</label>
          <select value={selezionatoId} onChange={(e) => seleziona(e.target.value)}>
            <option value="">— Seleziona un template —</option>
            {lista.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
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
              <li key={r.esercizio_id} style={{ marginBottom: 4 }}>
                {r.esercizi?.titolo ?? 'Esercizio'}
                {(r.esercizi?.durata_minuti || r.esercizi?.recupero_minuti) && (
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 6 }}>
                    {r.esercizi?.durata_minuti ? `⏱ ${r.esercizi.durata_minuti}min` : ''}
                    {r.esercizi?.durata_minuti && r.esercizi?.recupero_minuti ? ' · ' : ''}
                    {r.esercizi?.recupero_minuti ? `↩ ${r.esercizi.recupero_minuti}min rec.` : ''}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {(() => {
            const tot = preview.reduce((s, r) => s + (parseFloat(r.esercizi?.durata_minuti) || 0) + (parseFloat(r.esercizi?.recupero_minuti) || 0), 0)
            if (tot <= 0) return null
            const label = tot >= 60 ? `${Math.floor(tot / 60)}h ${Math.round(tot % 60)}min` : `${Math.round(tot)} min`
            return <p className="sub-intro" style={{ marginTop: 8 }}>⏱ Stima tempo totale: <b>{label}</b></p>
          })()}
        </div>
      )}

      {!previewLoading && selezionatoId && preview.length === 0 && (
        <p className="sub-intro">Nessun esercizio trovato per questo template.</p>
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
