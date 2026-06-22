import { createElement, Fragment } from 'react'

// Converte testo con **grassetto** e \n in elementi React.
// Strategia: prima trova i blocchi **...** sull'intero testo (flag s = dotAll),
// poi gestisce i \n all'interno di ogni segmento.
// Così funziona anche quando ** si aprono e chiudono su righe diverse.
export function renderTesto(testo) {
  if (!testo) return null

  // Splitta sull'intero testo rispettando i \n interni ai **
  const segmenti = testo.split(/\*\*(.+?)\*\*/gs)
  // Posizioni pari = testo normale, posizioni dispari = grassetto

  const nodi = []
  let keyIdx = 0

  segmenti.forEach((seg, si) => {
    const isGrassetto = si % 2 === 1
    // Dentro ogni segmento gestisco i \n come <br>
    const righe = seg.split('\n')
    righe.forEach((riga, ri) => {
      if (isGrassetto) {
        nodi.push(createElement('strong', { key: keyIdx++ }, riga))
      } else if (riga) {
        nodi.push(riga)
        keyIdx++
      }
      // Aggiungi <br> tra le righe (non dopo l'ultima)
      if (ri < righe.length - 1) {
        nodi.push(createElement('br', { key: keyIdx++ }))
      }
    })
  })

  return createElement(Fragment, null, ...nodi)
}
