// Utility pura (no 'use client') — importabile sia da Server che Client Components.
// Converte **testo** in <strong> e mantiene a capo → <br>.

export function renderTesto(testo) {
  if (!testo) return null
  const righe = testo.split('\n')
  return righe.map((riga, ri) => {
    const parti = []
    const regex = /\*\*(.+?)\*\*/g
    let last = 0, m
    while ((m = regex.exec(riga)) !== null) {
      if (m.index > last) parti.push(riga.slice(last, m.index))
      parti.push(<strong key={m.index}>{m[1]}</strong>)
      last = m.index + m[0].length
    }
    if (last < riga.length) parti.push(riga.slice(last))
    return <span key={ri}>{parti}{ri < righe.length - 1 && <br />}</span>
  })
}
