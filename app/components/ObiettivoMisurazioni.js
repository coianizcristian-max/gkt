'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Costanti ────────────────────────────────────────────────────────────────
const TIPI = [
  { v: 'valore',    label: 'Valore con unità (es. altezza cm, tempo sec)' },
  { v: 'conteggio', label: 'Conteggio (un numero, es. ripetizioni)' },
  { v: 'su_totale', label: 'Riusciti su tentativi (es. 7 su 10)' },
]
const DIREZIONI = [
  { v: 'alto',  label: 'più alto è meglio' },
  { v: 'basso', label: 'più basso è meglio' },
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
  const [tests, setTests] = useState([])
  const [rilByTest, setRilByTest] = useState({})
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)

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

  return (
    <div className="elenco-blocco">
      <h3>📏 Registro misurazioni</h3>
      {loading ? (
        <p className="sub-intro">Carico…</p>
      ) : (
        <>
          {tests.length === 0 && !creando && (
            <p className="sub-intro">Nessun test. Aggiungine uno per registrare misure oggettive nel tempo.</p>
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
            <button className="btn-ghost" type="button" onClick={() => setCreando(true)}>+ Aggiungi test</button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Blocco di un singolo test ───────────────────────────────────────────────
function TestBlocco({ test, ril, onChanged }) {
  const [aggiungo, setAggiungo] = useState(false)
  const tipoLabel = TIPI.find((t) => t.v === test.tipo_misura)?.label ?? test.tipo_misura
  const prossima = prossimaMisura(test, ril)
  const scaduta = prossima && prossima <= oggiRoma()

  async function eliminaTest() {
    if (!confirm(`Eliminare il test "${test.nome}" e tutte le sue misurazioni?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('obiettivo_test').delete().eq('id', test.id)
    if (error) alert('Errore: ' + error.message); else onChanged()
  }

  return (
    <div style={{ ...S.box, borderLeft: '3px solid var(--azzurro)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{test.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {tipoLabel}
            {test.cadenza_giorni ? ` · ogni ${test.cadenza_giorni} gg` : ''}
            {test.target != null ? ` · target ${test.target}${test.unita ? ' ' + test.unita : ''}` : ''}
          </div>
        </div>
        <button className="btn-mini btn-del" type="button" onClick={eliminaTest}>Elimina</button>
      </div>

      {prossima && (
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: scaduta ? 'var(--rosso)' : 'var(--ink-soft)' }}>
          {scaduta ? '⚠ Misurazione da fare' : '⏱ Prossima misurazione'}: {prossima}
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
        <button className="btn-mini" type="button" style={{ marginTop: 10 }} onClick={() => setAggiungo(true)}>+ Aggiungi rilevazione</button>
      )}
    </div>
  )
}

// ─── Riga di una rilevazione registrata ──────────────────────────────────────
function RilevazioneRiga({ test, r, onChanged }) {
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
      <button className="btn-mini btn-del" type="button" onClick={elimina}>Elimina</button>
    </div>
  )
}

// ─── Form: nuova rilevazione ─────────────────────────────────────────────────
function NuovaRilevazione({ test, onDone, onCancel }) {
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
    if (error) alert('Errore: ' + error.message); else onDone()
  }

  return (
    <div style={{ ...S.box, marginTop: 10, marginBottom: 0 }}>
      <div style={S.rowWrap}>
        <label style={S.field}>Data<input style={S.ctrl} type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
        {suTotale ? (
          <>
            <label style={S.field}>Riusciti<input style={S.ctrl} type="number" value={riusciti} onChange={(e) => setRiusciti(e.target.value)} /></label>
            <label style={S.field}>Tentativi<input style={S.ctrl} type="number" value={tentativi} onChange={(e) => setTentativi(e.target.value)} /></label>
          </>
        ) : (
          <label style={S.field}>Valore{test.unita ? ` (${test.unita})` : ''}<input style={S.ctrl} type="number" step="any" value={valore} onChange={(e) => setValore(e.target.value)} /></label>
        )}
      </div>
      <label style={{ ...S.field, marginTop: 8 }}>Note (facoltative)<input style={S.ctrl} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div style={S.btnRow}>
        <button className="btn-mini" type="button" onClick={salva} disabled={busy}>Salva rilevazione</button>
        <button className="btn-mini btn-del" type="button" onClick={onCancel}>Annulla</button>
      </div>
    </div>
  )
}

// ─── Form: nuovo test ────────────────────────────────────────────────────────
function NuovoTest({ obiettivoId, eserciziTutti = [], ordine, onDone, onCancel }) {
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
    if (!nome.trim()) { alert('Dai un nome al test.'); return }
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
    if (error) alert('Errore: ' + error.message); else onDone()
  }

  return (
    <div style={{ ...S.box, borderLeft: '3px solid var(--azzurro)' }}>
      <label style={{ ...S.field, marginBottom: 8 }}>
        Nome del test
        <input style={S.ctrl} placeholder="es. Salti ostacoli di fila" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <label style={{ ...S.field, marginBottom: 8 }}>
        Tipo di misura
        <select style={S.ctrl} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPI.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </label>
      <div style={S.rowWrap}>
        {tipo !== 'su_totale' && (
          <label style={S.field}>Unità<input style={S.ctrl} placeholder="cm, sec…" value={unita} onChange={(e) => setUnita(e.target.value)} /></label>
        )}
        <label style={S.field}>Migliore
          <select style={S.ctrl} value={direzione} onChange={(e) => setDirezione(e.target.value)}>
            {DIREZIONI.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </label>
        <label style={S.field}>Ogni (giorni)<input style={S.ctrl} type="number" placeholder="14" value={cadenza} onChange={(e) => setCadenza(e.target.value)} /></label>
        <label style={S.field}>Inizio dal<input style={S.ctrl} type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} /></label>
        <label style={S.field}>Target<input style={S.ctrl} type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      </div>
      {eserciziTutti.length > 0 && (
        <label style={{ ...S.field, marginTop: 8 }}>
          Esercizio collegato (facoltativo)
          <select style={S.ctrl} value={esercizioId} onChange={(e) => setEsercizioId(e.target.value)}>
            <option value="">— nessuno —</option>
            {eserciziTutti.map((es) => <option key={es.id} value={es.id}>{es.nome ?? es.titolo ?? es.id}</option>)}
          </select>
        </label>
      )}
      <div style={S.btnRow}>
        <button className="btn-mini" type="button" onClick={salva} disabled={busy}>Crea test</button>
        <button className="btn-mini btn-del" type="button" onClick={onCancel}>Annulla</button>
      </div>
    </div>
  )
}
