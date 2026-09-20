'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import OrarioSelect from '@/app/components/OrarioSelect'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }
const pad = (n) => String(n).padStart(2, '0')
const toDs = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function RicorrenzeManager({ stagione, categorie, ricorrenze }) {
  const t = useTranslations('ricorrenzeManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const [gen, setGen] = useState('')
  const haRange = !!(stagione?.data_inizio && stagione?.data_fine)

  async function aggiungi(squadraId) {
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').insert({
      stagione_id: stagione.id, squadra_id: squadraId,
      giorno_settimana: 1, ora_inizio: '18:00',
      data_inizio_ric: null, data_fine_ric: null,
    })
    if (error) alert(t('errore', { msg: error.message }))
    router.refresh()
  }

  async function genera() {
    if (!haRange) { alert(t('impostaRange')); return }
    if (!ricorrenze.length) { alert(t('aggiungiAlmeno')); return }
    if (!confirm(t('confermaGenera'))) return
    setGen('working')
    const supabase = createClient()
    try {
      const { data: ricFresh } = await supabase.from('ricorrenze_stagionali').select('*').eq('stagione_id', stagione.id)
      const ricAttive = ricFresh ?? ricorrenze
      if (!ricAttive.length) { setGen(t('aggiungiAlmeno')); return }

      const stagStart = new Date(stagione.data_inizio + 'T00:00:00')
      const stagEnd   = new Date(stagione.data_fine   + 'T00:00:00')

      const { data: existing } = await supabase.from('allenamenti')
        .select('id, data, squadra_id, ora_inizio, ora_fine, accorpata_con').eq('stagione_id', stagione.id)
      const existMap = {}
      for (const a of (existing ?? [])) existMap[a.squadra_id + '|' + a.data] = a

      const piano = {}
      for (const r of ricAttive) {
        const dow    = r.giorno_settimana % 7
        const rStart = r.data_inizio_ric ? new Date(r.data_inizio_ric + 'T00:00:00') : new Date(stagStart)
        const rEnd   = r.data_fine_ric   ? new Date(r.data_fine_ric   + 'T00:00:00') : new Date(stagEnd)
        const start  = rStart < stagStart ? new Date(stagStart) : rStart
        const end    = rEnd   > stagEnd   ? new Date(stagEnd)   : rEnd
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === dow) {
            const ds = toDs(d)
            if (!piano[ds]) piano[ds] = {}
            piano[ds][r.squadra_id] = r
          }
        }
      }

      const toInsert = []
      const toUpdate = []
      for (const [ds, catMap] of Object.entries(piano)) {
        for (const [squadraId, r] of Object.entries(catMap)) {
          let accorpataCon = null
          if (r.accorpata_con && catMap[r.accorpata_con]) accorpataCon = r.accorpata_con
          const key      = squadraId + '|' + ds
          const esistente = existMap[key]
          const oraTarget     = r.ora_inizio || '18:00'
          const oraFineTarget = r.ora_fine || null
          if (esistente) {
            const oraChanged  = oraTarget !== (esistente.ora_inizio || '18:00')
            const fineChanged = oraFineTarget !== (esistente.ora_fine ?? null)
            const accChanged  = accorpataCon !== (esistente.accorpata_con ?? null)
            if (oraChanged || fineChanged || accChanged) toUpdate.push({ id: esistente.id, ora_inizio: oraTarget, ora_fine: oraFineTarget, accorpata_con: accorpataCon })
          } else {
            toInsert.push({ stagione_id: stagione.id, squadra_id: squadraId, data: ds, ora_inizio: oraTarget, ora_fine: oraFineTarget, accorpata_con: accorpataCon })
          }
        }
      }

      let inseriti = 0
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from('allenamenti').insert(toInsert.slice(i, i + 200))
        if (error) throw error
        inseriti += Math.min(200, toInsert.length - i)
      }
      let aggiornati = 0
      for (const u of toUpdate) {
        const { error } = await supabase.from('allenamenti')
          .update({ ora_inizio: u.ora_inizio, ora_fine: u.ora_fine, accorpata_con: u.accorpata_con }).eq('id', u.id)
        if (!error) aggiornati++
      }

      const msg = []
      if (inseriti   > 0) msg.push(t('creatiN', { n: inseriti }))
      if (aggiornati > 0) msg.push(t('aggiornatiN', { n: aggiornati }))
      if (!msg.length)    msg.push(t('nessunaModifica'))
      setGen(msg.join(' · ') + '.')
      router.refresh()
    } catch (err) { setGen(t('errore', { msg: err.message })) }
  }

  const perCat = (id) => ricorrenze.filter((r) => r.squadra_id === id)

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        {t.rich('intro', { b: (ch) => <b>{ch}</b> })}
      </p>

      {!haRange && (
        <div className="err" style={{ marginBottom: 16 }}>
          {t.rich('senzaRange', { b: (ch) => <b>{ch}</b>, a: (ch) => <a href="/stagioni" className="link-inline">{ch}</a> })}
        </div>
      )}

      {haRange && (
        <div className="ok-msg" style={{ marginBottom: 16 }}>
          {t('stagioneRange', {
            dal: new Date(stagione.data_inizio + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' }),
            al: new Date(stagione.data_fine + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' }),
          })}
        </div>
      )}

      {categorie.map((c) => {
        const righe = perCat(c.id)
        return (
          <div className="elenco-blocco" key={c.id}>
            <h3>{c.nome}</h3>
            {righe.length === 0 && (
              <p className="sub-intro" style={{ color: 'var(--rosso)', margin: '0 0 8px' }}>{t('nessunaRicorrenza')}</p>
            )}
            {righe.map((r) => (
              <RicorrenzaRiga key={r.id} ricorrenza={r} categorie={categorie} stagione={stagione} onChanged={() => router.refresh()} />
            ))}
            <button className="btn-ghost" onClick={() => aggiungi(c.id)} type="button">{t('aggiungiGiorno')}</button>
          </div>
        )
      })}

      <div className="form-actions">
        <button className="btn" onClick={genera} disabled={gen === 'working' || !haRange} type="button">
          {gen === 'working' ? t('generazione') : t('generaAggiorna')}
        </button>
      </div>
      {gen && gen !== 'working' && <p className="sub-intro" style={{ marginTop: 8 }}>{gen}</p>}
    </div>
  )
}

