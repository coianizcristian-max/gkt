'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Render newsletter (usato sia in preview che nella pagina pubblica) ──────
export function NewsletterRender({ titolo, sezioni, dataStr, societa }) {
  return (
    <div style={{
      maxWidth: 580, margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif",
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a5a8a 0%, #0a7ec2 100%)',
        padding: '32px 36px 24px', color: '#fff',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 8 }}>
          {societa ?? 'GKSeason'} · Newsletter
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.3px' }}>{titolo || 'Titolo newsletter'}</h1>
        {dataStr && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>{dataStr}</div>}
      </div>

      {/* Corpo */}
      <div style={{ padding: '28px 36px' }}>
        {(sezioni ?? []).map((s, i) => {
          if (s.tipo === 'titolo') return (
            <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#0a5a8a', margin: '24px 0 10px', paddingBottom: 6, borderBottom: '2px solid #e8f0f8' }}>
              {s.testo || 'Titolo sezione'}
            </h2>
          )
          if (s.tipo === 'foto') return (
            <div key={i} style={{ margin: '20px 0' }}>
              {s.foto_url && (
                <img src={s.foto_url} alt={s.testo ?? ''} style={{
                  width: '100%', borderRadius: 8, display: 'block',
                  maxHeight: 340, objectFit: 'cover',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                }} />
              )}
              {!s.foto_url && (
                <div style={{ background: '#f0f4f8', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8899a8', fontSize: 14 }}>
                  📷 Immagine non caricata
                </div>
              )}
              {s.testo && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7e8e', textAlign: 'center', fontStyle: 'italic' }}>{s.testo}</p>}
            </div>
          )
          if (s.tipo === 'separatore') return (
            <hr key={i} style={{ border: 'none', borderTop: '1px solid #e8f0f8', margin: '24px 0' }} />
          )
          // tipo === 'testo' (default)
          return (
            <div key={i} style={{ margin: '14px 0' }}>
              {(s.testo || '').split('\n').map((r, ri) =>
                r.trim() === '' ? <br key={ri} /> : (
                  <p key={ri} style={{ margin: '0 0 8px', fontSize: 15, lineHeight: 1.7, color: '#2a3b47' }}>{r}</p>
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ background: '#f6f8fa', borderTop: '1px solid #e8f0f8', padding: '16px 36px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#8899a8', lineHeight: 1.6 }}>
          Hai ricevuto questa email perché sei iscritto alla newsletter di {societa ?? 'GKSeason'}.<br />
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Disiscriviti</span>
        </p>
      </div>
    </div>
  )
}

// ─── Editor singola sezione ──────────────────────────────────────────────────
function EditorSezione({ sezione, idx, onUpdate, onRemove }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `newsletter/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
    if (error) { alert('Errore upload: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('sito').getPublicUrl(path)
    onUpdate({ ...sezione, foto_url: publicUrl })
    setUploading(false)
  }

  const TIPO_LABEL = { testo: '📝 Testo', foto: '📷 Foto', titolo: '🔤 Titolo sezione', separatore: '➖ Separatore' }

  return (
    <div style={{ border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--carta)', borderBottom: '1px solid var(--linea)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>#{idx + 1} {TIPO_LABEL[sezione.tipo] ?? sezione.tipo}</span>
        <button type="button" className="btn-mini btn-del" onClick={onRemove}>✕</button>
      </div>
      <div style={{ padding: 12 }}>
        {sezione.tipo === 'testo' && (
          <textarea rows="4" value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
            placeholder="Scrivi il testo di questa sezione..." style={{ width: '100%', boxSizing: 'border-box' }} />
        )}
        {sezione.tipo === 'titolo' && (
          <input value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
            placeholder="Titolo della sezione..." style={{ width: '100%', boxSizing: 'border-box', fontWeight: 700, fontSize: 16 }} />
        )}
        {sezione.tipo === 'separatore' && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>Linea di separazione orizzontale.</p>
        )}
        {sezione.tipo === 'foto' && (
          <div>
            <label className="foto-upload" style={{ display: 'inline-block', marginBottom: 10 }}>
              {uploading ? '⏳ Caricamento...' : sezione.foto_url ? '🔄 Cambia immagine' : '📷 Carica immagine'}
              <input type="file" accept="image/*" onChange={handleFile} hidden disabled={uploading} />
            </label>
            {sezione.foto_url && (
              <img src={sezione.foto_url} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--r-sm)', marginBottom: 8 }} />
            )}
            <input value={sezione.testo ?? ''} onChange={(e) => onUpdate({ ...sezione, testo: e.target.value })}
              placeholder="Didascalia (opzionale)" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Editor newsletter ───────────────────────────────────────────────────────
function EditorNL({ onSaved, onCancel }) {
  const [titolo, setTitolo] = useState('')
  const [sezioni, setSezioni] = useState([{ tipo: 'testo', testo: '' }])
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const addSezione = (tipo) => setSezioni((s) => [...s, { tipo, testo: '', foto_url: '' }])
  const updateSezione = (i, s) => setSezioni((arr) => arr.map((x, idx) => idx === i ? s : x))
  const removeSezione = (i) => setSezioni((arr) => arr.filter((_, idx) => idx !== i))

  async function salva(pubblicata) {
    if (!titolo.trim()) { setErr('Inserisci il titolo'); return }
    setBusy(true); setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('newsletter_invii').insert({
      titolo: titolo.trim(), contenuto: sezioni, pubblicata,
      inviata_il: pubblicata ? new Date().toISOString() : null,
    })
    if (error) { setErr(error.message); setBusy(false); return }
    setBusy(false); if (onSaved) onSaved()
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {err && <div className="err">{err}</div>}

      {/* Tabs editor/preview */}
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button type="button" className={`sub-nav-link ${!preview ? 'active' : ''}`} onClick={() => setPreview(false)}>✏️ Editor</button>
        <button type="button" className={`sub-nav-link ${preview ? 'active' : ''}`} onClick={() => setPreview(true)}>👁 Anteprima</button>
      </div>

      {!preview ? (
        <div className="scheda">
          <h3 style={{ marginTop: 0 }}>Nuova newsletter</h3>
          <div className="field">
            <label>Titolo *</label>
            <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="es. Aggiornamenti di marzo 2026" style={{ fontSize: 16, fontWeight: 600 }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Sezioni</div>
            {sezioni.map((s, i) => (
              <EditorSezione key={i} sezione={s} idx={i}
                onUpdate={(ns) => updateSezione(i, ns)}
                onRemove={() => removeSezione(i)} />
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[
                { tipo: 'testo', label: '+ Testo' },
                { tipo: 'titolo', label: '+ Titolo sezione' },
                { tipo: 'foto', label: '+ Foto' },
                { tipo: 'separatore', label: '+ Separatore' },
              ].map(({ tipo, label }) => (
                <button key={tipo} type="button" className="btn-ghost" onClick={() => addSezione(tipo)}
                  style={{ fontSize: 13, padding: '6px 12px' }}>{label}</button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>}
            <button type="button" className="btn-ghost" onClick={() => salva(false)} disabled={busy}>Salva bozza</button>
            <button type="button" className="btn" onClick={() => salva(true)} disabled={busy}>
              {busy ? 'Pubblicazione...' : '📤 Pubblica'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="sub-intro" style={{ marginBottom: 16 }}>Anteprima di come apparirà la newsletter agli iscritti.</p>
          <NewsletterRender
            titolo={titolo || 'Titolo newsletter'}
            sezioni={sezioni}
            dataStr={new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn-ghost" onClick={() => setPreview(false)}>← Torna all'editor</button>
            <button type="button" className="btn" onClick={() => salva(true)} disabled={busy}>
              {busy ? 'Pubblicazione...' : '📤 Pubblica ora'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principale ───────────────────────────────────────────────────
export default function NewsletterManager({ invii, iscritti }) {
  const router = useRouter()
  const [crea, setCrea] = useState(false)

  async function pubblica(id) {
    const supabase = createClient()
    await supabase.from('newsletter_invii').update({ pubblicata: true, inviata_il: new Date().toISOString() }).eq('id', id)
    router.refresh()
  }
  async function elimina(id) {
    if (!confirm('Eliminare questa newsletter?')) return
    const supabase = createClient()
    await supabase.from('newsletter_invii').delete().eq('id', id)
    router.refresh()
  }

  const totIscritti = iscritti.filter((i) => i.attivo).length

  return (
    <div className="lista-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="sub-intro" style={{ margin: 0 }}><b>{totIscritti}</b> iscritti attivi.</p>
        {!crea && <button className="btn-azione" type="button" onClick={() => setCrea(true)}>+ Nuova newsletter</button>}
      </div>

      {crea && <EditorNL onSaved={() => { setCrea(false); router.refresh() }} onCancel={() => setCrea(false)} />}

      <div className="elenco-blocco">
        <h3>Newsletter pubblicate</h3>
        {invii.length === 0 && <p className="sub-intro">Nessuna newsletter creata.</p>}
        {invii.map((n) => (
          <div key={n.id} className={`lista-riga ${n.pubblicata ? '' : 'assente'}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{n.titolo}</div>
              <small style={{ color: 'var(--ink-soft)' }}>
                {n.pubblicata ? `✅ ${new Date(n.inviata_il).toLocaleDateString('it-IT')}` : '📝 Bozza'}
                {' · '}{(n.contenuto ?? []).length} sezioni
              </small>
            </div>
            {!n.pubblicata && <button type="button" className="btn-mini" onClick={() => pubblica(n.id)}>Pubblica</button>}
            <button type="button" className="btn-mini btn-del" onClick={() => elimina(n.id)}>Elimina</button>
          </div>
        ))}
      </div>

      <div className="elenco-blocco">
        <h3>Iscritti ({totIscritti})</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13, color: 'var(--ink-soft)' }}>
          {iscritti.map((i) => (
            <div key={i.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--linea)', opacity: i.attivo ? 1 : 0.4 }}>
              {i.email}{!i.attivo && ' (disiscritto)'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
