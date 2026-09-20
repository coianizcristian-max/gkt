'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

/**
 * Stato infortunio del portiere (solo staff): segna un infortunio o chiudilo
 * con la data di rientro. Estratto dal modulo della scheda per stare in una
 * sottoscheda propria ("Infortuni").
 */
export default function InfortunioBox({ iscrizioneId, infortunioAperto = null }) {
  const t = useTranslations('portiereForm')
  const c = useTranslations('common')
  const router = useRouter()
  // ── Infortunio ────────────────────────────────────────────────────────────
  const oggi = new Date().toISOString().slice(0, 10)
  const [inf, setInf] = useState(infortunioAperto)
  const [infOpen, setInfOpen] = useState(false)
  const [infStart, setInfStart] = useState(oggi)
  const [infRientro, setInfRientro] = useState('')
  const [infFine, setInfFine] = useState(oggi)
  const [infBusy, setInfBusy] = useState(false)
  const [infErr, setInfErr] = useState('')
  const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT') : '')

  async function registraInfortunio() {
    if (!iscrizioneId) return
    setInfErr(''); setInfBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('infortuni').insert({
        iscrizione_id: iscrizioneId,
        data_inizio: infStart || oggi,
        data_rientro_prevista: infRientro || null,
      }).select('id, data_inizio, data_rientro_prevista').single()
      if (error) throw error
      setInf(data); setInfOpen(false)
      router.refresh()
    } catch (err) { setInfErr(err.message || t('erroreSalvaInfortunio')) }
    setInfBusy(false)
  }

  async function terminaInfortunio() {
    if (!inf?.id) return
    setInfErr(''); setInfBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('infortuni').update({ data_fine: infFine || oggi }).eq('id', inf.id)
      if (error) throw error
      setInf(null)
      router.refresh()
    } catch (err) { setInfErr(err.message || t('erroreChiusuraInfortunio')) }
    setInfBusy(false)
  }

  return (
    <div className="scheda inf-scheda">
      <h2 className="sezione-titolo" style={{ marginTop: 0 }}>{t('statoInfortunio')}</h2>
        <div className="pt-inf" style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 10, padding: 12, marginBottom: 14, background: inf ? '#fff4f4' : 'var(--bg-soft, #fafafa)' }}>
          {inf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#c0392b' }}>{t('infortunato')}</span>
              <span style={{ color: 'var(--ink-soft)' }}>
                {t('dal')} {fmt(inf.data_inizio)}{inf.data_rientro_prevista ? t('rientroPrevistoSuffix', { data: fmt(inf.data_rientro_prevista) }) : ''}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('rientro')}</label>
                <input type="date" value={infFine} onChange={(e) => setInfFine(e.target.value)} />
                <button type="button" className="btn-mini" disabled={infBusy} onClick={terminaInfortunio}>
                  {infBusy ? '…' : t('terminaInfortunio')}
                </button>
              </div>
            </div>
          ) : infOpen ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{t('registraInfortunio')}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
                <div className="field"><label>{t('inizio')}</label>
                  <input type="date" value={infStart} onChange={(e) => setInfStart(e.target.value)} /></div>
                <div className="field"><label>{t('rientroPrevistoOpz')}</label>
                  <input type="date" value={infRientro} onChange={(e) => setInfRientro(e.target.value)} /></div>
                <button type="button" className="btn" disabled={infBusy || !infStart} onClick={registraInfortunio}>
                  {infBusy ? t('salvataggio') : t('registra')}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setInfOpen(false)}>{c('annulla')}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--ink-soft)' }}>{t('disponibile')}</span>
              <button type="button" className="btn-mini" style={{ marginLeft: 'auto' }} onClick={() => setInfOpen(true)}>
                {t('segnaInfortunio')}
              </button>
            </div>
          )}
          {infErr && <div className="err" style={{ marginTop: 8 }}>{infErr}</div>}
        </div>
    </div>
  )
}
