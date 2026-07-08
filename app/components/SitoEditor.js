'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { renderTesto } from '@/lib/renderTesto'

// Dopo ogni salvataggio/eliminazione, invalida subito la cache della home
// pubblica: senza questo, la modifica potrebbe non vedersi per fino a un
// minuto (il tempo di rigenerazione automatica della pagina).
async function revalidateHome() {
  try { await fetch('/api/revalidate-home', { method: 'POST' }) } catch (_) {}
}

const TIPI = [
  { v: 'hero', l: 'Hero (testata grande)' },
  { v: 'vantaggio', l: 'Vantaggio (riquadro)' },
  { v: 'contenuto', l: 'Contenuto (blocco testo + foto)' },
  { v: 'testo', l: 'Solo testo (blocco largo, centrato)' },
  { v: 'banner', l: 'Banner (fascia orizzontale)' },
  { v: 'social', l: 'Social (Facebook + Instagram)' },
  { v: 'prezzi', l: 'Prezzi (piani e costi, letti in automatico)' },
]

function SezioneCard({ sezione, onChanged }) {
  const router = useRouter()
  const [s, setS] = useState(sezione)
  const [fotoPos, setFotoPos] = useState(sezione.foto_posizione ?? 'sinistra')
  // Teniamo il file separato dall'URL — così se non si ricarica la foto il vecchio URL resta intatto
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(sezione.immagine_url || '')
  const [fileMobile, setFileMobile] = useState(null)
  const [previewMobile, setPreviewMobile] = useState(sezione.immagine_mobile_url || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const upd = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setS((p) => ({ ...p, [k]: val })); setDone(false)
  }
  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }
  function onFileMobile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFileMobile(fl); setPreviewMobile(URL.createObjectURL(fl)); setDone(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    try {
      // BUG FIX: immagine_url parte sempre dal valore DB (s.immagine_url),
      // e viene sovrascritto SOLO se l'utente ha scelto un nuovo file.
      // Questo evita che salva senza file azzeri l'URL già salvato.
      let immagine_url = s.immagine_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `sez/${s.id}/${Date.now()}.${ext}`
        const { error: e1 } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (e1) throw e1
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        setS((p) => ({ ...p, immagine_url }))
      }
      let immagine_mobile_url = s.immagine_mobile_url ?? null
      if (fileMobile) {
        const ext = fileMobile.name.split('.').pop()
        const path = `sez/${s.id}/mobile_${Date.now()}.${ext}`
        const { error: e2 } = await supabase.storage.from('sito').upload(path, fileMobile, { upsert: true })
        if (e2) throw e2
        immagine_mobile_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        setS((p) => ({ ...p, immagine_mobile_url }))
      }
      const { error } = await supabase.from('sito_sezioni').update({
        tipo: s.tipo, ordine: Number(s.ordine) || 0, visibile: s.visibile,
        titolo: s.titolo || null, testo: s.testo || null, immagine_url,
        immagine_mobile_url,
        foto_posizione: fotoPos,
        altezza_px: s.altezza_px ? Number(s.altezza_px) : null,
        link_url: s.link_url || null,
        link_url_2: s.link_url_2 || null,
      }).eq('id', s.id)
      if (error) throw error
      setFile(null); setDone(true); router.refresh(); revalidateHome()
    } catch (err) { alert('Errore: ' + (err.message || err)) }
    setBusy(false)
  }

  async function elimina() {
    if (!confirm('Eliminare questa sezione?')) return
    const supabase = createClient()
    const { error } = await supabase.from('sito_sezioni').delete().eq('id', s.id)
    if (error) { alert('Errore: ' + error.message); return }
    revalidateHome()
    onChanged()
  }

  const dimConsigliate = s.tipo === 'hero' ? '1400×600 px' : s.tipo === 'contenuto' ? '800×600 px' : s.tipo === 'banner' ? '1400×altezza scelta (desktop) — carica anche versione mobile sotto' : '400×300 px'
  const dimConsigliateMobile = s.tipo === 'hero' ? '600×400 px' : s.tipo === 'banner' ? '600×altezza scelta (mobile)' : '400×300 px'

  return (
    <div className="sez-card">
      <div className="sez-head">
        <select value={s.tipo} onChange={upd('tipo')}>
          {TIPI.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <label className="sez-vis">
          <input type="checkbox" checked={s.visibile} onChange={upd('visibile')} /> Visibile
        </label>
        <label className="sez-ord">Ordine
          <input type="number" value={s.ordine} onChange={upd('ordine')} />
        </label>
      </div>
      <div className="field"><label>Titolo</label>
        <input value={s.titolo ?? ''} onChange={upd('titolo')} />
      </div>
      <div className="field">
        <label>
          Testo
          <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
            Usa **parola** per il <strong>grassetto</strong> · Invio = a capo nel testo pubblicato
          </span>
        </label>
        <textarea rows="5" value={s.testo ?? ''} onChange={upd('testo')} style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </div>

      {/* Nota esplicativa — solo per il tipo Prezzi */}
      {s.tipo === 'prezzi' && (
        <div style={{ background: 'rgba(10,126,194,0.08)', border: '1px solid rgba(10,126,194,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--ink)' }}>
          💡 In questa sezione puoi modificare <b>solo il titolo e il sottotitolo</b> qui sotto.
          I prezzi e l&apos;elenco delle funzionalità gratuite/a pagamento vengono letti <b>automaticamente</b> da
          Supervisore → Abbonamenti e Supervisore → Funzionalità — non sono modificabili da qui apposta,
          così restano sempre coerenti con quello che configuri altrove senza doverli aggiornare due volte.
        </div>
      )}

      {/* Campo link — per hero e banner */}
      {(s.tipo === 'hero' || s.tipo === 'banner') && (
        <div className="field">
          <label>
            Link (cliccabile)
            <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>facoltativo — rende l&apos;intera sezione un link</span>
          </label>
          <input type="url" value={s.link_url ?? ''} onChange={upd('link_url')} placeholder="https://..." />
        </div>
      )}

      {/* Link Facebook/Instagram — solo per il tipo Social */}
      {s.tipo === 'social' && (
        <>
          <div className="field">
            <label>Link pagina Facebook</label>
            <input type="url" value={s.link_url ?? ''} onChange={upd('link_url')} placeholder="https://facebook.com/..." />
          </div>
          <div className="field">
            <label>Link profilo Instagram</label>
            <input type="url" value={s.link_url_2 ?? ''} onChange={upd('link_url_2')} placeholder="https://instagram.com/..." />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px' }}>
            💡 Carica come immagine una foto d&apos;anteprima carina (es. una foto di squadra o allenamento) — verrà mostrata accanto ai due pulsanti social.
          </p>
        </>
      )}

      {/* Altezza — solo per banner */}
      {s.tipo === 'banner' && (
        <div className="field">
          <label>Altezza banner</label>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px', lineHeight: 1.5 }}>
            💡 Il banner occupa sempre <b>tutta la larghezza del sito</b>, sia su desktop che su mobile.
            La larghezza si adatta automaticamente allo schermo.
            Scegli solo l&apos;altezza in base a quanto spazio vuoi dare al contenuto:
            200px per un banner sottile con solo testo, 400-600px se ha anche un&apos;immagine di sfondo.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ h: 200, label: '200 px — sottile' }, { h: 300, label: '300 px — standard' }, { h: 400, label: '400 px — medio' }, { h: 600, label: '600 px — grande' }].map(({ h, label }) => (
              <button key={h} type="button"
                onClick={() => { setS((p) => ({ ...p, altezza_px: h })); setDone(false) }}
                style={{
                  padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: (s.altezza_px ?? 300) === h ? '2px solid var(--azzurro)' : '2px solid var(--linea)',
                  background: (s.altezza_px ?? 300) === h ? 'rgba(10,126,194,0.08)' : 'var(--carta)',
                  fontWeight: (s.altezza_px ?? 300) === h ? 700 : 400,
                  color: (s.altezza_px ?? 300) === h ? 'var(--azzurro)' : 'var(--ink)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {s.tipo !== 'testo' && s.tipo !== 'prezzi' && (
      <div className="sez-img">
        <div className="sez-thumb">
          {preview ? <img src={preview} alt="" /> : <span>nessuna immagine</span>}
        </div>
        <div>
          <label className="foto-upload">
            {preview ? 'Cambia immagine' : 'Carica immagine'}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
            Dimensioni consigliate: <b>{dimConsigliate}</b>
          </p>

          {/* Immagine mobile — solo per hero e banner */}
          {(s.tipo === 'hero' || s.tipo === 'banner') && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--linea)' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                📱 Immagine mobile
                <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
                  mostrata su schermi fino a 768 px — se non caricata, usa la stessa dell&apos;desktop
                </span>
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="sez-thumb" style={{ width: 80, height: 60 }}>
                  {previewMobile
                    ? <img src={previewMobile} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 11 }}>nessuna</span>}
                </div>
                <div>
                  <label className="foto-upload">
                    {previewMobile ? 'Cambia immagine mobile' : 'Carica immagine mobile'}
                    <input type="file" accept="image/*" onChange={onFileMobile} hidden />
                  </label>
                  {previewMobile && (
                    <button type="button" className="btn-ghost btn-del"
                      style={{ fontSize: 12, marginTop: 6, display: 'block' }}
                      onClick={() => { setPreviewMobile(''); setFileMobile(null); setS(p => ({ ...p, immagine_mobile_url: null })); setDone(false) }}>
                      Rimuovi immagine mobile
                    </button>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
                    Dimensioni consigliate: <b>{dimConsigliateMobile}</b>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Posizione foto — solo per contenuto */}
          {s.tipo === 'contenuto' && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Posizione foto</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['sinistra', 'destra'].map((pos) => (
                  <button key={pos} type="button"
                    onClick={() => { setFotoPos(pos); setDone(false) }}
                    style={{
                      padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: fotoPos === pos ? '2px solid var(--azzurro)' : '2px solid var(--linea)',
                      background: fotoPos === pos ? 'rgba(10,126,194,0.08)' : 'var(--carta)',
                      fontWeight: fotoPos === pos ? 700 : 400,
                      color: fotoPos === pos ? 'var(--azzurro)' : 'var(--ink)',
                    }}
                  >
                    {pos === 'sinistra' ? '◀ Sinistra' : 'Destra ▶'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
      <div className="sez-actions">
        <button className="btn-ghost btn-del" onClick={elimina} type="button">Elimina</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio…' : done ? 'Salvato ✓' : 'Salva'}
        </button>
      </div>
    </div>
  )
}

export default function SitoEditor({ sezioni }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function aggiungi(tipo) {
    setAdding(true)
    const supabase = createClient()
    const maxOrd = sezioni.reduce((m, s) => Math.max(m, s.ordine), 0)
    const { error } = await supabase.from('sito_sezioni').insert({
      tipo, ordine: maxOrd + 1, titolo: 'Nuova sezione', testo: '', visibile: tipo !== 'prezzi',
    })
    if (error) alert('Errore: ' + error.message)
    setAdding(false)
    revalidateHome()
    router.refresh()
  }

  return (
    <div className="sito-editor">
      {sezioni.map((sez) => (
        <SezioneCard key={sez.id} sezione={sez} onChanged={() => router.refresh()} />
      ))}
      <div className="add-sez">
        <span>Aggiungi sezione:</span>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('vantaggio')} type="button">+ Vantaggio</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('contenuto')} type="button">+ Contenuto</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('testo')} type="button">+ Solo testo</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('banner')} type="button">+ Banner</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('social')} type="button">+ Social</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('prezzi')} type="button">+ Prezzi</button>
      </div>
    </div>
  )
}
