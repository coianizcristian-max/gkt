'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfiloModal from './ProfiloModal'

export default function CercaAllenatori() {
  const [citta, setCitta] = useState('')
  const [risultati, setRisultati] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selezionato, setSelezionato] = useState(null) // allenatore aperto nel modal

  async function cerca() {
    if (!citta.trim()) return
    setLoading(true); setMsg(''); setRisultati(null)
    try {
      const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(citta + ', Italia'))
      const gj = await g.json()
      if (!gj || !gj[0]) { setMsg('Città non trovata. Prova a scriverla in modo diverso.'); setLoading(false); return }
      const lat = parseFloat(gj[0].lat), lng = parseFloat(gj[0].lon)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cerca_allenatori', { p_lat: lat, p_lng: lng })
      if (error) { setMsg('Errore nella ricerca: ' + error.message); setLoading(false); return }
      setRisultati(data || [])
    } catch (e) { setMsg('Errore: ' + String(e)) }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      <h1>Cerchi un allenatore dei portieri?</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Inserisci la città della tua squadra: trovi gli allenatori disponibili che operano nella tua zona, ciascuno entro il raggio che ha impostato.
      </p>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          value={citta}
          onChange={(e) => setCitta(e.target.value)}
          placeholder="Es. Padova"
          onKeyDown={(e) => { if (e.key === 'Enter') cerca() }}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: 16 }}
        />
        <button className="btn" onClick={cerca} disabled={loading} type="button">
          {loading ? 'Cerco...' : 'Cerca'}
        </button>
      </div>
      {msg && <p style={{ color: 'var(--rosso, #c0392b)' }}>{msg}</p>}
      {risultati && risultati.length === 0 && (
        <p style={{ color: 'var(--ink-soft)' }}>Nessun allenatore disponibile trovato per questa zona.</p>
      )}
      {risultati && risultati.length > 0 && (
        <p style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>{risultati.length} allenatori trovati:</p>
      )}
      {risultati && risultati.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setSelezionato(a)}
          className="allenatore-card"
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', padding: 0 }}
        >
          <div className="stat-head">
            <div className="stat-foto">
              {a.foto_url
                ? <img src={a.foto_url} alt="" />
                : <span>{(a.nome || '?').charAt(0)}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="stat-nome">{a.nome || 'Allenatore'}</div>
              <div className="stat-cat">
                {a.citta ? a.citta.toUpperCase() : ''}
                {a.distanza_km != null ? ' – ' + Math.round(a.distanza_km) + ' km' : ''}
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--azzurro)', fontWeight: 600 }}>Vedi profilo →</span>
          </div>
          {a.bio && (
            <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {a.bio}
            </p>
          )}
        </button>
      ))}

      {/* Modal profilo completo + form contatto */}
      {selezionato && (
        <ProfiloModal
          allenatoreId={selezionato.id}
          onClose={() => setSelezionato(null)}
        />
      )}
    </div>
  )
}
