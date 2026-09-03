'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SelettoreCollegamenti, TrendObiettivo } from '@/app/components/ObiettivoCollegamenti'
import ObiettivoMisurazioni from '@/app/components/ObiettivoMisurazioni'
import ProposteObiettivi from '@/app/components/ProposteObiettivi'

const STATI = ['aperto', 'raggiunto', 'sospeso']

const CATEGORIE = [
  { v: 'tecnico', label: 'Tecnico', emoji: '🧤' },
  { v: 'tattico', label: 'Tattico', emoji: '🧠' },
  { v: 'mentale', label: 'Mentale', emoji: '💪' },
  { v: 'fisico', label: 'Fisico', emoji: '🏃' },
  { v: 'comportamentale', label: 'Comportamentale', emoji: '🤝' },
]
const catInfo = (v) => CATEGORIE.find((c) => c.v === v) ?? CATEGORIE[0]

const PRIORITA = [
  { v: 'alta', label: 'Alta', colore: '#c0392b' },
  { v: 'media', label: 'Media', colore: '#e8a72c' },
  { v: 'bassa', label: 'Bassa', colore: '#4a5b68' },
]
const prioInfo = (v) => PRIORITA.find((p) => p.v === v) ?? PRIORITA[1]

const LIVELLI = [
  { v: 'stagionale', label: 'Stagionale', desc: 'Intera stagione' },
  { v: 'mensile', label: 'Mensile', desc: '30 giorni' },
  { v: 'micro', label: 'Micro-obiettivo', desc: '1 settimana' },
]
const livInfo = (v) => LIVELLI.find((l) => l.v === v) ?? LIVELLI[0]

