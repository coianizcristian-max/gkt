import { createElement, Fragment } from 'react'

// Converte testo con **grassetto** e a capo reali in elementi React.
// Usabile da Server Component e Client Component (nessun 'use client').
export function renderTesto(testo) {
  if (!testo) return null
  const righe = testo.split('\n')
  return createElement(Fragment, null,
    ...righe.map((riga, ri) => {
      // Splitta la riga sulle occorrenze **...**
      const segmenti = riga.split(/\*\*(.+?)\*\*/g)
      // split con gruppo catturante → [testo, match, testo, match, ...]
      const nodi = segmenti.map((seg, si) =>
        si % 2 === 1
          ? createElement('strong', { key: si }, seg)   // posizioni dispari = dentro **
          : seg                                           // posizioni pari   = testo normale
      )
      return createElement(Fragment, { key: ri },
        ...nodi,
        ri < righe.length - 1 ? createElement('br', null) : null
      )
    })
  )
}
