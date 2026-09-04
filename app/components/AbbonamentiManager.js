'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PIANI = ['mensile', 'annuale', 'lifetime']
const STATI = ['attivo', 'disdetto', 'scaduto', 'cancellato']
const STATO_BADGE = {
  attivo:     { label: '🟢 Attivo',    bg: 'rgba(46,158,91,0.1)',   color: 'var(--campo)' },
  disdetto:   { label: '🟡 Disdetto',  bg: 'rgba(230,160,0,0.1)',   color: '#b8860b' },
  scaduto:    { label: '🔴 Scaduto',   bg: 'rgba(192,57,43,0.1)',   color: 'var(--rosso)' },
  cancellato: { label: '⛔ Cancellato',bg: 'rgba(150,150,150,0.1)', color: 'var(--ink-soft)' },
}
const fmtData = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const isoDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

export default function AbbonamentiManager({ abbonamenti, profili }) {
  const router = useRouter()
  const [ricerca, setRicerca] = useState('')
  const [editing, setEditing] = useState(null)    // abbonamento in modifica
  const [nuovoFor, setNuovoFor] = useState(null)  // profilo_id per nuovo abbonamento
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Mappa profili per lookup rapido
  const profiliMap = useMemo(() => {
    const m = {}
    for (const p of profili) m[p.id] = p
    return m
  }, [profili])

  // Lista abbonamenti arricchita con dati profilo
  const lista = useMemo(() => abbonamenti.map(a => ({
    ...a,
    _nome: profiliMap[a.allenatore_id]?.nome_visualizzato
      || profiliMap[a.allenatore_id]?.nome_completo
      || a.allenatore_id,
    _email: profiliMap[a.allenatore_id]?.email || null,
  })), [abbonamenti, profiliMap])

  // Filtra per ricerca (nome, email o id)
  const filtrati = useMemo(() => {
    if (!ricerca.trim()) return lista
    const q = ricerca.toLowerCase()
    return lista.filter(a =>
      a._nome?.toLowerCase().includes(q) ||
      a._email?.toLowerCase().includes(q) ||
      a.allenatore_id?.toLowerCase().includes(q)
    )
  }, [lista, ricerca])

  // Profili cercati per creare nuovo abbonamento.
  // Mostriamo suggerimenti SOLO dopo una ricerca (nome, email o id): niente più
  // elenco "a caso" dei primi profili, che confondeva.
  const profiliRicercati = useMemo(() => {
    if (!ricerca.trim()) return []
    const q = ricerca.toLowerCase()
    return profili.filter(p =>
      (p.nome_visualizzato || p.nome_completo || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [profili, ricerca])

  async function salvaModifica(abb, form) {
    setBusy(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('abbonamenti').update({
      piano: form.piano,
      stato: form.stato,
      scadenza: form.scadenza || null,
      nota: form.nota?.trim() || null,
    }).eq('id', abb.id)
    if (error) { setMsg('Errore: ' + error.message) }
    else { setMsg('✓ Salvato'); setEditing(null); router.refresh() }
    setBusy(false)
  }

  async function creaNuovo(profiloId, form) {
    setBusy(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('abbonamenti').insert({
      allenatore_id: profiloId,
      piano: form.piano,
      stato: form.stato,
      scadenza: form.scadenza || null,
      nota: form.nota?.trim() || null,
    })
    if (error) { setMsg('Errore: ' + error.message) }
    else { setMsg('✓ Abbonamento creato'); setNuovoFor(null); router.refresh() }
    setBusy(false)
  }

  async function eliminaAbb(id) {
    if (!confirm('Eliminare definitivamente questo abbonamento?')) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from('abbonamenti').delete().eq('id', id)
    setEditing(null); router.refresh()
    setBusy(false)
  }

  return (
    <div>
      {msg && (
        <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8,
          background: msg.startsWith('✓') ? 'rgba(46,158,91,0.1)' : 'rgba(192,57,43,0.1)',
          color: msg.startsWith('✓') ? 'var(--campo)' : 'var(--rosso)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* Barra di ricerca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={ricerca}
          onChange={e => setRicerca(e.target.value)}
          placeholder="Cerca per nome allenatore..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--linea)', fontSize: 15 }}
        />
        {ricerca && (
          <button type="button" onClick={() => setRicerca('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-soft)' }}>
            ✕
          </button>
        )}
      </div>

      {/* Lista abbonamenti filtrati */}
      <div className="lista-editor" style={{ marginBottom: 32 }}>
        {filtrati.length === 0 && (
          <div className="empty">Nessun abbonamento trovato.</div>
        )}
        {filtrati.map((a) => {
          const badge = STATO_BADGE[a.stato] ?? { label: a.stato, bg: 'var(--carta)', color: 'var(--ink)' }
          const isEditing = editing?.id === a.id

          return (
            <div key={a.id} className="elenco-blocco" style={{ marginBottom: 12 }}>
              {/* Riga riassuntiva */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a._nome}</div>
                  {a._email && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{a._email}</div>}
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{a.allenatore_id}</div>
                  <div style={{ fontSize: 13, marginTop: 2, color: 'var(--ink-soft)' }}>
                    {a.piano === 'lifetime' ? 'Lifetime' : a.piano === 'annuale' ? 'Annuale' : 'Mensile'}
                    {a.scadenza && a.piano !== 'lifetime' && ` · scade ${fmtData(a.scadenza)}`}
                    {' · '}dal {fmtData(a.created_at)}
                  </div>
                  {a.nota && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--ink)', background: 'var(--soft, #f6f8fb)', display: 'inline-block', padding: '2px 8px', borderRadius: 6 }}>📝 {a.nota}</div>}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
                <button className="btn-mini" type="button"
                  onClick={() => setEditing(isEditing ? null : { ...a })}>
                  {isEditing ? 'Chiudi' : 'Modifica'}
                </button>
              </div>

              {/* Form modifica inline */}
              {isEditing && (
                <EditForm
                  abb={editing}
                  onSave={(form) => salvaModifica(a, form)}
                  onDelete={() => eliminaAbb(a.id)}
                  onCancel={() => setEditing(null)}
                  busy={busy}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Sezione crea nuovo abbonamento */}
      <div className="scheda">
        <h3 style={{ margin: '0 0 12px' }}>+ Attiva un abbonamento manuale</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
          Cerca l&apos;allenatore per <b>nome o email</b> nella barra qui sopra, poi selezionalo.
          Creando un abbonamento con stato <b>Attivo</b> gli sblocchi tutte le funzionalità <b>senza fargli pagare nulla</b>
          (utile per omaggi o pagamenti alternativi). Usa la <b>Nota</b> per ricordarti il motivo.
        </p>
        {nuovoFor ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              Nuovo abbonamento per: <b>{profiliMap[nuovoFor]?.nome_visualizzato || profiliMap[nuovoFor]?.nome_completo || nuovoFor}</b>
            </div>
            <EditForm
              abb={{ piano: 'mensile', stato: 'attivo', scadenza: '' }}
              onSave={(form) => creaNuovo(nuovoFor, form)}
              onCancel={() => setNuovoFor(null)}
              busy={busy}
              isNew
            />
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {profiliRicercati.slice(0, 8).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--linea)',
                  background: 'var(--carta)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.nome_visualizzato || p.nome_completo || '—'}</div>
                    {p.email && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.email}</div>}
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{p.id}</div>
                  </div>
                  <button className="btn-mini" type="button" onClick={() => setNuovoFor(p.id)}>
                    Attiva abbonamento
                  </button>
                </div>
              ))}
              {profiliRicercati.length === 0 && (
                <div className="empty">
                  {ricerca.trim()
                    ? 'Nessun allenatore trovato per questa ricerca.'
                    : 'Scrivi nella barra qui sopra il nome o l\u2019email dell\u2019allenatore per attivargli un abbonamento.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EditForm({ abb, onSave, onDelete, onCancel, busy, isNew = false }) {
  const oggi = new Date()
  const tra1anno = new Date(oggi.setFullYear(oggi.getFullYear() + 1)).toISOString().slice(0, 10)

  const [form, setForm] = useState({
    piano: abb.piano ?? 'mensile',
    stato: abb.stato ?? 'attivo',
    scadenza: isoDate(abb.scadenza) || (abb.piano !== 'lifetime' ? tra1anno : ''),
    nota: abb.nota ?? '',
  })

  function upd(k) { return (e) => setForm(s => ({ ...s, [k]: e.target.value })) }

  return (
    <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--carta)',
      borderRadius: 8, border: '1px solid var(--linea)' }}>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Piano</label>
          <select value={form.piano} onChange={upd('piano')}>
            <option value="mensile">Mensile</option>
            <option value="annuale">Annuale</option>
            <option value="lifetime">Lifetime (a vita)</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Stato</label>
          <select value={form.stato} onChange={upd('stato')}>
            <option value="attivo">🟢 Attivo</option>
            <option value="disdetto">🟡 Disdetto</option>
            <option value="scaduto">🔴 Scaduto</option>
            <option value="cancellato">⛔ Cancellato</option>
          </select>
        </div>
        {form.piano !== 'lifetime' && (
          <div className="field" style={{ margin: 0 }}>
            <label>Scadenza</label>
            <input type="date" value={form.scadenza} onChange={upd('scadenza')} />
          </div>
        )}
        <div className="field field-full" style={{ margin: 0 }}>
          <label>Nota (motivo, facoltativa)</label>
          <input type="text" value={form.nota} onChange={upd('nota')} placeholder="Es. pagamento alternativo, omaggio partner, test…" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => onSave(form)} disabled={busy}>
          {busy ? 'Salvataggio...' : isNew ? '+ Crea abbonamento' : '💾 Salva modifiche'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel} disabled={busy}>
          Annulla
        </button>
        {!isNew && onDelete && (
          <button className="btn-ghost btn-del" type="button" onClick={onDelete} disabled={busy}
            style={{ marginLeft: 'auto' }}>
            Elimina
          </button>
        )}
      </div>
    </div>
  )
}
