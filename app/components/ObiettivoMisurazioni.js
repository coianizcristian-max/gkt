'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

// ─── Costanti ────────────────────────────────────────────────────────────────
const TIPI = [
  { v: 'valore',    key: 'tipoValore' },
  { v: 'conteggio', key: 'tipoConteggio' },
  { v: 'su_totale', key: 'tipoSuTotale' },
]
const DIREZIONI = [
  { v: 'alto',  key: 'dirAlto' },
  { v: 'basso', key: 'dirBasso' },
]

// ─── Stili inline (niente classi con bordi/ombre annidate) ────────────────────
const S = {
  box:     { border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', background: 'var(--bianco)', padding: 12, marginBottom: 10 },
  ctrl:    { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', font: 'inherit', fontSize: 14, background: 'var(--bianco)' },
  field:   { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--ink-soft)', flex: '1 1 120px', minWidth: 0 },
  rowWrap: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  btnRow:  { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
}

const oggiRoma = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })

function fmtValore(test, r) {
  if (test.tipo_misura === 'su_totale') {
    const tot = r.tentativi ?? 0
    const ok = r.riusciti ?? r.valore ?? 0
    const pct = tot ? Math.round((ok / tot) * 100) : null
    return `${ok}/${tot}${pct != null ? ` · ${pct}%` : ''}`
  }
  return `${r.valore ?? '—'}${test.unita ? ' ' + test.unita : ''}`
}

// Valore numerico confrontabile di una rilevazione.
// su_totale -> percentuale riusciti/tentativi (target interpretato come %).
function valoreNumerico(test, r) {
  if (test.tipo_misura === 'su_totale') {
    const tot = Number(r.tentativi)
    const ok = Number(r.riusciti ?? r.valore)
    if (!tot || isNaN(ok)) return null
    return (ok / tot) * 100
  }
  return r.valore == null ? null : Number(r.valore)
}

// Avanzamento automatico dai test: media dei progressi dei test che hanno un
// target e almeno due misurazioni. Progresso = (attuale - iniziale) / (target -
// iniziale), limitato a 0..100%. La formula funziona sia se "più alto è meglio"
// sia se "più basso è meglio" (il segno di target-iniziale si adatta).
// Ritorna { pct, nTest } oppure null se nessun test è calcolabile.
function calcolaAvanzamento(tests, rilByTest) {
  const progressi = []
  for (const t of tests) {
    if (t.target == null) continue
    const ril = rilByTest[t.id] ?? [] // ordinate per data desc
    if (ril.length < 2) continue
    const attuale = valoreNumerico(t, ril[0])
    const iniziale = valoreNumerico(t, ril[ril.length - 1])
    const target = Number(t.target)
    if (attuale == null || iniziale == null || isNaN(target)) continue
    if (target === iniziale) continue
    let p = (attuale - iniziale) / (target - iniziale)
    if (!isFinite(p)) continue
    p = Math.max(0, Math.min(1, p))
    progressi.push(p)
  }
  if (!progressi.length) return null
  const media = progressi.reduce((a, b) => a + b, 0) / progressi.length
  return { pct: Math.round(media * 100), nTest: progressi.length }
}

function prossimaMisura(test, ril) {
  if (!test.cadenza_giorni) return null
  const base = ril.length ? ril[0].data : test.data_inizio // ril ordinate desc per data
  if (!base) return null
  const d = new Date(base + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + test.cadenza_giorni)
  return d.toISOString().slice(0, 10)
}

// ─── Componente principale ───────────────────────────────────────────────────
export default function ObiettivoMisurazioni({ obiettivoId, eserciziTutti = [] }) {
  const router = useRouter()
  const t = useTranslations('obiettivoMisurazioni')
  const [tests, setTests] = useState([])
  const [rilByTest, setRilByTest] = useState({})
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applicato, setApplicato] = useState(false)

  const carica = useCallback(async () => {
    const supabase = createClient()
    const { data: ts } = await supabase
      .from('obiettivo_test').select('*').eq('obiettivo_id', obiettivoId).order('ordine')
    const testi = ts ?? []
    setTests(testi)
    const ids = testi.map((t) => t.id)
    if (ids.length) {
      const { data: rs } = await supabase
        .from('obiettivo_rilevazioni').select('*').in('test_id', ids)
        .order('data', { ascending: false })
      const map = {}
      for (const r of rs ?? []) (map[r.test_id] ??= []).push(r)
      setRilByTest(map)
    } else setRilByTest({})
    setLoading(false)
  }, [obiettivoId])

  useEffect(() => { carica() }, [carica])

  const auto = calcolaAvanzamento(tests, rilByTest)

  async function applicaAvanzamento() {
    if (!auto) return
    setApplying(true)
    const supabase = createClient()
    const { error } = await supabase.from('obiettivi').update({ percentuale: auto.pct }).eq('id', obiettivoId)
    setApplying(false)
    if (error) { alert(t('erroreAlert') + error.message); return }
    setApplicato(true)
    router.refresh()
  }

  return (
    <div className="elenco-blocco">
      <h3>{t('titolo')}</h3>
      {!loading && auto && (
        <div style={{ ...S.box, borderLeft: '3px solid var(--campo, #1f8a4c)', background: '#f2fbf5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{t('avanzamentoDaiTest', { pct: auto.pct })}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {t('calcolatoSu', { n: auto.nTest })}
              </div>
            </div>
            <button className="btn-mini" type="button" onClick={applicaAvanzamento} disabled={applying}>
              {applying ? '…' : applicato ? t('applicato') : t('applica')}
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="sub-intro">{t('carico')}</p>
      ) : (
        <>
          {tests.length === 0 && !creando && (
            <p className="sub-intro">{t('nessunTest')}</p>
          )}
          {tests.map((t) => (
            <TestBlocco key={t.id} test={t} ril={rilByTest[t.id] ?? []} onChanged={carica} />
          ))}
          {creando ? (
            <NuovoTest
              obiettivoId={obiettivoId}
              eserciziTutti={eserciziTutti}
              ordine={tests.length}
              onDone={() => { setCreando(false); carica() }}
              onCancel={() => setCreando(false)}
            />
          ) : (
            <button className="btn-ghost" type="button" onClick={() => setCreando(true)}>{t('aggiungiTest')}</button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Blocco di un singolo test ───────────────────────────────────────────────
function TestBlocco({ test, ril, onChanged }) {
  const t = useTranslations('obiettivoMisurazioni')
  const [aggiungo, setAggiungo] = useState(false)
  const _tipo = TIPI.find((x) => x.v === test.tipo_misura)
  const tipoLabel = _tipo ? t(_tipo.key) : test.tipo_misura
  const prossima = prossimaMisura(test, ril)
  const scaduta = prossima && prossima <= oggiRoma()

  async function eliminaTest() {
    if (!confirm(t('confermaEliminaTest', { nome: test.nome }))) return
    const supabase = createClient()
    const { error } = await supabase.from('obiettivo_test').delete().eq('id', test.id)
    if (error) alert(t('erroreAlert') + error.message); else onChanged()
  }

  return (
    <div style={{ ...S.box, borderLeft: '3px solid var(--azzurro)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{test.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {tipoLabel}
            {test.cadenza_giorni ? t('ogniGgSuffix', { n: test.cadenza_giorni }) : ''}
            {test.target != null ? t('targetSuffix', { val: `${test.target}${test.unita ? ' ' + test.unita : ''}` }) : ''}
          </div>
        </div>
        <button className="btn-mini btn-del" type="button" onClick={eliminaTest}>{t('elimina')}</button>
      </div>

      {prossima && (
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: scaduta ? 'var(--rosso)' : 'var(--ink-soft)' }}>
          {scaduta ? t('daFare') : t('prossima')}: {prossima}
        </div>
      )}

      {ril.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ril.map((r) => (
            <RilevazioneRiga key={r.id} test={test} r={r} onChanged={onChanged} />
          ))}
        </div>
      )}

      {aggiungo ? (
        <NuovaRilevazione test={test} onDone={() => { setAggiungo(false); onChanged() }} onCancel={() => setAggiungo(false)} />
      ) : (
        <button className="btn-mini" type="button" style={{ marginTop: 10 }} onClick={() => setAggiungo(true)}>{t('aggiungiRilevazione')}</button>
      )}
    </div>
  )
}

// ─── Riga di una rilevazione registrata ──────────────────────────────────────
function RilevazioneRiga({ test, r, onChanged }) {
  const t = useTranslations('obiettivoMisurazioni')
  async function elimina() {
    const supabase = createClient()
    await supabase.from('obiettivo_rilevazioni').delete().eq('id', r.id)
    onChanged()
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderTop: '1px solid var(--linea)' }}>
      <span style={{ minWidth: 88, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-soft)' }}>{r.data}</span>
      <span style={{ flex: 1, fontWeight: 700, minWidth: 0 }}>{fmtValore(test, r)}</span>
      {r.note && <span style={{ flex: 2, fontSize: 12, color: 'var(--ink-soft)', minWidth: 0 }}>{r.note}</span>}
      <button className="btn-mini btn-del" type="button" onClick={elimina}>{t('elimina')}</button>
    </div>
  )
}

// ─── Form: nuova rilevazione ─────────────────────────────────────────────────
function NuovaRilevazione({ test, onDone, onCancel }) {
  const t = useTranslations('obiettivoMisurazioni')
  const c = useTranslations('common')
  const suTotale = test.tipo_misura === 'su_totale'
  const [data, setData] = useState(oggiRoma())
  const [valore, setValore] = useState('')
  const [riusciti, setRiusciti] = useState('')
  const [tentativi, setTentativi] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function salva() {
    setBusy(true)
    const payload = { test_id: test.id, data, note: note || null }
    if (suTotale) {
      payload.riusciti = riusciti === '' ? null : Number(riusciti)
      payload.tentativi = tentativi === '' ? null : Number(tentativi)
      payload.valore = riusciti === '' ? null : Number(riusciti)
    } else {
      payload.valore = valore === '' ? null : Number(valore)
    }
    const supabase = createClient()
    const { error } = await supabase.from('obiettivo_rilevazioni').insert(payload)
    setBusy(false)
    if (error) alert(t('erroreAlert') + error.message); else onDone()
  }

  return (
    <div style={{ ...S.box, marginTop: 10, marginBottom: 0 }}>
      <div style={S.rowWrap}>
        <label style={S.field}>{t('labelData')}<input style={S.ctrl} type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
        {suTotale ? (
          <>
            <label style={S.field}>{t('labelRiusciti')}<input style={S.ctrl} type="number" value={riusciti} onChange={(e) => setRiusciti(e.target.value)} /></label>
            <label style={S.field}>{t('labelTentativi')}<input style={S.ctrl} type="number" value={tentativi} onChange={(e) => setTentativi(e.target.value)} /></label>
          </>
        ) : (
          <label style={S.field}>{test.unita ? t('labelValoreUnita', { unita: test.unita }) : t('labelValore')}<input style={S.ctrl} type="number" step="any" value={valore} onChange={(e) => setValore(e.target.value)} /></label>
        )}
      </div>
      <label style={{ ...S.field, marginTop: 8 }}>{t('noteFacoltative')}<input style={S.ctrl} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div style={S.btnRow}>
        <button className="btn-mini" type="button" onClick={salva} disabled={busy}>{t('salvaRilevazione')}</button>
        <button className="btn-mini btn-del" type="button" onClick={onCancel}>{c('annulla')}</button>
      </div>
    </div>
  )
}

// ─── Form: nuovo test ────────────────────────────────────────────────────────
function NuovoTest({ obiettivoId, eserciziTutti = [], ordine, onDone, onCancel }) {
  const t = useTranslations('obiettivoMisurazioni')
  const c = useTranslations('common')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('valore')
  const [dataInizio, setDataInizio] = useState(oggiRoma())
  const [unita, setUnita] = useState('')
  const [direzione, setDirezione] = useState('alto')
  const [cadenza, setCadenza] = useState('')
  const [target, setTarget] = useState('')
  const [esercizioId, setEsercizioId] = useState('')
  const [busy, setBusy] = useState(false)

  async function salva() {
    if (!nome.trim()) { alert(t('erroreNomeTest')); return }
    setBusy(true)
    const payload = {
      obiettivo_id: obiettivoId,
      nome: nome.trim(),
      tipo_misura: tipo,
      unita: tipo === 'su_totale' ? null : (unita.trim() || null),
      direzione,
      data_inizio: dataInizio || null,
      cadenza_giorni: cadenza === '' ? null : Number(cadenza),
      target: target === '' ? null : Number(target),
      esercizio_id: esercizioId || null,
      ordine,
    }
    const supabase = createClient()
    const { error } = await supabase.from('obiettivo_test').insert(payload)
    setBusy(false)
    if (error) alert(t('erroreAlert') + error.message); else onDone()
  }

  return (
    <div style={{ ...S.box, borderLeft: '3px solid var(--azzurro)' }}>
      <label style={{ ...S.field, marginBottom: 8 }}>
        {t('nomeTest')}
        <input style={S.ctrl} placeholder={t('phNomeTest')} value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <label style={{ ...S.field, marginBottom: 8 }}>
        {t('tipoMisura')}
        <select style={S.ctrl} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPI.map((tipo) => <option key={tipo.v} value={tipo.v}>{t(tipo.key)}</option>)}
        </select>
      </label>
      <div style={S.rowWrap}>
        {tipo !== 'su_totale' && (
          <label style={S.field}>{t('unita')}<input style={S.ctrl} placeholder={t('phUnita')} value={unita} onChange={(e) => setUnita(e.target.value)} /></label>
        )}
        <label style={S.field}>{t('migliore')}
          <select style={S.ctrl} value={direzione} onChange={(e) => setDirezione(e.target.value)}>
            {DIREZIONI.map((d) => <option key={d.v} value={d.v}>{t(d.key)}</option>)}
          </select>
        </label>
        <label style={S.field}>{t('ogniGiorni')}<input style={S.ctrl} type="number" placeholder="14" value={cadenza} onChange={(e) => setCadenza(e.target.value)} /></label>
        <label style={S.field}>{t('inizioDal')}<input style={S.ctrl} type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} /></label>
        <label style={S.field}>{t('target')}<input style={S.ctrl} type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      </div>
      {eserciziTutti.length > 0 && (
        <label style={{ ...S.field, marginTop: 8 }}>
          {t('esercizioCollegato')}
          <select style={S.ctrl} value={esercizioId} onChange={(e) => setEsercizioId(e.target.value)}>
            <option value="">{t('nessunoEs')}</option>
            {eserciziTutti.map((es) => <option key={es.id} value={es.id}>{es.nome ?? es.titolo ?? es.id}</option>)}
          </select>
        </label>
      )}
      <div style={S.btnRow}>
        <button className="btn-mini" type="button" onClick={salva} disabled={busy}>{t('creaTest')}</button>
        <button className="btn-mini btn-del" type="button" onClick={onCancel}>{c('annulla')}</button>
      </div>
    </div>
  )
}
