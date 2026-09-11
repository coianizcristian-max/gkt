'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import ProfiloModal from './ProfiloModal'
import { useTranslations } from 'next-intl'

function buildQuery(citta, cap, provincia) {
  const parts = []
  if (cap.trim()) parts.push(cap.trim())
  if (citta.trim()) parts.push(citta.trim())
  if (provincia.trim()) parts.push(provincia.trim())
  parts.push('Italia')
  return parts.join(', ')
}

export default function CercaAllenatori() {
  const [citta, setCitta] = useState('')
  const [cap, setCap] = useState('')
  const [provincia, setProvincia] = useState('')
  const [raggio, setRaggio] = useState('50')
  const [risultati, setRisultati] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selezionato, setSelezionato] = useState(null)
  const t = useTranslations('cercaAllenatori')

  async function cerca() {
    if (!citta.trim() && !cap.trim()) { setMsg(t('erroreInserisci')); return }
    setLoading(true); setMsg(''); setRisultati(null)
    try {
      const query = buildQuery(citta, cap, provincia)
      const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=' + encodeURIComponent(query))
      const gj = await g.json()
      if (!gj || !gj[0]) {
        setMsg(t('cittaNonTrovata'))
        setLoading(false); return
      }
      const lat = parseFloat(gj[0].lat), lng = parseFloat(gj[0].lon)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cerca_allenatori', { p_lat: lat, p_lng: lng })
      if (error) { setMsg(t('erroreRicerca') + error.message); setLoading(false); return }
      setRisultati(data || [])
    } catch (e) { setMsg(t('erroreGenerico') + String(e)) }
    setLoading(false)
  }

  const onKey = (e) => { if (e.key === 'Enter') cerca() }

  const filtrati = risultati && raggio !== 'all'
    ? risultati.filter((a) => {
        const km = a.distanza_km != null ? a.distanza_km : a.dist
        return km != null && km <= Number(raggio)
      })
    : risultati

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      <h1>{t('titolo')}</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '6px 0 20px' }}>
        {t('intro')}
      </p>

      {/* Prima riga: Città */}
      <div style={{ marginBottom: 8 }}>
        <input
          value={citta}
          onChange={(e) => setCitta(e.target.value)}
          onKeyDown={onKey}
          placeholder={t('phCitta')}
          style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
        />
      </div>

      {/* Seconda riga: CAP + Provincia + Cerca */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          onKeyDown={onKey}
          placeholder={t('phCap')}
          maxLength={5}
          style={{ width: 120, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16, flexShrink: 0 }}
        />
        <input
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          onKeyDown={onKey}
          placeholder={t('phProvincia')}
          maxLength={30}
          style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16 }}
        />
        <select
          value={raggio}
          onChange={(e) => setRaggio(e.target.value)}
          style={{ flexShrink: 0, width: 110, padding: '11px 8px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16, background: '#fff' }}
        >
          <option value="10">10 km</option>
          <option value="30">30 km</option>
          <option value="50">50 km</option>
          <option value="100">100 km</option>
          <option value="all">{t('ovunque')}</option>
        </select>
        <button className="btn" onClick={cerca} disabled={loading} type="button" style={{ flexShrink: 0, minWidth: 100 }}>
          {loading ? t('cercando') : t('cerca')}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
        {t('hint')}
      </p>

      {msg && <p style={{ color: 'var(--rosso, #c0392b)', marginBottom: 12 }}>{msg}</p>}
      {filtrati && filtrati.length === 0 && (
        <p style={{ color: 'var(--ink-soft)' }}>
          {t('nessunoTrovato')}{raggio !== 'all' ? t('entroRaggio', { raggio }) : t('perZona')}
        </p>
      )}
      {filtrati && filtrati.length > 0 && (
        <p style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>{t('nTrovati', { n: filtrati.length })}</p>
      )}
      {filtrati && filtrati.map((a) => {
        const km = a.distanza_km != null ? a.distanza_km : a.dist
        const kmLabel = (km != null && km < 500) ? ' · ' + Math.round(km) + ' km' : ''
        return (
          <div
                key={a.id}
                className="allenatore-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelezionato(a)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelezionato(a) } }}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
            <div className="stat-head">
              <div className="stat-foto">
                {a.foto_url
                  ? <Image src={a.foto_url} alt={a.nome || t('allenatoreFallback')} fill sizes="52px" />
                  : <span>{(a.nome || '?').charAt(0)}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-nome">{a.nome || t('allenatoreFallback')}</div>
                <div className="stat-cat">
                  {a.citta ? a.citta.toUpperCase() : ''}{kmLabel}
                </div>
              </div>
              <Link
                  href={`/allenatori/${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 13, color: 'var(--azzurro)', fontWeight: 600, textDecoration: 'none' }}
                >
                  {t('vediProfilo')}
                </Link>
            </div>
            {a.bio && (
              <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {a.bio}
              </p>
            )}
          </div>
        )
      })}

      {selezionato && (
        <ProfiloModal
          allenatoreId={selezionato.id}
          onClose={() => setSelezionato(null)}
        />
      )}
    </div>
  )
}
