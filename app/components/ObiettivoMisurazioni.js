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

const oggiRoma = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })

// Formatta il valore di una rilevazione in base al tipo di test
function fmtValore(test, r) {
  if (test.tipo_misura === 'su_totale') {
    const tot = r.tentativi ?? 0
    const ok = r.riusciti ?? r.valore ?? 0
    const pct = tot ? Math.round((ok / tot) * 100) : null
    return `${ok}/${tot}${pct != null ? ` · ${pct}%` : ''}`
  }
  return `${r.valore ?? '—'}${test.unita ? ' ' + test.unita : ''}`
}

// Data della prossima misurazione prevista (ultima + cadenza); null se non applicabile
function prossimaMisura(test, ril) {
  if (!test.cadenza_giorni || ril.length === 0) return null
  const d = new Date(ril[0].data + 'T12:00:00Z') // ril ordinate desc per data
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

// ─── Blocco di un singolo test (config + storico + aggiungi rilevazione) ──────
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
    <div className="obiettivo-card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{test.nome}</div>
          <div className="sub-intro" style={{ margin: 0 }}>
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
        <div style={{ marginTop: 8 }}>
          {ril.map((r) => (
            <RilevazioneRiga key={r.id} test={test} r={r} onChanged={onChanged} />
          ))}
        </div>
      )}

      {aggiungo ? (
        <NuovaRilevazione
          test={test}
          onDone={() => { setAggiungo(false); onChanged() }}
          onCancel={() => setAggiungo(false)}
        />
      ) : (
        <button className="btn-mini" type="button" style={{ marginTop: 8 }} onClick={() => setAggiungo(true)}>
          + Aggiungi rilevazione
        </button>
      )}
    </div>
  )
}

// ─── Riga di una rilevazione già registrata ──────────────────────────────────
function RilevazioneRiga({ test, r, onChanged }) {
  async function elimina() {
    const supabase = createClient()
    await supabase.from('obiettivo_rilevazioni').delete().eq('id', r.id)
    onChanged()
  }
  return (
    <div className="lista-riga" style={{ alignItems: 'center' }}>
      <span style={{ minWidth: 92, fontVariantNumeric: 'tabular-nums' }}>{r.data}</span>
      <span style={{ flex: 1, fontWeight: 600 }}>{fmtValore(test, r)}</span>
      {r.note && <span className="sub-intro" style={{ margin: 0, flex: 2 }}>{r.note}</span>}
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
    <div className="lista-riga" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      <label className="lista-ord">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
      {suTotale ? (
        <>
          <label className="lista-ord">Riusciti<input type="number" style={{ width: 70 }} value={riusciti} onChange={(e) => setRiusciti(e.target.value)} /></label>
          <label className="lista-ord">Tentativi<input type="number" style={{ width: 70 }} value={tentativi} onChange={(e) => setTentativi(e.target.value)} /></label>
        </>
      ) : (
        <label className="lista-ord">
          Valore{test.unita ? ` (${test.unita})` : ''}
          <input type="number" step="any" style={{ width: 90 }} value={valore} onChange={(e) => setValore(e.target.value)} />
        </label>
      )}
      <input className="lista-nome" style={{ flex: 1, minWidth: 120 }} placeholder="Note (facoltative)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn-mini" type="button" onClick={salva} disabled={busy}>Salva</button>
      <button className="btn-mini btn-del" type="button" onClick={onCancel}>Annulla</button>
    </div>
  )
}

// ─── Form: nuovo test ────────────────────────────────────────────────────────
function NuovoTest({ obiettivoId, eserciziTutti = [], ordine, onDone, onCancel }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('valore')
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
    <div className="obiettivo-card" style={{ marginTop: 8 }}>
      <div className="lista-riga" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input className="lista-nome" style={{ flex: 1, minWidth: 160 }} placeholder="Nome test (es. Salti ostacoli di fila)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPI.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </div>
      <div className="lista-riga" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {tipo !== 'su_totale' && (
          <label className="lista-ord">Unità<input style={{ width: 80 }} placeholder="cm, sec…" value={unita} onChange={(e) => setUnita(e.target.value)} /></label>
        )}
        <label className="lista-ord">Migliore
          <select value={direzione} onChange={(e) => setDirezione(e.target.value)}>
            {DIREZIONI.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </label>
        <label className="lista-ord">Ogni (giorni)<input type="number" style={{ width: 70 }} placeholder="14" value={cadenza} onChange={(e) => setCadenza(e.target.value)} /></label>
        <label className="lista-ord">Target<input type="number" step="any" style={{ width: 80 }} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      </div>
      {eserciziTutti.length > 0 && (
        <div className="lista-riga" style={{ marginTop: 6 }}>
          <label className="lista-ord" style={{ flex: 1 }}>Esercizio collegato (facoltativo)
            <select value={esercizioId} onChange={(e) => setEsercizioId(e.target.value)}>
              <option value="">— nessuno —</option>
              {eserciziTutti.map((es) => <option key={es.id} value={es.id}>{es.nome ?? es.titolo ?? es.id}</option>)}
            </select>
          </label>
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button className="btn-mini" type="button" onClick={salva} disabled={busy}>Crea test</button>
        <button className="btn-mini btn-del" type="button" onClick={onCancel}>Annulla</button>
      </div>
    </div>
  )
}