function RicorrenzaRiga({ ricorrenza, categorie, stagione, onChanged }) {
  const t = useTranslations('ricorrenzeManager')
  const [g,          setG]          = useState(ricorrenza.giorno_settimana)
  const [oi,         setOi]         = useState(ricorrenza.ora_inizio?.slice(0, 5) ?? '18:00')
  const [ofine,      setOfine]      = useState(ricorrenza.ora_fine?.slice(0, 5) ?? '')
  const [accorpaCon, setAccorpaCon] = useState(ricorrenza.accorpata_con ?? '')
  const [dStart,     setDStart]     = useState(ricorrenza.data_inizio_ric ?? '')
  const [dEnd,       setDEnd]       = useState(ricorrenza.data_fine_ric   ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const ch = () => setDone(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').update({
      giorno_settimana: Number(g),
      ora_inizio: oi || '18:00',
      ora_fine: ofine || null,
      accorpata_con: accorpaCon || null,
      data_inizio_ric: dStart || null,
      data_fine_ric:   dEnd   || null,
    }).eq('id', ricorrenza.id)
    if (error) alert(t('errore', { msg: error.message })); else setDone(true)
    setBusy(false); onChanged()
  }

  async function elimina() {
    if (!confirm(t('confermaElimRic'))) return
    const supabase = createClient()
    await supabase.from('ricorrenze_stagionali').delete().eq('id', ricorrenza.id)
    onChanged()
  }

  const nomeAccorpata = categorie.find((c) => c.id === accorpaCon)?.nome ?? ''

  return (
    <div className="lista-riga ric-riga">
      {/* riepilogo in cima: si capisce al volo di che giorno e orario si tratta */}
      <div className="ric-testa">
        <b>{t('giorno_' + g)}</b>
        <span>{oi?.slice(0, 5)}{ofine ? `–${ofine.slice(0, 5)}` : ''}</span>
      </div>
      <div className="ric-campo">
        <span>{t('giorno')}</span>
        <select value={g} onChange={(e) => { setG(e.target.value); ch() }}>
          {[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{t('giorno_' + n)}</option>)}
        </select>
      </div>
      <div className="ric-campo">
        <span>{t('inizio')}</span>
        <OrarioSelect value={oi} onChange={(e) => { setOi(e.target.value); ch() }} />
      </div>
      <div className="ric-campo">
        <span>{t('fine')}</span>
        <OrarioSelect value={ofine} onChange={(e) => { setOfine(e.target.value); ch() }} />
      </div>
      <div className="ric-campo">
        <span>{t('dal')}</span>
        <input type="date" value={dStart} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDStart(e.target.value); ch() }} />
      </div>
      <div className="ric-campo">
        <span>{t('al')}</span>
        <input type="date" value={dEnd} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDEnd(e.target.value); ch() }} />
      </div>
      <div className="ric-campo">
        <span>{t('accorpaCon')}</span>
        <select value={accorpaCon} onChange={(e) => { setAccorpaCon(e.target.value); ch() }}>
          <option value="">{t('nessunaAccorpa')}</option>
          {(categorie ?? []).filter((c) => c.id !== ricorrenza.squadra_id).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div className="ric-azioni">
        <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? `✓ ${t('salva')}` : t('salva')}</button>
        <button className="btn-mini btn-del" onClick={elimina} type="button">{t('elimina')}</button>
      </div>
      {accorpaCon && (
        <p style={{ width:'100%', margin:'4px 0 0', fontSize:11, color:'var(--giallo)' }}>
          {t.rich('accorpaNota', { nome: nomeAccorpata, b: (ch) => <b>{ch}</b> })}
        </p>
      )}
    </div>
  )
}

