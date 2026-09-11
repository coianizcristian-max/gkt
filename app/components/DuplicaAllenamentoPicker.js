'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function DuplicaAllenamentoPicker({ onConferma, onAnnulla }) {
  const t = useTranslations('duplicaAllenamento')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [selezionatoId, setSelezionatoId] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('allenamenti')
        .select('id, data, squadre(nome), allenamento_esercizi!inner(id)')
        .order('data', { ascending: false })
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
      <h3 style={{ marginTop: 0 }}>{t('titolo')}</h3>

      {loading && <p className="sub-intro">{t('caricamento')}</p>}
      {!loading && lista.length === 0 && (
        <p className="sub-intro">{t('nessunoDuplicare')}</p>
      )}

      {!loading && lista.length > 0 && (
        <div className="field">
          <label>{t('sorgente')}</label>
          <select value={selezionatoId} onChange={(e) => seleziona(e.target.value)}>
            <option value="">{t('selezionaData')}</option>
            {lista.map((a) => (
              <option key={a.id} value={a.id}>
                {new Date(a.data).toLocaleDateString(dl, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                {' — '}{a.squadre?.nome ?? t('categoriaSconosciuta')}
                {a.data > oggi ? ' ' + t('futuro') : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {previewLoading && <p className="sub-intro">{t('caricoAnteprima')}</p>}

      {!previewLoading && selezionatoId && preview.length > 0 && (
        <div className="elenco-blocco" style={{ marginTop: 10 }}>
          <h4 style={{ margin: '0 0 6px' }}>{t('anteprima', { n: preview.length })}</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {preview.map((r) => (
              <li key={r.esercizio_id} style={{ marginBottom: 4 }}>{r.esercizi?.titolo ?? t('esercizio')}</li>
            ))}
          </ol>
        </div>
      )}

      {!previewLoading && selezionatoId && preview.length === 0 && (
        <p className="sub-intro">{t('nessunEsercizio')}</p>
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
