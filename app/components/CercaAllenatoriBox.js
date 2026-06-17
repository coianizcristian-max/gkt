'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CercaAllenatoriBox() {
  const [citta, setCitta] = useState('')
  const [risultati, setRisultati] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function cerca() {
    if (!citta.trim()) return
    setLoading(true); setMsg(''); setRisultati(null)
    try {
      const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(citta + ', Italia'))
      const gj = await g.json()
      if (!gj || !gj[0]) { setMsg('Citta non trovata. Prova a scriverla in modo diverso.'); setLoading(false); return }
      const lat = parseFloat(gj[0].lat), lng = parseFloat(gj[0].lon)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cerca_allenatori', { p_lat: lat, p_lng: lng })
      if (error) { setMsg('Errore nella ricerca: ' + error.message); setLoading(false); return }
      setRisultati(data || [])
    } catch (e) { setMsg('Errore: ' + String(e)) }
    setLoading(false)
  }

  return (
    <section style={{ background: 'var(--carta)', borderTop: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 6px' }}>Cerchi un allenatore dei portieri?</h2>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 16px' }}>Inserisci la citta della tua squadra: trovi gli allenatori disponibili che operano nella tua zona, ciascuno entro il raggio che ha impostato.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            placeholder="Es. Vicenza"
            onKeyDown={(e) => { if (e.key === 'Enter') cerca() }}
            style={{ flex: 1, padding: '12px 14px', border: '1px solid var(--linea)', borderRadius: 8, fontSize: '1rem' }}
          />
          <button className="btn" onClick={cerca} disabled={loading} type="button">{loading ? 'Cerco...' : 'Cerca'}</button>
        </div>
        {msg && <p style={{ color: 'var(--rosso, #c0392b)', marginTop: 12 }}>{msg}</p>}
        {risultati && risultati.length === 0 && <p style={{ marginTop: 12 }}>Nessun allenatore disponibile trovato per questa zona.</p>}
        {risultati && risultati.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 10px' }}>{risultati.length} allenatori trovati:</p>
            {risultati.map((a) => {
              const km = a.distanza_km != null ? a.distanza_km : a.dist
              return (
                <div key={a.id} className="stat-card" style={{ marginBottom: 12 }}>
                  <div className="stat-head">
                    <div className="stat-foto">{a.foto_url ? <img src={a.foto_url} alt="" /> : <span>{(a.nome || '?').charAt(0)}</span>}</div>
                    <div>
                      <div className="stat-nome">{a.nome || 'Allenatore'}</div>
                      <div className="stat-cat">{a.citta || ''}{km != null ? ' - ' + Math.round(km) + ' km' : ''}</div>
                    </div>
                  </div>
                  {a.bio && <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>{a.bio}</p>}
                  {a.telefono && <p style={{ marginTop: 6 }}><b>Contatto:</b> {a.telefono}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
