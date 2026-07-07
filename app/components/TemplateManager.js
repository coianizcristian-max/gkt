'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function TemplateManager({ templates }) {
  const router = useRouter()
  const [showNuovo, setShowNuovo] = useState(false)
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function crea() {
    if (!nome.trim()) { setError('Inserisci un nome per il template.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: insErr } = await supabase
      .from('template_allenamento')
      .insert({ owner_id: user.id, nome: nome.trim(), descrizione: descrizione.trim() || null })
      .select('id').single()
    if (insErr) { setError(insErr.message); setBusy(false); return }
    router.push(`/template-allenamenti/${data.id}`)
  }

  async function elimina(id, e) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Eliminare questo template? Gli allenamenti già creati con questo template non vengono toccati.')) return
    const supabase = createClient()
    await supabase.from('template_allenamento').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" type="button" onClick={() => setShowNuovo((v) => !v)}>
          + Nuovo template
        </button>
      </div>

      {showNuovo && (
        <div className="scheda" style={{ marginBottom: 16 }}>
          {error && <div className="err">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label>Nome template *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Seduta tecnica base" />
            </div>
            <div className="field field-full">
              <label>Descrizione (opzionale)</label>
              <textarea rows="2" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-ghost" type="button" onClick={() => setShowNuovo(false)}>Annulla</button>
            <button className="btn" type="button" onClick={crea} disabled={busy}>
              {busy ? 'Creazione...' : 'Crea e aggiungi esercizi'}
            </button>
          </div>
        </div>
      )}

      <div className="elenco-blocco">
        {templates.length === 0 && !showNuovo && (
          <div className="empty">Nessun template creato. Clicca &ldquo;+ Nuovo template&rdquo; per iniziare.</div>
        )}
        {templates.map((t) => (
          <div key={t.id} className="lista-riga">
            <Link href={`/template-allenamenti/${t.id}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 700 }}>{t.nome}</div>
              {t.descrizione && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t.descrizione}</div>}
              <div style={{ fontSize: 12, color: 'var(--azzurro)', marginTop: 4 }}>{t.numEsercizi} esercizi</div>
            </Link>
            <button className="btn-mini btn-del" type="button" onClick={(e) => elimina(t.id, e)}>Elimina</button>
          </div>
        ))}
      </div>
    </div>
  )
}
