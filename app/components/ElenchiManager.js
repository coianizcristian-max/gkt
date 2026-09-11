'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const NUMERICHE = new Set(['scala_voti', 'punti_partita'])
const ETICHETTE_KEY = { piede: 'et_piede', scala_voti: 'et_scalaVoti', punti_partita: 'et_puntiPartita', tipologie_esercizio: 'et_tipologieEsercizio' }
const DESCR_KEY = { scala_voti: 'descr_scalaVoti', punti_partita: 'descr_puntiPartita', tipologie_esercizio: 'descr_tipologieEsercizio' }

export default function ElenchiManager({ gruppi }) {
  const t = useTranslations('elenchiManager')
  const router = useRouter()
  const chiavi = Object.keys(gruppi)
  const [tab, setTab] = useState(chiavi[0] ?? '')
  const etichetta = (k) => (ETICHETTE_KEY[k] ? t(ETICHETTE_KEY[k]) : k)

  async function aggiungiVoce(elenco) {
    const supabase = createClient()
    const voci = gruppi[elenco]
    const maxOrd = voci.reduce((m, v) => Math.max(m, v.ordine), 0)
    const riga = { elenco, valore: 'Nuova voce', ordine: maxOrd + 1 }
    if (NUMERICHE.has(elenco)) riga.valore_num = 0
    const { error } = await supabase.from('elenco_voci').insert(riga)
    if (error) alert(t('errore', { msg: error.message }))
    router.refresh()
  }

  const attivo = chiavi.includes(tab) ? tab : (chiavi[0] ?? '')

  return (
    <div className="lista-editor">
      <p className="sub-intro">{t('intro')}</p>
      <div className="sub-nav">
        {chiavi.map((k) => (
          <button key={k} type="button" className={`sub-nav-link ${attivo === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {etichetta(k)}
          </button>
        ))}
      </div>
      {attivo && (
        <div className="elenco-blocco" key={attivo}>
          {DESCR_KEY[attivo] && <p className="sub-intro">{t(DESCR_KEY[attivo])}</p>}
          {gruppi[attivo].map((v) => (
            <VoceRiga key={v.id} voce={v} numerica={NUMERICHE.has(attivo)} onChanged={() => router.refresh()} />
          ))}
          <button className="btn-ghost" onClick={() => aggiungiVoce(attivo)} type="button">{t('aggiungiVoce')}</button>
        </div>
      )}
    </div>
  )
}

function VoceRiga({ voce, numerica, onChanged }) {
  const t = useTranslations('elenchiManager')
  const [valore, setValore] = useState(voce.valore)
  const [valoreNum, setValoreNum] = useState(voce.valore_num ?? '')
  const [ordine, setOrdine] = useState(voce.ordine)
  const [attivo, setAttivo] = useState(voce.attivo)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const proposta = voce.stato === 'proposta'

  async function salva(extra = {}) {
    setBusy(true)
    const supabase = createClient()
    const patch = { valore, ordine: Number(ordine) || 0, attivo, ...extra }
    if (numerica) patch.valore_num = valoreNum === '' ? null : Number(valoreNum)
    const { error } = await supabase.from('elenco_voci').update(patch).eq('id', voce.id)
    if (error) alert(t('errore', { msg: error.message })); else setDone(true)
    setBusy(false); onChanged()
  }
  async function approva() { await salva({ stato: 'standard' }) }
  async function elimina() {
    if (!confirm(t('confermaElim', { valore: voce.valore }))) return
    const supabase = createClient()
    const { error } = await supabase.from('elenco_voci').delete().eq('id', voce.id)
    if (error) alert(t('errore', { msg: error.message }))
    onChanged()
  }

  return (
    <div className="lista-riga">
      <input className="lista-nome" value={valore} onChange={(e) => { setValore(e.target.value); setDone(false) }} />
      {numerica && (
        <label className="lista-ord">{t('valore')}
          <input type="number" step="0.01" value={valoreNum} onChange={(e) => { setValoreNum(e.target.value); setDone(false) }} />
        </label>
      )}
      <label className="lista-ord">{t('ordine')}
        <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} />
      </label>
      <label className="lista-attiva">
        <input type="checkbox" checked={attivo} onChange={(e) => { setAttivo(e.target.checked); setDone(false) }} /> {t('attiva')}
      </label>
      {proposta && <span className="badge-proposta">{t('proposta')}</span>}
      {proposta && <button className="btn-mini" onClick={approva} disabled={busy} type="button">{t('approva')}</button>}
      <button className="btn-mini" onClick={() => salva()} disabled={busy} type="button">{done ? '\u2713' : t('salva')}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">{t('elimina')}</button>
    </div>
  )
}