function PercentualeBar({ value }) {
  const col = value >= 100 ? '#1f8a4c' : value >= 50 ? '#0a7ec2' : value >= 25 ? '#e8a72c' : '#4a5b68'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--linea)', borderRadius: 4 }}>
        <div style={{ width: `${value}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 32, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

export default function ObiettiviManager({ portiereId, stagioneId, ruolo, obiettivi, sottoByObiettivo, parametriTutti = [], eserciziTutti = [], collegamentiPerObiettivo = {}, trendPerObiettivo = {}, proposte = [] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [filtroLivello, setFiltroLivello] = useState('tutti')
  const [tab, setTab] = useState('obiettivi')

  // Il portiere può VEDERE gli obiettivi ma non crearli/modificarli: quelle scritture
  // sono riservate al preparatore (la RLS le rifiuta). Nascondere i controlli evita
  // l'errore "row-level security policy for table obiettivi". Le proposte personali,
  // invece, le può inserire anche il portiere (tab dedicato, tabella separata).
  const isPortiere = ruolo === 'portiere'

  const lista = filtroLivello === 'tutti' ? obiettivi : obiettivi.filter((o) => (o.livello ?? 'stagionale') === filtroLivello)

  return (
    <div className="lista-editor">
      {/* Tab principali: Obiettivi | Proposta obiettivi personali */}
      <div className="sub-nav" style={{ marginBottom: 14 }}>
        <button type="button" className={`sub-nav-link ${tab === 'obiettivi' ? 'active' : ''}`} onClick={() => setTab('obiettivi')}>🎯 Obiettivi</button>
        <button type="button" className={`sub-nav-link ${tab === 'proposte' ? 'active' : ''}`} onClick={() => setTab('proposte')}>💡 Proposta obiettivi personali</button>
      </div>

      {tab === 'proposte' ? (
        <ProposteObiettivi portiereId={portiereId} stagioneId={stagioneId} ruolo={ruolo} proposte={proposte} />
      ) : (
      <>
      <p className="sub-intro">
        Obiettivi in stile PNL: definiscili in modo &ldquo;ben formato&rdquo; (in positivo, misurabili, contestualizzati), con scadenze, note e sotto-obiettivi da monitorare.
        {isPortiere
          ? ' Come portiere qui li consulti in sola lettura: per suggerire un tuo obiettivo usa il tab &ldquo;Proposta obiettivi personali&rdquo;, che il preparatore poi gestisce.'
          : ' Usa il tab &ldquo;Proposta obiettivi personali&rdquo; per raccogliere e gestire (✔/✘) le proposte che arrivano dai portieri.'}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div className="sub-nav" style={{ marginBottom: 0 }}>
          <button type="button" className={`sub-nav-link ${filtroLivello === 'tutti' ? 'active' : ''}`} onClick={() => setFiltroLivello('tutti')}>Tutti</button>
          {LIVELLI.map((l) => (
            <button key={l.v} type="button" className={`sub-nav-link ${filtroLivello === l.v ? 'active' : ''}`} onClick={() => setFiltroLivello(l.v)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {!isPortiere && (creating
        ? <ObiettivoCard portiereId={portiereId} stagioneId={stagioneId} onSaved={() => { setCreating(false); router.refresh() }} onCancel={() => setCreating(false)} />
        : <button className="btn-azione" onClick={() => setCreating(true)} type="button">+ Nuovo obiettivo</button>)}

      {lista.length === 0 && !creating && <div className="empty">Nessun obiettivo {filtroLivello !== 'tutti' ? `di tipo "${livInfo(filtroLivello).label}"` : ''}.</div>}
      {lista.map((o) => (
        <ObiettivoCard key={o.id} obiettivo={o} sotto={sottoByObiettivo[o.id] ?? []}
          portiereId={portiereId} stagioneId={stagioneId} onSaved={() => router.refresh()}
          parametriTutti={parametriTutti} eserciziTutti={eserciziTutti}
          collegamenti={collegamentiPerObiettivo[o.id] ?? { parametri: [], esercizi: [] }}
          trend={trendPerObiettivo[o.id] ?? {}}
          soloLettura={isPortiere}
        />
      ))}
      </>
      )}
    </div>
  )
}

function ObiettivoCard({ obiettivo, sotto = [], portiereId, stagioneId, onSaved, onCancel, parametriTutti = [], eserciziTutti = [], collegamenti = { parametri: [], esercizi: [] }, trend = {}, soloLettura = false }) {
  const isEdit = !!obiettivo
  const [espanso, setEspanso] = useState(!isEdit)
  const [f, setF] = useState({
    titolo: obiettivo?.titolo ?? '',
    categoria: obiettivo?.categoria ?? 'tecnico',
    priorita: obiettivo?.priorita ?? 'media',
    livello: obiettivo?.livello ?? 'stagionale',
    percentuale: obiettivo?.percentuale ?? 0,
    evidenza: obiettivo?.evidenza ?? '',
    contesto: obiettivo?.contesto ?? '',
    risorse: obiettivo?.risorse ?? '',
    ostacoli: obiettivo?.ostacoli ?? '',
    motivazione: obiettivo?.motivazione ?? '',
    scadenza: obiettivo?.scadenza ?? '',
    note: obiettivo?.note ?? '',
    stato: obiettivo?.stato ?? 'aperto',
  })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  async function salva() {
    if (!f.titolo.trim()) { setError('Inserisci un titolo.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    const payload = {
      portiere_id: portiereId, stagione_id: stagioneId ?? null,
      titolo: f.titolo.trim(), categoria: f.categoria, priorita: f.priorita,
      livello: f.livello, percentuale: Number(f.percentuale) || 0,
      evidenza: f.evidenza || null, contesto: f.contesto || null,
      risorse: f.risorse || null, ostacoli: f.ostacoli || null, motivazione: f.motivazione || null,
      scadenza: f.scadenza || null, note: f.note || null,
      stato: Number(f.percentuale) >= 100 ? 'raggiunto' : f.stato,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from('obiettivi').update(payload).eq('id', obiettivo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obiettivi').insert(payload)
        if (error) throw error
      }
      setDone(true); setBusy(false); if (onSaved) onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  async function elimina() {
    if (!confirm('Archiviare questo obiettivo? Uscirà dalla lista attiva, ma resterà nello storico del Percorso di crescita e nei collegamenti con valutazioni/esercizi.')) return
    const supabase = createClient()
    const { error } = await supabase.from('obiettivi').update({ archiviato: true }).eq('id', obiettivo.id)
    if (error) alert('Errore: ' + error.message); else if (onSaved) onSaved()
  }

  // Vista compatta (chiusa) per obiettivi già salvati
  if (isEdit && !espanso) {
    const cat = catInfo(f.categoria)
    const prio = prioInfo(f.priorita)
    const liv = livInfo(f.livello)
    return (
      <div className={`obiettivo-card stato-${f.stato}`} style={{ cursor: 'pointer' }} onClick={() => setEspanso(true)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--carta)', padding: '2px 8px', borderRadius: 4 }}>{cat.emoji} {cat.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: prio.colore }}>● {prio.label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{liv.label}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{f.titolo}</div>
          </div>
        </div>
        <PercentualeBar value={Number(f.percentuale) || 0} />
      </div>
    )
  }

  return (
    <div className={`obiettivo-card stato-${f.stato}`}>
      {error && <div className="err">{error}</div>}
      <fieldset disabled={soloLettura} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <div className="form-grid">
        <div className="field field-full"><label>Obiettivo (in positivo): cosa vuoi ottenere? *</label>
          <input value={f.titolo} onChange={upd('titolo')} /></div>

        <div className="field"><label>Categoria</label>
          <select value={f.categoria} onChange={upd('categoria')}>
            {CATEGORIE.map((c) => <option key={c.v} value={c.v}>{c.emoji} {c.label}</option>)}
          </select></div>
        <div className="field"><label>Priorità</label>
          <select value={f.priorita} onChange={upd('priorita')}>
            {PRIORITA.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select></div>

        <div className="field"><label>Livello</label>
          <select value={f.livello} onChange={upd('livello')}>
            {LIVELLI.map((l) => <option key={l.v} value={l.v}>{l.label} — {l.desc}</option>)}
          </select></div>
        <div className="field"><label>Scadenza</label>
          <input type="date" value={f.scadenza} onChange={upd('scadenza')} /></div>

        <div className="field field-full">
          <label>Avanzamento: {f.percentuale}%</label>
          <input type="range" min="0" max="100" step="5" value={f.percentuale} onChange={upd('percentuale')} style={{ width: '100%' }} />
          <PercentualeBar value={Number(f.percentuale) || 0} />
        </div>

        <div className="field field-full"><label>Come saprai di averlo raggiunto? (evidenze concrete)</label>
          <textarea rows="2" value={f.evidenza} onChange={upd('evidenza')} /></div>
        <div className="field field-full"><label>Dove, quando e con chi? (contesto)</label>
          <textarea rows="2" value={f.contesto} onChange={upd('contesto')} /></div>
        <div className="field field-full"><label>Quali risorse ti servono?</label>
          <textarea rows="2" value={f.risorse} onChange={upd('risorse')} /></div>
        <div className="field field-full"><label>Cosa lo impedisce ora? (ostacoli)</label>
          <textarea rows="2" value={f.ostacoli} onChange={upd('ostacoli')} /></div>
        <div className="field field-full"><label>Perche e importante? (motivazione)</label>
          <textarea rows="2" value={f.motivazione} onChange={upd('motivazione')} /></div>
        <div className="field"><label>Stato</label>
          <select value={f.stato} onChange={upd('stato')}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      </fieldset>

      <div className="form-actions">
        {isEdit && <button className="btn-ghost" onClick={() => setEspanso(false)} type="button">Comprimi</button>}
        {!soloLettura && onCancel && <button className="btn-ghost" onClick={onCancel} type="button">Annulla</button>}
        {!soloLettura && isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">Archivia</button>}
        {!soloLettura && <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva obiettivo'}</button>}
      </div>

      {isEdit && <TrendObiettivo trendPerParametro={trend} />}
      {isEdit && !soloLettura && (
        <SelettoreCollegamenti
          obiettivoId={obiettivo.id}
          parametriTutti={parametriTutti}
          parametriSelezionati={collegamenti.parametri}
          eserciziTutti={eserciziTutti}
          eserciziSelezionati={collegamenti.esercizi}
        />
      )}
      {isEdit && !soloLettura && <SottoObiettivi obiettivoId={obiettivo.id} sotto={sotto} onChanged={onSaved} />}
      {isEdit && !soloLettura && <ObiettivoMisurazioni obiettivoId={obiettivo.id} eserciziTutti={eserciziTutti} />}
      {/* Sotto-obiettivi in sola lettura per il portiere */}
      {isEdit && soloLettura && sotto.length > 0 && (
        <div className="elenco-blocco">
          <h3>Sotto-obiettivi da monitorare</h3>
          {sotto.map((so) => (
            <div key={so.id} className="lista-riga" style={{ opacity: 0.9 }}>
              <span className="lista-nome" style={{ flex: 1 }}>{so.descrizione}</span>
              {so.scadenza && <span className="lista-ord" style={{ fontSize: 12 }}>Scad. {so.scadenza}</span>}
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{so.stato ?? 'aperto'}</span>
            </div>
          ))}
        </div>
      )}
      {!isEdit && <p className="sub-intro">Salva l&rsquo;obiettivo per aggiungere i sotto-obiettivi.</p>}
    </div>
  )
}

function SottoObiettivi({ obiettivoId, sotto, onChanged }) {
  async function aggiungi() {
    const supabase = createClient()
    const maxOrd = sotto.reduce((m, x) => Math.max(m, x.ordine ?? 0), 0)
    const { error } = await supabase.from('sotto_obiettivi')
      .insert({ obiettivo_id: obiettivoId, descrizione: 'Nuovo sotto-obiettivo', ordine: maxOrd + 1 })
    if (error) alert('Errore: ' + error.message); else if (onChanged) onChanged()
  }
  return (
    <div className="elenco-blocco">
      <h3>Sotto-obiettivi da monitorare</h3>
      {sotto.length === 0 && <p className="sub-intro">Nessun sotto-obiettivo.</p>}
      {sotto.map((so) => <SottoRiga key={so.id} so={so} onChanged={onChanged} />)}
      <button className="btn-ghost" onClick={aggiungi} type="button">+ Aggiungi sotto-obiettivo</button>
    </div>
  )
}

function SottoRiga({ so, onChanged }) {
  const [descrizione, setDescrizione] = useState(so.descrizione)
  const [scadenza, setScadenza] = useState(so.scadenza ?? '')
  const [stato, setStato] = useState(so.stato ?? 'aperto')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('sotto_obiettivi')
      .update({ descrizione, scadenza: scadenza || null, stato }).eq('id', so.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); if (onChanged) onChanged()
  }
  async function elimina() {
    const supabase = createClient()
    await supabase.from('sotto_obiettivi').delete().eq('id', so.id)
    if (onChanged) onChanged()
  }
  return (
    <div className="lista-riga">
      <input className="lista-nome" style={{ flex: 1 }} value={descrizione} onChange={(e) => { setDescrizione(e.target.value); setDone(false) }} />
      <label className="lista-ord">Scadenza<input type="date" value={scadenza} onChange={(e) => { setScadenza(e.target.value); setDone(false) }} /></label>
      <select value={stato} onChange={(e) => { setStato(e.target.value); setDone(false) }}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '\u2713' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
