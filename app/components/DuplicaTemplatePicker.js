'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// Selettore "Duplica da template": ricerca testuale + schede cliccabili (invece
// di un menu a tendina, poco pratico quando i template sono molti). Alla
// selezione mostra l'anteprima ordinata con i tempi, poi conferma al genitore
// l'elenco ordinato di esercizio_id da copiare nel nuovo allenamento.
export default function DuplicaTemplatePicker({ onConferma, onAnnulla }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [cerca, setCerca] = useState('')
  const [selezionatoId, setSelezionatoId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      // Solo template con almeno un esercizio collegato (join "!inner")
      const { data, error } = await supabase
        .from('template_allenamento')
        .select('id, nome, descrizione, template_allenamento_esercizi!inner(id, esercizi(titolo, durata_minuti, recupero_minuti))')
        .order('nome')
      if (!error && data) {
        const risultato = data.map((r) => {
          const righe = r.template_allenamento_esercizi ?? []
          const titoli = righe.map((x) => x.esercizi?.titolo).filter(Boolean)
          const minutiTotali = righe.reduce((s, x) => s + (parseFloat(x.esercizi?.durata_minuti) || 0) + (parseFloat(x.esercizi?.recupero_minuti) || 0), 0)
          return {
            id: r.id,
            nome: r.nome,
            descrizione: r.descrizione,
            numEsercizi: titoli.length,
            eserciziTitoli: titoli,
            minutiTotali,
          }
        })
        setLista(risultato)
      }
      setLoading(false)
    }
    carica()
  }, [])

  const listaFiltrata = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((t) =>
      (t.nome ?? '').toLowerCase().includes(q) ||
      (t.descrizione ?? '').toLowerCase().includes(q) ||
      t.eserciziTitoli.some((tit) => (tit ?? '').toLowerCase().includes(q))
    )
  }, [lista, cerca])

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

  const templateSelezionato = lista.find((t) => t.id === selezionatoId)

  return (
    <div className="scheda" style={{ marginTop: 14, background: 'var(--carta)' }}>
      <h3 style={{ marginTop: 0 }}>Duplica esercizi da un template</h3>

      {loading && <p className="sub-intro">Caricamento template…</p>}
      {!loading && lista.length === 0 && (
        <p className="sub-intro">
          Non hai ancora nessun template con esercizi. <a href="/template-allenamenti" className="link-inline" target="_blank" rel="noopener noreferrer">Creane uno</a>.
        </p>
      )}

      {!loading && lista.length > 0 && !selezionatoId && (
        <>
          <input
            type="search"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca per nome, descrizione o esercizi contenuti..."
            autoFocus
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--linea)', fontSize: 14, background: '#fff', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listaFiltrata.length === 0 && <p className="sub-intro">Nessun template corrisponde alla ricerca.</p>}
            {listaFiltrata.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => seleziona(t.id)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--linea)', background: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</div>
                {t.descrizione && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{t.descrizione}</div>}
                <div style={{ fontSize: 12, color: 'var(--azzurro)', marginTop: 3, display: 'flex', gap: 8 }}>
                  <span>{t.numEsercizi} esercizi</span>
                  {t.minutiTotali > 0 && (
                    <span style={{ color: 'var(--ink-soft)' }}>
                      ⏱ {t.minutiTotali >= 60 ? `${Math.floor(t.minutiTotali / 60)}h ${Math.round(t.minutiTotali % 60)}min` : `${Math.round(t.minutiTotali)} min`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selezionatoId && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{templateSelezionato?.nome}</div>
            <button type="button" className="btn-mini" onClick={() => seleziona('')}>Cambia template</button>
          </div>

          {previewLoading && <p className="sub-intro">Carico anteprima…</p>}

          {!previewLoading && preview.length > 0 && (
            <div className="elenco-blocco">
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

          {!previewLoading && preview.length === 0 && (
            <p className="sub-intro">Nessun esercizio trovato per questo template.</p>
          )}
        </div>
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
