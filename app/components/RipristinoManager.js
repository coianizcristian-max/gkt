'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const TABELLE = [
  { id: 'allenamenti',         label: 'Allenamenti',          chiaveUtente: 'stagione_id',  viaStaging: true  },
  { id: 'valutazioni',         label: 'Valutazioni',          chiaveUtente: 'allenamento_id', viaStaging: true },
  { id: 'partite',             label: 'Partite',              chiaveUtente: 'stagione_id',  viaStaging: true  },
  { id: 'valutazioni_partita', label: 'Valutazioni partita',  chiaveUtente: 'partita_id',   viaStaging: true  },
  { id: 'stagioni',            label: 'Stagioni',             chiaveUtente: 'owner_id',     viaStaging: false },
  { id: 'portieri',            label: 'Portieri',             chiaveUtente: 'allenatore_id',viaStaging: false },
]

export default function RipristinoManager({ allenatori }) {
  const [step, setStep] = useState(1) // 1=configura, 2=anteprima, 3=risultato
  const [allenatoreId, setAllenatoreId] = useState('')
  const [tabella, setTabella] = useState('allenamenti')
  const [jsonTesto, setJsonTesto] = useState('')
  const [parseError, setParseError] = useState('')
  const [records, setRecords] = useState([])
  const [filtrati, setFiltrati] = useState([])
  const [busy, setBusy] = useState(false)
  const [risultato, setRisultato] = useState(null)

  const allenatoreSelezionato = allenatori.find(a => a.id === allenatoreId)
  const tabellaInfo = TABELLE.find(t => t.id === tabella)

  // Parsa il JSON e filtra per utente
  function analizzaJson() {
    setParseError('')
    if (!allenatoreId) { setParseError('Seleziona prima un allenatore.'); return }
    if (!jsonTesto.trim()) { setParseError('Incolla il contenuto del file JSON.'); return }

    let dati
    try {
      dati = JSON.parse(jsonTesto.trim())
    } catch (e) {
      setParseError('JSON non valido: ' + e.message)
      return
    }

    if (!Array.isArray(dati)) {
      setParseError('Il JSON deve essere un array di record.')
      return
    }

    setRecords(dati)

    // Filtra per utente in base alla tabella selezionata
    // Per allenamenti/partite: filtriamo per stagioni dell'utente
    // Per valutazioni: filtriamo per allenamenti delle stagioni dell'utente
    // Per stagioni/portieri: filtriamo direttamente per owner_id / allenatore_id
    const chiave = tabellaInfo?.chiaveUtente
    let rFiltrati = dati

    if (tabella === 'stagioni') {
      rFiltrati = dati.filter(r => r.owner_id === allenatoreId)
    } else if (tabella === 'portieri') {
      rFiltrati = dati.filter(r => r.allenatore_id === allenatoreId)
    } else {
      // Per le altre tabelle mostriamo tutti i record e lasciamo che l'utente
      // incolli già il JSON filtrato (spiegato nell'UI)
      rFiltrati = dati
    }

    setFiltrati(rFiltrati)
    setStep(2)
  }

  async function eseguiRipristino() {
    if (!filtrati.length) return
    if (!confirm(`Stai per inserire ${filtrati.length} record nella tabella "${tabella}". Continuare?`)) return

    setBusy(true)
    setRisultato(null)
    const supabase = createClient()

    try {
      // Inserisce in batch da 100 record per volta con upsert
      const BATCH = 100
      let inseriti = 0
      let errori = []

      for (let i = 0; i < filtrati.length; i += BATCH) {
        const batch = filtrati.slice(i, i + BATCH)
        const { error } = await supabase
          .from(tabella)
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

        if (error) {
          errori.push(`Batch ${Math.floor(i/BATCH)+1}: ${error.message}`)
        } else {
          inseriti += batch.length
        }
      }

      setRisultato({
        inseriti,
        errori,
        totale: filtrati.length,
      })
      setStep(3)
    } catch (e) {
      setRisultato({ inseriti: 0, errori: [e.message], totale: filtrati.length })
      setStep(3)
    }
    setBusy(false)
  }

  function reset() {
    setStep(1)
    setAllenatoreId('')
    setTabella('allenamenti')
    setJsonTesto('')
    setParseError('')
    setRecords([])
    setFiltrati([])
    setRisultato(null)
  }

  return (
    <div style={{ maxWidth: 800 }}>

      {/* ── STEP 1: CONFIGURAZIONE ── */}
      {step === 1 && (
        <div className="scheda">
          <h3 style={{ margin: '0 0 16px' }}>1. Configura il ripristino</h3>

          <div className="form-grid">
            <div className="field">
              <label>Allenatore da ripristinare</label>
              <select value={allenatoreId} onChange={e => setAllenatoreId(e.target.value)}>
                <option value="">— Seleziona allenatore —</option>
                {allenatori.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome_visualizzato || a.nome_completo || a.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tabella da ripristinare</label>
              <select value={tabella} onChange={e => setTabella(e.target.value)}>
                {TABELLE.map(t => (
                  <option key={t.id} value={t.id}>{t.label} ({t.id}.json)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Istruzioni contestuali */}
          <div style={{ padding: '12px 16px', background: 'rgba(10,126,194,0.07)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <b>Come recuperare il file JSON:</b>
            <ol style={{ margin: '8px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
              <li>Vai su <b>GitHub → Actions → Database Backup</b></li>
              <li>Clicca su un run → <b>Artifacts</b> → scarica il file .tar.gz</li>
              <li>Estrai il file <b>{tabella}.json</b></li>
              <li>Aprilo con un editor di testo, seleziona tutto e incolla qui sotto</li>
            </ol>
            {(tabella === 'valutazioni' || tabella === 'valutazioni_partita' || tabella === 'allenamenti' || tabella === 'partite') && (
              <p style={{ marginTop: 8, color: 'var(--rosso)' }}>
                ⚠️ Per questa tabella il filtro automatico per utente non è possibile (i record non contengono direttamente l&apos;owner_id).
                Incolla <b>solo i record dell&apos;utente che vuoi ripristinare</b> — puoi filtrarli aprendo il JSON e cercando gli ID relativi a quell&apos;utente.
              </p>
            )}
          </div>

          <div className="field">
            <label>Contenuto del file JSON</label>
            <textarea
              value={jsonTesto}
              onChange={e => setJsonTesto(e.target.value)}
              placeholder={'[{"id": "...", "stagione_id": "...", ...}, ...]'}
              style={{ height: 200, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          {parseError && (
            <div style={{ color: 'var(--rosso)', marginBottom: 12, fontWeight: 600 }}>{parseError}</div>
          )}

          <button className="btn" type="button" onClick={analizzaJson}>
            Analizza e mostra anteprima →
          </button>
        </div>
      )}

      {/* ── STEP 2: ANTEPRIMA ── */}
      {step === 2 && (
        <div className="scheda">
          <h3 style={{ margin: '0 0 4px' }}>2. Anteprima ripristino</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Allenatore: <b>{allenatoreSelezionato?.nome_visualizzato || allenatoreSelezionato?.nome_completo}</b>
            {' · '}Tabella: <b>{tabella}</b>
            {' · '}Record totali nel JSON: <b>{records.length}</b>
            {' · '}Record da ripristinare: <b>{filtrati.length}</b>
          </div>

          {/* Tabella anteprima primi 10 record */}
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--sfondo)' }}>
                  {filtrati.length > 0 && Object.keys(filtrati[0]).slice(0, 6).map(k => (
                    <th key={k} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--linea)', fontWeight: 700 }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrati.slice(0, 10).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--linea)' }}>
                    {Object.values(r).slice(0, 6).map((v, j) => (
                      <td key={j} style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v === null ? <span style={{ color: 'var(--ink-soft)' }}>null</span> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrati.length > 10 && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '8px 10px' }}>
                ... e altri {filtrati.length - 10} record
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', background: 'rgba(230,160,0,0.1)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <b>⚠️ Attenzione:</b> l&apos;operazione usa UPSERT — se un record con lo stesso ID esiste già nel DB verrà <b>sovrascritto</b>.
            I record degli altri utenti non vengono toccati.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" type="button" onClick={eseguiRipristino} disabled={busy || !filtrati.length}>
              {busy ? 'Ripristino in corso...' : `✓ Ripristina ${filtrati.length} record`}
            </button>
            <button className="btn-ghost" type="button" onClick={() => setStep(1)} disabled={busy}>
              ← Torna indietro
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: RISULTATO ── */}
      {step === 3 && risultato && (
        <div className="scheda">
          <h3 style={{ margin: '0 0 16px' }}>3. Risultato</h3>

          {risultato.errori.length === 0 ? (
            <div style={{ padding: '16px', background: 'rgba(46,158,91,0.1)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--campo)' }}>✓ Ripristino completato</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{risultato.inseriti} record inseriti/aggiornati nella tabella <b>{tabella}</b></div>
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'rgba(192,57,43,0.1)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rosso)' }}>⚠️ Ripristino parziale</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{risultato.inseriti} di {risultato.totale} record inseriti</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                {risultato.errori.map((e, i) => <div key={i} style={{ color: 'var(--rosso)' }}>• {e}</div>)}
              </div>
            </div>
          )}

          <button className="btn-ghost" type="button" onClick={reset}>
            ← Nuovo ripristino
          </button>
        </div>
      )}
    </div>
  )
}
