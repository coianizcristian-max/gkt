'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function TemplateManager({ templates, attributiDisponibili }) {
  const router = useRouter()
  const [showNuovo, setShowNuovo] = useState(false)
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [cerca, setCerca] = useState('')
  const [filtroAttr, setFiltroAttr] = useState(new Set())
  const [editId, setEditId] = useState(null)

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

  function toggleFiltroAttr(id) {
    setFiltroAttr((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Ricerca: descrizione del template OPPURE titolo di uno degli esercizi contenuti.
  // Filtro attributi: TUTTI quelli selezionati devono essere presenti sul template (AND).
  const templatesFiltrati = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return templates.filter((t) => {
      if (filtroAttr.size > 0) {
        const attrSet = new Set(t.attributoIds ?? [])
        const haTutti = [...filtroAttr].every((id) => attrSet.has(id))
        if (!haTutti) return false
      }
      if (!q) return true
      const inDescrizione = (t.descrizione ?? '').toLowerCase().includes(q)
      const inNome = (t.nome ?? '').toLowerCase().includes(q)
      const inEsercizi = (t.eserciziTitoli ?? []).some((tit) => (tit ?? '').toLowerCase().includes(q))
      return inDescrizione || inNome || inEsercizi
    })
  }, [templates, cerca, filtroAttr])

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
          <p className="sub-intro" style={{ marginTop: 0 }}>
            Gli attributi per la ricerca vengono calcolati automaticamente dagli esercizi che aggiungerai al template.
          </p>
          <div className="form-actions">
            <button className="btn-ghost" type="button" onClick={() => setShowNuovo(false)}>Annulla</button>
            <button className="btn" type="button" onClick={crea} disabled={busy}>
              {busy ? 'Creazione...' : 'Crea e aggiungi esercizi'}
            </button>
          </div>
        </div>
      )}

      {/* Ricerca e filtro attributi */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <input
            type="search"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca per descrizione o esercizi contenuti..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--linea)', fontSize: 14, background: 'var(--carta)', boxSizing: 'border-box', marginBottom: 8 }}
          />
          {attributiDisponibili.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginRight: 2 }}>Attributi:</span>
              {attributiDisponibili.map((a) => (
                <button key={a.id} type="button" onClick={() => toggleFiltroAttr(a.id)} style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: filtroAttr.has(a.id) ? '2px solid var(--campo)' : '1.5px solid var(--linea)',
                  background: filtroAttr.has(a.id) ? 'rgba(46,158,91,0.12)' : 'var(--carta)',
                  color: filtroAttr.has(a.id) ? 'var(--campo)' : 'var(--ink-soft)',
                  fontWeight: filtroAttr.has(a.id) ? 700 : 400,
                }}>
                  {a.nome}
                </button>
              ))}
              {filtroAttr.size > 0 && (
                <button type="button" onClick={() => setFiltroAttr(new Set())} style={{
                  padding: '3px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  border: 'none', background: 'none', color: 'var(--ink-soft)', textDecoration: 'underline',
                }}>
                  Rimuovi filtri
                </button>
              )}
              {filtroAttr.size > 1 && (
                <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>(devono essere presenti tutti)</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="elenco-blocco">
        {templates.length === 0 && !showNuovo && (
          <div className="empty">Nessun template creato. Clicca &ldquo;+ Nuovo template&rdquo; per iniziare.</div>
        )}
        {templates.length > 0 && templatesFiltrati.length === 0 && (
          <div className="empty">Nessun template corrisponde alla ricerca/ai filtri.</div>
        )}
        {templatesFiltrati.map((t) => (
          <TemplateRiga
            key={t.id}
            template={t}
            attributiDisponibili={attributiDisponibili}
            editing={editId === t.id}
            onEditToggle={() => setEditId(editId === t.id ? null : t.id)}
            onElimina={elimina}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateRiga({ template: t, attributiDisponibili, editing, onEditToggle, onElimina }) {
  const router = useRouter()
  const [nome, setNome] = useState(t.nome)
  const [descrizione, setDescrizione] = useState(t.descrizione ?? '')
  const [busy, setBusy] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('template_allenamento').update({
      nome: nome.trim() || t.nome,
      descrizione: descrizione.trim() || null,
    }).eq('id', t.id)
    setBusy(false)
    onEditToggle()
    router.refresh()
  }

  if (editing) {
    return (
      <div className="scheda" style={{ marginBottom: 10 }}>
        <div className="form-grid">
          <div className="field">
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field field-full">
            <label>Descrizione</label>
            <textarea rows="2" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          </div>
        </div>
        <p className="sub-intro" style={{ marginTop: 4 }}>
          Gli attributi mostrati sotto ogni template sono calcolati automaticamente dagli esercizi che
          contiene: aggiungili o rimuovili dal template (aprendolo) per cambiarli.
        </p>
        <div className="form-actions" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <Link href={`/template-allenamenti/${t.id}`} className="btn-ghost">✏️ Modifica esercizi</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" type="button" onClick={onEditToggle}>Annulla</button>
            <button className="btn" type="button" onClick={salva} disabled={busy}>{busy ? 'Salvataggio...' : 'Salva'}</button>
          </div>
        </div>
      </div>
    )
  }

  const nomiAttr = (t.attributoIds ?? [])
    .map((id) => attributiDisponibili.find((a) => a.id === id)?.nome)
    .filter(Boolean)

  return (
    <div className="lista-riga">
      <Link href={`/template-allenamenti/${t.id}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
        <div style={{ fontWeight: 700 }}>{t.nome}</div>
        {t.descrizione && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t.descrizione}</div>}
        <div style={{ fontSize: 12, color: 'var(--azzurro)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>{t.numEsercizi} esercizi</span>
          {t.minutiTotali > 0 && (
            <span style={{ color: 'var(--ink-soft)' }}>
              ⏱ {t.minutiTotali >= 60 ? `${Math.floor(t.minutiTotali / 60)}h ${Math.round(t.minutiTotali % 60)}min` : `${Math.round(t.minutiTotali)} min`}
            </span>
          )}
          {nomiAttr.map((n) => (
            <span key={n} style={{ background: 'rgba(46,158,91,0.12)', color: 'var(--campo)', padding: '1px 8px', borderRadius: 999 }}>{n}</span>
          ))}
        </div>
      </Link>
      <button className="btn-mini" type="button" onClick={(e) => { e.preventDefault(); onEditToggle() }}>✏️ Modifica</button>
      <button className="btn-mini btn-del" type="button" onClick={(e) => onElimina(t.id, e)}>Elimina</button>
    </div>
  )
}
