'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfiloModal from '@/app/cerca-allenatori/ProfiloModal'

function buildQuery(citta, cap, provincia) {
  // Costruisce la query più precisa possibile per Nominatim.
  // CAP è il dato più disambiguante: "36030 Italia" trova Montecchio Precalcino
  // senza ambiguità, mentre "Montecchio Italia" potrebbe trovare Montecchio Emilia (RE).
  const parts = []
  if (cap.trim()) parts.push(cap.trim())
  if (citta.trim()) parts.push(citta.trim())
  if (provincia.trim()) parts.push(provincia.trim())
  parts.push('Italia')
  return parts.join(', ')
}

export default function CercaAllenatoriBox() {
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
    <section style={{ background: 'var(--carta)', borderTop: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 6px' }}>Cerchi un allenatore dei portieri?</h2>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 16px' }}>
          Inserisci la città della tua squadra. Aggiungi CAP e/o provincia per trovare la città giusta quando esistono omonimie.
        </p>

        {/* Prima riga: Città (campo principale) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            onKeyDown={onKey}
            placeholder="Città  (es. Vicenza)"
            style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: '1rem' }}
          />
        </div>

        {/* Seconda riga: CAP + Provincia */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            onKeyDown={onKey}
            placeholder="CAP (es. 36100)"
            maxLength={5}
            style={{ flex: '0 0 100px', minWidth: 0, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: '1rem' }}
          />
          <input
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            onKeyDown={onKey}
            placeholder="Provincia (es. VI)"
            maxLength={30}
            style={{ flex: 1, minWidth: 0, padding: '11px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: '1rem' }}
          />
        </div>
        {/* Terza riga: Cerca */}
        <div>
          <button className="btn" onClick={cerca} disabled={loading} type="button" style={{ width: '100%' }}>
            {loading ? 'Cerco...' : 'Cerca'}
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
          💡 CAP e provincia sono facoltativi ma aiutano a trovare la città giusta quando il nome è comune a più zone d'Italia.
        </p>

        {msg && <p style={{ color: 'var(--rosso, #c0392b)', marginTop: 12 }}>{msg}</p>}
        {risultati && risultati.length === 0 && (
          <p style={{ marginTop: 12, color: 'var(--ink-soft)' }}>Nessun allenatore disponibile trovato per questa zona.</p>
        )}
        {risultati && risultati.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 10px' }}>{risultati.length} allenatori trovati:</p>
            {risultati.map((a) => {
              const km = a.distanza_km != null ? a.distanza_km : a.dist
              const kmLabel = (km != null && km < 500) ? ' · ' + Math.round(km) + ' km' : ''
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelezionato(a)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: '#fff', border: '1px solid var(--linea)',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                    cursor: 'pointer',
                  }}
                >
                  {/* Riga 1: avatar + nome + città */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      overflow: 'hidden', background: 'var(--azzurro)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {a.foto_url
                        ? <img src={a.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{(a.nome || '?').charAt(0)}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome || 'Allenatore'}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 1 }}>
                        {a.citta ? a.citta.toUpperCase() : ''}{kmLabel}
                      </div>
                    </div>
                  </div>
                  {/* Riga 2: bio (se presente) */}
                  {a.bio && (
                    <p style={{
                      margin: '8px 0 6px', color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {a.bio}
                    </p>
                  )}
                  {/* Riga 3: Vedi profilo sempre su riga propria */}
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <span style={{ fontSize: 13, color: 'var(--azzurro)', fontWeight: 600 }}>
                      Vedi profilo →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selezionato && (
        <ProfiloModal
          allenatoreId={selezionato.id}
          onClose={() => setSelezionato(null)}
        />
      )}
    </section>
  )
}
