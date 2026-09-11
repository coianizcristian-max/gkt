'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function DuplicaTemplatePicker({ onConferma, onAnnulla }) {
  const t = useTranslations('duplicaTemplate')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [cerca, setCerca] = useState('')
  const [selezionatoId, setSelezionatoId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  function fmtDurata(min) {
    return min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}min` : `${Math.round(min)} min`
  }

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
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
    return lista.filter((tp) =>
      (tp.nome ?? '').toLowerCase().includes(q) ||
      (tp.descrizione ?? '').toLowerCase().includes(q) ||
      tp.eserciziTitoli.some((tit) => (tit ?? '').toLowerCase().includes(q))
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

  const templateSelezionato = lista.find((tp) => tp.id === selezionatoId)

  return (
    <div className="scheda" style={{ marginTop: 14, background: 'var(--carta)' }}>
      <h3 style={{ marginTop: 0 }}>{t('titolo')}</h3>

      {loading && <p className="sub-intro">{t('caricamento')}</p>}
      {!loading && lista.length === 0 && (
        <p className="sub-intro">
          {t.rich('nessunTemplate', { a: (ch) => <a href="/template-allenamenti" className="link-inline" target="_blank" rel="noopener noreferrer">{ch}</a> })}
        </p>
      )}

      {!loading && lista.length > 0 && !selezionatoId && (
        <>
          <input
            type="search"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder={t('cerca')}
            autoFocus
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--linea)', fontSize: 14, background: '#fff', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listaFiltrata.length === 0 && <p className="sub-intro">{t('nessunaCorrispondenza')}</p>}
            {listaFiltrata.map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => seleziona(tp.id)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--linea)', background: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{tp.nome}</div>
                {tp.descrizione && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{tp.descrizione}</div>}
                <div style={{ fontSize: 12, color: 'var(--azzurro)', marginTop: 3, display: 'flex', gap: 8 }}>
                  <span>{t('nEsercizi', { n: tp.numEsercizi })}</span>
                  {tp.minutiTotali > 0 && (
                    <span style={{ color: 'var(--ink-soft)' }}>⏱ {fmtDurata(tp.minutiTotali)}</span>
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
            <button type="button" className="btn-mini" onClick={() => seleziona('')}>{t('cambia')}</button>
          </div>

          {previewLoading && <p className="sub-intro">{t('caricoAnteprima')}</p>}

          {!previewLoading && preview.length > 0 && (
            <div className="elenco-blocco">
              <h4 style={{ margin: '0 0 6px' }}>{t('anteprima', { n: preview.length })}</h4>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {preview.map((r) => (
                  <li key={r.esercizio_id} style={{ marginBottom: 4 }}>
                    {r.esercizi?.titolo ?? t('esercizio')}
                    {(r.esercizi?.durata_minuti || r.esercizi?.recupero_minuti) && (
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 6 }}>
                        {r.esercizi?.durata_minuti ? `⏱ ${r.esercizi.durata_minuti}min` : ''}
                        {r.esercizi?.durata_minuti && r.esercizi?.recupero_minuti ? ' · ' : ''}
                        {r.esercizi?.recupero_minuti ? `↩ ${r.esercizi.recupero_minuti}min ${t('rec')}` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              {(() => {
                const tot = preview.reduce((s, r) => s + (parseFloat(r.esercizi?.durata_minuti) || 0) + (parseFloat(r.esercizi?.recupero_minuti) || 0), 0)
                if (tot <= 0) return null
                const label = tot >= 60 ? `${Math.floor(tot / 60)}h ${Math.round(tot % 60)}min` : `${Math.round(tot)} min`
                return <p className="sub-intro" style={{ marginTop: 8 }}>{t.rich('stimaTempo', { tempo: label, b: (ch) => <b>{ch}</b> })}</p>
              })()}
            </div>
          )}

          {!previewLoading && preview.length === 0 && (
            <p className="sub-intro">{t('nessunEsercizioTemplate')}</p>
          )}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn-ghost" onClick={onAnnulla}>{t('annulla')}</button>
        <button
          type="button"
          className="btn"
          disabled={!selezionatoId || preview.length === 0}
          onClick={() => onConferma(preview.map((r) => r.esercizio_id))}
        >
          {t('usaQuesti', { n: preview.length || '' })}
        </button>
      </div>
    </div>
  )
}
