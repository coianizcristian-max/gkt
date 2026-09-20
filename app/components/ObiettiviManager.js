'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SelettoreCollegamenti, TrendObiettivo } from '@/app/components/ObiettivoCollegamenti'
import ObiettivoMisurazioni from '@/app/components/ObiettivoMisurazioni'
import ProposteObiettivi from '@/app/components/ProposteObiettivi'
import { useTranslations } from 'next-intl'

const STATI = ['aperto', 'raggiunto', 'sospeso']

const CATEGORIE = [
  { v: 'tecnico', key: 'catTecnico', emoji: '🧤' },
  { v: 'tattico', key: 'catTattico', emoji: '🧠' },
  { v: 'mentale', key: 'catMentale', emoji: '💪' },
  { v: 'fisico', key: 'catFisico', emoji: '🏃' },
  { v: 'comportamentale', key: 'catComportamentale', emoji: '🤝' },
]
const catInfo = (v) => CATEGORIE.find((c) => c.v === v) ?? CATEGORIE[0]

const PRIORITA = [
  { v: 'alta', key: 'prioAlta', colore: '#c0392b' },
  { v: 'media', key: 'prioMedia', colore: '#e8a72c' },
  { v: 'bassa', key: 'prioBassa', colore: '#4a5b68' },
]
const prioInfo = (v) => PRIORITA.find((p) => p.v === v) ?? PRIORITA[1]

