// ---------------------------------------------------------------------------
// GKSeason — compressione delle immagini PRIMA del caricamento.
//
// Perche': le foto arrivano dal telefono a piena risoluzione (3-8 MB) e finiscono
// su Supabase Storage cosi' come sono. Poi vengono mostrate in miniature da
// 120-280 px, ma il browser scarica comunque l'originale intero, ogni volta.
// E' quello che ha portato il "cached egress" oltre la quota del piano free.
//
// Qui l'immagine viene ridimensionata e convertita in WebP nel browser, prima
// di partire. Una foto da 4 MB diventa tipicamente 100-200 KB, senza differenze
// visibili alle dimensioni in cui la mostriamo.
//
// Regola di sicurezza: se qualcosa non funziona (browser vecchio, file strano,
// canvas che fallisce) si carica l'originale. Un upload non deve MAI fallire per
// colpa della compressione.
// ---------------------------------------------------------------------------

// 30 giorni. Vale per la cache del browser e del CDN: meno richieste ripetute
// per lo stesso file, quindi meno banda consumata a parita' di visite.
export const CACHE_LUNGA = '2592000'

const TIPO_WEBP = 'image/webp'

function supportaWebp() {
  try {
    const c = document.createElement('canvas')
    return c.toDataURL(TIPO_WEBP).startsWith('data:image/webp')
  } catch {
    return false
  }
}

/**
 * Ridimensiona e ricomprime un'immagine.
 *
 * @param {File|Blob} file
 * @param {{ maxLato?: number, qualita?: number }} opzioni
 *        maxLato: lato massimo in px (il rapporto viene mantenuto)
 * @returns {Promise<{ blob: Blob|File, ext: string, contentType: string, originale: boolean }>}
 */
export async function comprimiImmagine(file, opzioni = {}) {
  const { maxLato = 1280, qualita = 0.82 } = opzioni
  const estOriginale = (file?.name?.split('.').pop() || 'jpg').toLowerCase()
  const fallback = {
    blob: file,
    ext: estOriginale,
    contentType: file?.type || 'application/octet-stream',
    originale: true,
  }

  try {
    if (!file || typeof document === 'undefined') return fallback
    // Le GIF possono essere animate: ricomprimerle le appiattirebbe.
    if (file.type === 'image/gif') return fallback
    if (typeof createImageBitmap !== 'function') return fallback

    // imageOrientation: rispetta l'EXIF, altrimenti le foto scattate in
    // verticale col telefono verrebbero ruotate.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = bitmap
    if (!width || !height) return fallback

    const scala = Math.min(1, maxLato / Math.max(width, height))
    const w = Math.round(width * scala)
    const h = Math.round(height * scala)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallback
    ctx.drawImage(bitmap, 0, 0, w, h)
    if (typeof bitmap.close === 'function') bitmap.close()

    const tipo = supportaWebp() ? TIPO_WEBP : 'image/jpeg'
    const blob = await new Promise((res) => canvas.toBlob(res, tipo, qualita))
    if (!blob) return fallback

    // Se per qualche motivo il risultato non e' piu' leggero, tieni l'originale.
    if (file.size && blob.size >= file.size) return fallback

    return {
      blob,
      ext: tipo === TIPO_WEBP ? 'webp' : 'jpg',
      contentType: tipo,
      originale: false,
    }
  } catch {
    return fallback
  }
}

/** Misure consigliate per tipo di immagine, per non sceglierle a caso ogni volta. */
export const MISURE = {
  esercizio: { maxLato: 1280, qualita: 0.82 },   // card e PDF: 1280 e' abbondante
  schema: { maxLato: 1600, qualita: 0.9 },       // disegni della lavagna: piu' nitidi
  profilo: { maxLato: 600, qualita: 0.85 },      // avatar piccoli
  sezioneSito: { maxLato: 1920, qualita: 0.82 }, // immagini della home, a tutta larghezza
  newsletter: { maxLato: 1200, qualita: 0.82 },
}
