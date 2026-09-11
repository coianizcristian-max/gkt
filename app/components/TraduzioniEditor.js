'use client'

// Editor traduzioni per contenuti gestiti da DB (home sezioni, FAQ interne).
// Salva su public.contenuti_traduzioni (tabella, riga_id, campo, lingua, testo).
// L'italiano resta nella tabella originale: qui si inseriscono solo EN / DE / ES.

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const LINGUE = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
]

export default function TraduzioniEditor({ tabella, rigaId, campi }) {
  const t = useTranslations('traduzioniEditor')
  const [lang, setLang] = useState('en')
  const [caricato, setCaricato] = useState(false)
  const [val, setVal] = useState({}) // chiave "lingua:campo" -> testo
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function carica() {
    const supabase = createClient()
    const { data } = await supabase
      .from('contenuti_traduzioni')
      .select('lingua, campo, testo')
      .eq('tabella', tabella)
      .eq('riga_id', rigaId)
    const m = {}
    for (const r of data ?? []) m[`${r.lingua}:${r.campo}`] = r.testo
    setVal(m)
    setCaricato(true)
  }

  function setCampo(campo, testo) {
    setVal((v) => ({ ...v, [`${lang}:${campo}`]: testo }))
    setDone(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const righe = campi.map((c) => ({
      tabella,
      riga_id: rigaId,
      campo: c.campo,
      lingua: lang,
      testo: val[`${lang}:${c.campo}`] ?? '',
    }))
    const { error } = await supabase
      .from('contenuti_traduzioni')
      .upsert(righe, { onConflict: 'tabella,riga_id,campo,lingua' })
    if (error) alert(t('errore', { msg: error.message }))
    else setDone(true)
    setBusy(false)
  }

  return (
    <details
      onToggle={(e) => { if (e.currentTarget.open && !caricato) carica() }}
      style={{ marginBottom: 12, border: '1px solid var(--linea, #e2e6e1)', borderRadius: 8, padding: '8px 12px' }}
    >
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft, #6b7e8e)' }}>
        {t('titolo')}
      </summary>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {LINGUE.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setDone(false) }}
              className={lang === l.code ? 'btn-mini' : 'btn-mini btn-ghost'}
            >
              {l.label}
            </button>
          ))}
        </div>

        {!caricato ? (
          <p className="sub-intro" style={{ fontSize: 13 }}>{t('caricamento')}</p>
        ) : (
          <>
            {campi.map((c) => (
              <div className="field" key={c.campo} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12.5 }}>{c.label}</label>
                {c.it != null && c.it !== '' && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '6px 8px', marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                    <span style={{ fontWeight: 600 }}>{t('riferimentoIT')} </span>{c.it}
                  </div>
                )}
                <textarea
                  rows="2"
                  value={val[`${lang}:${c.campo}`] ?? ''}
                  onChange={(e) => setCampo(c.campo, e.target.value)}
                  placeholder={t('placeholder')}
                />
              </div>
            ))}
            <button className="btn" type="button" onClick={salva} disabled={busy}>
              {busy ? t('salvataggio') : done ? t('salvato') : t('salva')}
            </button>
          </>
        )}
      </div>
    </details>
  )
}
