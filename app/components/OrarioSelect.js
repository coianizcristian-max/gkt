'use client'

/**
 * Scelta dell'orario con un elenco invece della rotellina del telefono:
 * ore da 00 in su e minuti da 00 in su, a passi di 5 minuti. Se il valore
 * salvato non e' un multiplo di 5 (vecchi dati) viene aggiunto all'elenco,
 * cosi' non si perde mai niente.
 */
const PASSO = 5

function elencoOrari(valore) {
  const ore = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += PASSO) {
      ore.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  const v = (valore || '').slice(0, 5)
  if (v && !ore.includes(v)) {
    ore.push(v)
    ore.sort()
  }
  return ore
}

export default function OrarioSelect({ value, onChange, className = '', id, ...resto }) {
  const v = (value || '').slice(0, 5)
  return (
    <select
      className={`orario-select ${className}`.trim()}
      id={id}
      value={v}
      onChange={(e) => onChange({ target: { value: e.target.value } })}
      {...resto}
    >
      <option value="">—</option>
      {elencoOrari(v).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