const LIVELLI = [
  { v: 'stagionale', key: 'livStagionale', descKey: 'livStagionaleDesc' },
  { v: 'mensile', key: 'livMensile', descKey: 'livMensileDesc' },
  { v: 'micro', key: 'livMicro', descKey: 'livMicroDesc' },
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
  const [tab, setTab] = useState('obiettivi')
  const isPortiere = ruolo === 'portiere'
  const [filtroLivello, setFiltroLivello] = useState('tutti')
  const t = useTranslations('obiettiviManager')

  const lista = filtroLivello === 'tutti' ? obiettivi : obiettivi.filter((o) => (o.livello ?? 'stagionale') === filtroLivello)

  return (
    <div className="lista-editor">
      <div className="sub-nav" style={{ marginBottom: 14 }}>
        <button type="button" className={`sub-nav-link ${tab === 'obiettivi' ? 'active' : ''}`} onClick={() => setTab('obiettivi')}>{t('tabObiettivi')}</button>
        <button type="button" className={`sub-nav-link ${tab === 'proposte' ? 'active' : ''}`} onClick={() => setTab('proposte')}>{t('tabProposte')}</button>
      </div>

      {tab === 'proposte' ? (
        <ProposteObiettivi portiereId={portiereId} stagioneId={stagioneId} ruolo={ruolo} proposte={proposte} />
      ) : (
      <>
      {/* spiegazione raccolta: si legge una volta, poi non serve piu' vederla */}
      <details className="info-dett">
        <summary>{t('comeFunzionano')}</summary>
        <p>{t('subIntro')} {isPortiere ? t('subIntroPortiere') : t('subIntroCoach')}</p>
      </details>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div className="sub-nav" style={{ marginBottom: 0 }}>
          <button type="button" className={`sub-nav-link ${filtroLivello === 'tutti' ? 'active' : ''}`} onClick={() => setFiltroLivello('tutti')}>{t('tutti')}</button>
          {LIVELLI.map((l) => (
            <button key={l.v} type="button" className={`sub-nav-link ${filtroLivello === l.v ? 'active' : ''}`} onClick={() => setFiltroLivello(l.v)}>
              {t(l.key)}
            </button>
          ))}
        </div>
      </div>

      {!isPortiere && (creating
        ? <ObiettivoCard portiereId={portiereId} stagioneId={stagioneId} onSaved={() => { setCreating(false); router.refresh() }} onCancel={() => setCreating(false)} />
        : <button className="btn-azione" onClick={() => setCreating(true)} type="button">{t('nuovoObiettivo')}</button>)}

      {lista.length === 0 && !creating && <div className="empty">{filtroLivello === 'tutti' ? t('nessunObiettivo') : t('nessunObiettivoTipo', { tipo: t(livInfo(filtroLivello).key) })}</div>}
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
  const t = useTranslations('obiettiviManager')
  const tc = useTranslations('common')
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
    if (!f.titolo.trim()) { setError(t('erroreTitolo')); return }
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
    if (!confirm(t('confermaArchivia'))) return
    const supabase = createClient()
    const { error } = await supabase.from('obiettivi').update({ archiviato: true }).eq('id', obiettivo.id)
    if (error) alert(t('erroreAlert') + error.message); else if (onSaved) onSaved()
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
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--carta)', padding: '2px 8px', borderRadius: 4 }}>{cat.emoji} {t(cat.key)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: prio.colore }}>● {t(prio.key)}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t(liv.key)}</span>
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
        <div className="field field-full"><label>{t('labelTitolo')}</label>
          <input value={f.titolo} onChange={upd('titolo')} /></div>

        <div className="field"><label>{t('labelCategoria')}</label>
          <select value={f.categoria} onChange={upd('categoria')}>
            {CATEGORIE.map((cat) => <option key={cat.v} value={cat.v}>{cat.emoji} {t(cat.key)}</option>)}
          </select></div>
        <div className="field"><label>{t('labelPriorita')}</label>
          <select value={f.priorita} onChange={upd('priorita')}>
            {PRIORITA.map((p) => <option key={p.v} value={p.v}>{t(p.key)}</option>)}
          </select></div>

        <div className="field"><label>{t('labelLivello')}</label>
          <select value={f.livello} onChange={upd('livello')}>
            {LIVELLI.map((l) => <option key={l.v} value={l.v}>{t(l.key)} — {t(l.descKey)}</option>)}
          </select></div>
        <div className="field"><label>{t('labelScadenza')}</label>
          <input type="date" value={f.scadenza} onChange={upd('scadenza')} /></div>

        <div className="field field-full">
          <label>{t('labelAvanzamento', { p: f.percentuale })}</label>
          <input type="range" min="0" max="100" step="5" value={f.percentuale} onChange={upd('percentuale')} style={{ width: '100%' }} />
          <PercentualeBar value={Number(f.percentuale) || 0} />
        </div>

        <div className="field field-full"><label>{t('labelEvidenza')}</label>
          <textarea rows="2" value={f.evidenza} onChange={upd('evidenza')} /></div>
        <div className="field field-full"><label>{t('labelContesto')}</label>
          <textarea rows="2" value={f.contesto} onChange={upd('contesto')} /></div>
        <div className="field field-full"><label>{t('labelRisorse')}</label>
          <textarea rows="2" value={f.risorse} onChange={upd('risorse')} /></div>
        <div className="field field-full"><label>{t('labelOstacoli')}</label>
          <textarea rows="2" value={f.ostacoli} onChange={upd('ostacoli')} /></div>
        <div className="field field-full"><label>{t('labelMotivazione')}</label>
          <textarea rows="2" value={f.motivazione} onChange={upd('motivazione')} /></div>
        <div className="field"><label>{t('labelStato')}</label>
          <select value={f.stato} onChange={upd('stato')}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="field field-full"><label>{t('labelNote')}</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      </fieldset>

      <div className="form-actions">
        {isEdit && <button className="btn-ghost" onClick={() => setEspanso(false)} type="button">{t('comprimi')}</button>}
        {!soloLettura && onCancel && <button className="btn-ghost" onClick={onCancel} type="button">{tc('annulla')}</button>}
        {!soloLettura && isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">{t('archivia')}</button>}
        {!soloLettura && <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? t('salvataggio') : done ? t('salvato') : t('salvaObiettivo')}</button>}
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
      {isEdit && soloLettura && sotto.length > 0 && (
        <div className="elenco-blocco">
          <h3>{t('sottoLetturaTitolo')}</h3>
          {sotto.map((so) => (
            <div key={so.id} className="lista-riga" style={{ opacity: 0.9 }}>
              <span className="lista-nome" style={{ flex: 1 }}>{so.descrizione}</span>
              {so.scadenza && <span className="lista-ord" style={{ fontSize: 12 }}>{t('scad')} {so.scadenza}</span>}
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{so.stato ?? 'aperto'}</span>
            </div>
          ))}
        </div>
      )}
      {!isEdit && <p className="sub-intro">{t('salvaPerSotto')}</p>}
    </div>
  )
}

function SottoObiettivi({ obiettivoId, sotto, onChanged }) {
  const t = useTranslations('obiettiviManager')
  async function aggiungi() {
    const supabase = createClient()
    const maxOrd = sotto.reduce((m, x) => Math.max(m, x.ordine ?? 0), 0)
    const { error } = await supabase.from('sotto_obiettivi')
      .insert({ obiettivo_id: obiettivoId, descrizione: t('nuovoSottoObiettivo'), ordine: maxOrd + 1 })
    if (error) alert(t('erroreAlert') + error.message); else if (onChanged) onChanged()
  }
  return (
    <div className="elenco-blocco">
      <h3>{t('sottoTitolo')}</h3>
      {sotto.length === 0 && <p className="sub-intro">{t('nessunSotto')}</p>}
      {sotto.map((so) => <SottoRiga key={so.id} so={so} onChanged={onChanged} />)}
      <button className="btn-ghost" onClick={aggiungi} type="button">{t('aggiungiSotto')}</button>
    </div>
  )
}

function SottoRiga({ so, onChanged }) {
  const t = useTranslations('obiettiviManager')
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
    if (error) alert(t('erroreAlert') + error.message); else setDone(true)
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
      <label className="lista-ord">{t('scadenzaSotto')}<input type="date" value={scadenza} onChange={(e) => { setScadenza(e.target.value); setDone(false) }} /></label>
      <select value={stato} onChange={(e) => { setStato(e.target.value); setDone(false) }}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '\u2713' : t('salvaSotto')}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">{t('eliminaSotto')}</button>
    </div>
  )
}
