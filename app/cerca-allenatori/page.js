'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ProfiloModal from './ProfiloModal'

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
  const [risultati, setRisultati] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selezionato, setSelezionato] = useState(null)

  async function cerca() {
    if (!citta.trim() && !cap.trim()) { setMsg('Inserisci almeno la città o il CAP.'); return }
    setLoading(true); setMsg(''); setRisultati(null)
    try {
      const query = buildQuery(citta, cap, provincia)
      const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=' + encodeURIComponent(query))
      const gj = await g.json()
      if (!gj || !gj[0]) {
        setMsg('Città non trovata. Prova ad aggiungere CAP o provincia per essere più preciso.')
        setLoading(false); return
      }
      const lat = parseFloat(gj[0].lat), lng = parseFloat(gj[0].lon)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cerca_allenatori', { p_lat: lat, p_lng: lng })
      if (error) { setMsg('Errore nella ricerca: ' + error.message); setLoading(false); return }
      setRisultati(data || [])
    } catch (e) { setMsg('Errore: ' + String(e)) }
    setLoading(false)
  }

  const onKey = (e) => { if (e.key === 'Enter') cerca() }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      <h1>Cerchi un allenatore dei portieri?</h1>
      <p style={{ color: 'var(--ink-soft)', margin: '6px 0 20px' }}>
        Inserisci la città della tua squadra. Aggiungi CAP e/o provincia per trovare la città giusta quando il nome è comune a più zone d'Italia.
      </p>

      {/* Prima riga: Città */}
      <div style={{ marginBottom: 8 }}>
        <input
          value={citta}
          onChange={(e) => setCitta(e.target.value)}
          onKeyDown={onKey}
          placeholder="Città  (es. Vicenza)"
          style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
        />
      </div>

      {/* Seconda riga: CAP + Provincia + Cerca */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          onKeyDown={onKey}
          placeholder="CAP  (es. 36100)"
          maxLength={5}
          style={{ width: 120, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16, flexShrink: 0 }}
        />
        <input
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          onKeyDown={onKey}
          placeholder="Provincia  (es. VI)"
          maxLength={30}
          style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16 }}
        />
        <button className="btn" onClick={cerca} disabled={loading} type="button" style={{ flexShrink: 0, minWidth: 100 }}>
          {loading ? 'Cerco...' : 'Cerca'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
        💡 CAP e provincia sono facoltativi ma aiutano a trovare la città giusta quando il nome è comune a più zone d'Italia.
      </p>

      {msg && <p style={{ color: 'var(--rosso, #c0392b)', marginBottom: 12 }}>{msg}</p>}
      {risultati && risultati.length === 0 && (
        <p style={{ color: 'var(--ink-soft)' }}>Nessun allenatore disponibile trovato per questa zona.</p>
      )}
      {risultati && risultati.length > 0 && (
        <p style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>{risultati.length} allenatori trovati:</p>
      )}
      {risultati && risultati.map((a) => {
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
                  ? <Image src={a.foto_url} alt={a.nome || 'Allenatore'} fill sizes="52px" />
                  : <span>{(a.nome || '?').charAt(0)}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-nome">{a.nome || 'Allenatore'}</div>
                <div className="stat-cat">
                  {a.citta ? a.citta.toUpperCase() : ''}{kmLabel}
                </div>
              </div>
              <Link
                  href={`/allenatori/${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 13, color: 'var(--azzurro)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Vedi profilo →
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
