const TIPO_INFO = {
  obiettivo_creato:    { emoji: '🎯', colore: '#0a7ec2', label: 'Nuovo obiettivo' },
  obiettivo_raggiunto: { emoji: '🏆', colore: '#1f8a4c', label: 'Obiettivo raggiunto' },
  voto_alto:           { emoji: '⭐', colore: '#1f8a4c', label: 'Allenamento' },
  voto_basso:          { emoji: '📉', colore: '#c0392b', label: 'Allenamento' },
  clean_sheet:         { emoji: '🧤', colore: '#7c3aed', label: 'Partita' },
  partita:             { emoji: '⚽', colore: '#4a5b68', label: 'Partita' },
}

function fmtData(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function raggruppaPerMese(eventi) {
  const gruppi = {}
  for (const e of eventi) {
    const mese = (e.data ?? '').slice(0, 7)
    ;(gruppi[mese] ??= []).push(e)
  }
  return gruppi
}

const MESI = { '01':'Gennaio','02':'Febbraio','03':'Marzo','04':'Aprile','05':'Maggio','06':'Giugno','07':'Luglio','08':'Agosto','09':'Settembre','10':'Ottobre','11':'Novembre','12':'Dicembre' }
function labelMese(m) {
  const [y, mm] = m.split('-')
  return `${MESI[mm] ?? mm} ${y}`
}

export default function PercorsoTimeline({ eventi }) {
  if (eventi.length === 0) {
    return (
      <div className="empty">
        Ancora nessun evento da mostrare. Il percorso si popola automaticamente con obiettivi, allenamenti e partite man mano che vengono registrati.
      </div>
    )
  }

  const gruppi = raggruppaPerMese(eventi)
  const mesiOrd = Object.keys(gruppi).sort().reverse()

  return (
    <div>
      <p className="sub-intro" style={{ marginBottom: 20 }}>
        Una vista cronologica dei momenti più significativi: obiettivi creati e raggiunti, allenamenti e partite degne di nota.
      </p>
      {mesiOrd.map((mese) => (
        <div key={mese} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {labelMese(mese)}
          </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--linea)' }} />
            {gruppi[mese].map((e, i) => {
              const info = TIPO_INFO[e.tipo] ?? { emoji: '•', colore: 'var(--ink-soft)', label: '' }
              return (
                <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{
                    position: 'absolute', left: -24, top: 2, width: 16, height: 16, borderRadius: '50%',
                    background: info.colore, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, border: '2px solid var(--bianco)', boxShadow: '0 0 0 1px ' + info.colore,
                  }} />
                  <div style={{ background: 'var(--bianco)', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: info.colore }}>{info.emoji} {info.label}</span>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{e.titolo}</div>
                        {e.dettaglio && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{e.dettaglio}</div>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{fmtData(e.data)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
