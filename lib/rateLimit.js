// Rate limiter "best effort" in memoria, per proteggere gli endpoint pubblici
// da abusi/spam senza bisogno di un servizio esterno (Redis/Vercel KV).
//
// LIMITE NOTO: la memoria di una funzione serverless non è condivisa tra
// istanze diverse e viene azzerata ai "cold start" — quindi non è un limite
// garantito al 100% sotto carico distribuito su tanti server. È comunque
// un buon primo livello di protezione contro chi manda tante richieste di
// fila dalla stessa istanza "calda", a costo zero e senza dipendenze.
// Se in futuro serve un limite realmente garantito (es. sotto attacco
// mirato), va sostituito con un servizio esterno come Upstash Redis o
// Vercel KV, che condividono lo stato tra tutte le istanze.

const hits = new Map() // chiave -> [timestamp, ...]

export function rateLimit(key, { max, windowMs }) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  hits.set(key, arr)

  // Pulizia occasionale per non far crescere la mappa all'infinito
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k)
    }
  }

  return arr.length <= max
}

export function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