export function EliminazioneRapida({ stagione, categorie }) {
  const t = useTranslations('ricorrenzeManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const [tipo,        setTipo]        = useState('allenamenti')
  const [dal,         setDal]         = useState('')
  const [al,          setAl]          = useState('')
  const [categoriaId, setCategoriaId] = useState('tutte')
  const [filtroVal,   setFiltroVal]   = useState('tutti')
  const [busy,        setBusy]        = useState(false)
  const [risultato,   setRisultato]   = useState(null)
  const [errore,      setErrore]      = useState('')
  const tipoLabel = tipo === 'allenamenti' ? t('tipoAllenamenti') : t('tipoPartite')
  const filtroValLabel = { tutti: t('fvTutti'), senza: t('fvSenza'), con: t('fvCon') }[filtroVal]

  async function elimina() {
    if (!dal || !al) { setErrore(t('selezionaDate')); return }
    if (dal > al)    { setErrore(t('dalPrecedente')); return }
    const catLabel = categoriaId === 'tutte' ? t('tutteCategorieLabel') : t('categoriaLabel', { nome: categorie.find((c) => c.id === categoriaId)?.nome ?? categoriaId })
    const dalLabel = new Date(dal + 'T00:00:00').toLocaleDateString(dl, { day:'numeric', month:'long', year:'numeric' })
    const alLabel  = new Date(al  + 'T00:00:00').toLocaleDateString(dl, { day:'numeric', month:'long', year:'numeric' })
    if (!window.confirm(t('confermaMassiva', { tipo: tipoLabel, dal: dalLabel, al: alLabel, cat: catLabel, filtro: filtroValLabel }))) return
    setBusy(true); setErrore(''); setRisultato(null)
    try {
      const res = await fetch('/api/elimina-massiva', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tipo, dal, al, categoriaId, stagioneId: stagione.id, filtroVal }),
      })
      const body = await res.json()
      if (!res.ok) { setErrore(body.error ?? t('erroreGenerico')); setBusy(false); return }
      setRisultato(body.eliminati); router.refresh()
    } catch { setErrore(t('erroreRete')) }
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop:28, borderTop:'2px solid var(--linea)', paddingTop:24 }}>
      <h3 style={{ marginTop:0, marginBottom:4 }}>{t('massivaTitolo')}</h3>
      <p className="sub-intro" style={{ marginBottom:16 }}>{t('massivaIntro')}</p>
      {errore && <div className="err" style={{ marginBottom:12 }}>{errore}</div>}
      {risultato != null && <div className="ok-msg" style={{ marginBottom:12 }}>{t('eliminatiN', { n: risultato, tipo: tipoLabel })}</div>}
      <div className="form-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
        <div className="field" style={{ margin:0 }}>
          <label>{t('tipoLabel')}</label>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setRisultato(null) }}>
            <option value="allenamenti">{t('optAllenamenti')}</option>
            <option value="partite">{t('optPartite')}</option>
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>{t('categoria')}</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="tutte">{t('tutteCategorie')}</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>{t('valutazioni')}</label>
          <select value={filtroVal} onChange={(e) => { setFiltroVal(e.target.value); setRisultato(null) }}>
            <option value="tutti">{t('optTutti')}</option>
            <option value="senza">{t('optSenza')}</option>
            <option value="con">{t('optCon')}</option>
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>{t('dalLabel')}</label>
          <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} />
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>{t('alLabel')}</label>
          <input type="date" value={al} onChange={(e) => setAl(e.target.value)} />
        </div>
      </div>
      <button className="btn-ghost btn-del" onClick={elimina} disabled={busy || !dal || !al} type="button" style={{ minWidth:220 }}>
        {busy ? t('eliminazioneInCorso') : t('eliminaSelezionati', { tipo: tipoLabel })}
      </button>
    </div>
  )
}
