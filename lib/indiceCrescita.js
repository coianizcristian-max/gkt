/**
 * Indice di Crescita GKT — KPI composito 0-100.
 * Formula: 40% obiettivi completati + 25% trend allenamenti + 20% trend partite + 15% presenze
 *
 * Ogni componente viene normalizzato a 0-100 prima di applicare il peso.
 */

const PESI = { obiettivi: 0.40, trendAllenamenti: 0.25, trendPartite: 0.20, presenze: 0.15 }

// Normalizza un trend (differenza di voto, tipicamente tra -4 e +4) in scala 0-100,
// centrato su 50 = nessuna variazione.
function normalizzaTrend(trend) {
  if (trend == null) return null
  const clamped = Math.max(-4, Math.min(4, trend))
  return 50 + (clamped / 4) * 50
}

export function calcolaIndiceCrescita({ pctObiettiviCompletati, trendAllenamenti, trendPartite, pctPresenze }) {
  const componenti = []

  if (pctObiettiviCompletati != null) {
    componenti.push({ peso: PESI.obiettivi, valore: pctObiettiviCompletati })
  }
  const trendAllNorm = normalizzaTrend(trendAllenamenti)
  if (trendAllNorm != null) {
    componenti.push({ peso: PESI.trendAllenamenti, valore: trendAllNorm })
  }
  const trendParNorm = normalizzaTrend(trendPartite)
  if (trendParNorm != null) {
    componenti.push({ peso: PESI.trendPartite, valore: trendParNorm })
  }
  if (pctPresenze != null) {
    componenti.push({ peso: PESI.presenze, valore: pctPresenze })
  }

  if (componenti.length === 0) return null

  // Se mancano componenti (es. nessun obiettivo creato), ridistribuiamo
  // proporzionalmente il peso tra quelle disponibili, così l'indice resta
  // calcolabile fin da subito senza dover aspettare che tutto sia popolato.
  const pesoTotale = componenti.reduce((s, c) => s + c.peso, 0)
  const score = componenti.reduce((s, c) => s + (c.valore * c.peso / pesoTotale), 0)

  return Math.round(Math.max(0, Math.min(100, score)))
}

export function interpretaIndice(score) {
  if (score == null) return { label: 'Dati insufficienti', colore: '#4a5b68' }
  if (score >= 90) return { label: 'Crescita Eccellente', colore: '#1f8a4c' }
  if (score >= 80) return { label: 'Crescita Ottima', colore: '#1f8a4c' }
  if (score >= 70) return { label: 'Crescita Buona', colore: '#0a7ec2' }
  if (score >= 60) return { label: 'Crescita Sufficiente', colore: '#e8a72c' }
  return { label: 'Crescita Insufficiente', colore: '#c0392b' }
}
