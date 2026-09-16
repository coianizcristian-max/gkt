'use client'

import { useState } from 'react'
import TraduzioniEditor from '@/app/components/TraduzioniEditor'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

export default function VersioniManager({ versioni }) {
  const t = useTranslations('versioniManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const [nuova, setNuova] = useState({ numero: '', titolo: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editNote, setEditNote] = useState('')

  async function crea() {
    if (!nuova.numero.trim()) return
    setBusy(true)
    const supabase = createClient()
    const noteArray = nuova.note.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    await supabase.from('versioni').insert({ numero: nuova.numero.trim(), titolo: nuova.titolo.trim() || null, note: noteArray, pubblicata: false })
    setNuova({ numero: '', titolo: '', note: '' })
    setBusy(false)
    router.refresh()
  }
  async function togglePubblica(id, attuale) {
    const supabase = createClient()
    await supabase.from('versioni').update({ pubblicata: !attuale }).eq('id', id)
    router.refresh()
  }
  async function salvaNote(id) {
    const supabase = createClient()
    const noteArray = editNote.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    await supabase.from('versioni').update({ note: noteArray }).eq('id', id)
    setEditId(null)
    router.refresh()
  }
  async function elimina(id) {
    if (!confirm(t('confermaElim'))) return
    const supabase = createClient()
    await supabase.from('versioni').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <div className="scheda" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>{t('nuovaVersione')}</h3>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('numeroVersione')}</label>
            <input value={nuova.numero} onChange={(e) => setNuova((p) => ({ ...p, numero: e.target.value }))} placeholder={t('phNumero')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('titoloOpz')}</label>
            <input value={nuova.titolo} onChange={(e) => setNuova((p) => ({ ...p, titolo: e.target.value }))} placeholder={t('phTitolo')} />
          </div>
        </div>
        <div className="field">
          <label>{t('noteLabel')}</label>
          <textarea rows={6} value={nuova.note} onChange={(e) => setNuova((p) => ({ ...p, note: e.target.value }))} placeholder={t('phNote')} />
        </div>
        <button className="btn" onClick={crea} disabled={busy || !nuova.numero.trim()} type="button">
          {busy ? t('salvataggio') : t('creaVersione')}
        </button>
      </div>

      {versioni.map((v) => (
        <div key={v.id} className="elenco-blocco" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>v{v.numero}</span>
            {v.titolo && <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{v.titolo}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: v.pubblicata ? 'rgba(46,158,91,0.1)' : 'rgba(200,200,200,0.2)', color: v.pubblicata ? 'var(--campo)' : 'var(--ink-soft)' }}>
              {v.pubblicata ? t('pubblicata') : t('bozza')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 'auto' }}>{new Date(v.created_at).toLocaleDateString(dl)}</span>
          </div>

          {editId === v.id ? (
            <div>
              <textarea rows={6} value={editNote} onChange={(e) => setEditNote(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-mini" onClick={() => salvaNote(v.id)} type="button">{t('salva')}</button>
                <button className="btn-mini" onClick={() => setEditId(null)} type="button">{t('annulla')}</button>
              </div>
            </div>
          ) : (
            <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: 13 }}>
              {(v.note ?? []).map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}

          {/* Traduzioni del changelog: il titolo e le note (una per riga). */}
          <TraduzioniEditor tabella="versioni" rigaId={v.id}
            campi={[
              { campo: 'titolo', label: t('titoloOpz'), it: v.titolo ?? '' },
              { campo: 'note', label: t('noteLabel'), it: (v.note ?? []).join('\n') },
            ]} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-mini" onClick={() => { setEditId(v.id); setEditNote((v.note ?? []).join('\n')) }} type="button" disabled={editId === v.id}>
              {t('modificaNote')}
            </button>
            <button className={`btn-mini ${v.pubblicata ? '' : 'btn-del'}`} onClick={() => togglePubblica(v.id, v.pubblicata)} type="button">
              {v.pubblicata ? t('ritira') : t('pubblica')}
            </button>
            <button className="btn-mini btn-del" onClick={() => elimina(v.id)} type="button">{t('elimina')}</button>
          </div>
        </div>
      ))}

      {versioni.length === 0 && <div className="empty">{t('vuoto')}</div>}
    </div>
  )
}
