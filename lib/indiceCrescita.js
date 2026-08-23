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
  const NEUTRO = 50
  const val = {
    obiettivi: pctObiettiviCompletati,
    trendAllenamenti: normalizzaTrend(trendAllenamenti),
    trendPartite: normalizzaTrend(trendPartite),
    presenze: pctPresenze,
  }

  // Se non c'è NESSUN dato, nessun indice.
  if (!Object.values(val).some((v) => v != null)) return null

  // Le componenti mancanti contano come NEUTRE (50) e NON vengono ridistribuite:
  // così un singolo dato al 100% (es. solo presenze con un allenamento) non porta
  // l'indice a 100. I pesi restano fissi e sommano sempre a 1.
  let score = 0
  for (const k of Object.keys(PESI)) score += (val[k] ?? NEUTRO) * PESI[k]

  return Math.round(Math.max(0, Math.min(100, score)))
}

export function interpretaIndice(score, provvisorio = false) {
  if (score == null) return { label: 'Dati insufficienti', colore: '#4a5b68' }
  if (provvisorio) return { label: 'Provvisorio · dati ancora pochi', colore: '#4a5b68' }
  if (score >= 90) return { label: 'Crescita Eccellente', colore: '#1f8a4c' }
  if (score >= 80) return { label: 'Crescita Ottima', colore: '#1f8a4c' }
  if (score >= 70) return { label: 'Crescita Buona', colore: '#0a7ec2' }
  if (score >= 60) return { label: 'Crescita Sufficiente', colore: '#e8a72c' }
  return { label: 'Crescita Insufficiente', colore: '#c0392b' }
}
