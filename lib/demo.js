import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cache } from 'react'

export const COOKIE_DEMO = 'gk_demo'
export const COOKIE_DEMO_AVVISO = 'gk_demo_avviso'

/** Client service_role: usato SOLO lato server, la chiave non arriva mai al browser. */
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
}

/**
 * Configurazione della demo, letta da demo_config (tabella senza policy:
 * la vede solo il service_role). Cache per richiesta.
 */
export const getDemoConfig = cache(async () => {
  const vuota = { attiva: false, ownerId: null, ownerEmail: null, dataTaglio: null, stagionePreferita: null, avvisiIngresso: 0 }
  try {
    const admin = adminClient()
    const { data, error } = await admin.from('demo_config').select('chiave, valore')
    if (error || !data) return vuota

    const c = Object.fromEntries(data.map((r) => [r.chiave, r.valore]))
    const email = c.owner_email || null
    if (!email) return vuota

    // id dell'utente demo risolto dall'email (una sola chiamata, in cache)
    const { data: elenco } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const ownerId = elenco?.users?.find((u) => u.email === email)?.id ?? null

    return {
      attiva: c.attiva === 'true',
      ownerId,
      ownerEmail: email,
      dataTaglio: c.data_taglio || null,
      stagionePreferita: c.stagione_id || null,
      avvisiIngresso: Number(c.avvisi_ingresso ?? 0) || 0,
    }
  } catch {
    return vuota
  }
})

/** True se la richiesta corrente sta navigando in modalita' demo. */
export const inDemo = cache(async () => {
  try {
    const store = await cookies()
    return store.get(COOKIE_DEMO)?.value === '1'
  } catch {
    return false
  }
})

/** True se il popup di benvenuto e' gia' stato chiuso in questo ingresso. */
export const avvisoDemoVisto = cache(async () => {
  try {
    const store = await cookies()
    return store.get(COOKIE_DEMO_AVVISO)?.value === '1'
  } catch {
    return false
  }
})

/**
 * La data che l'app deve considerare "oggi".
 * In demo e' la data di taglio configurata, altrimenti la data reale.
 */
export async function oggiApp() {
  if (await inDemo()) {
    const { dataTaglio } = await getDemoConfig()
    if (dataTaglio) return dataTaglio
  }
  return new Date().toISOString().slice(0, 10)
}

const SCRITTURE = ['insert', 'update', 'upsert', 'delete', 'rpc']

/**
 * Lettore demo: proxy attorno al client service_role che consente SOLO
 * la lettura. Qualunque tentativo di scrittura solleva un errore invece
 * di raggiungere il database.
 */
function soloLettura(nodo) {
  return new Proxy(nodo, {
    get(target, prop) {
      if (typeof prop === 'string' && SCRITTURE.includes(prop)) {
        throw new Error(`Modalita' demo: "${prop}" non consentito, la demo e' in sola lettura.`)
      }
      const v = Reflect.get(target, prop)
      if (typeof v !== 'function') return v
      // then/catch/finally vanno legati all'originale: i builder di Supabase
      // sono "thenable", e se li lasciassimo passare come oggetti normali
      // si perderebbe la protezione sui metodi concatenati dopo.
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return v.bind(target)
      return (...args) => {
        const out = v.apply(target, args)
        return out && typeof out === 'object' ? soloLettura(out) : out
      }
    },
  })
}

/**
 * Client da usare al posto di createClient() quando si e' in demo.
 * Espone from()/select() e blocca tutto il resto.
 */
export function lettoreDemo() {
  const admin = adminClient()
  return {
    from: (tabella) => soloLettura(admin.from(tabella)),
    // volutamente assenti: auth, storage, rpc, functions
  }
}

/**
 * Filtro temporale: una riga e' visibile in demo solo se la sua data
 * e' <= alla data di taglio. Le date nulle restano visibili.
 */
export function entroTaglio(data, taglio) {
  if (!taglio || !data) return true
  return String(data).slice(0, 10) <= taglio
}

/** Azzera i campi di una partita non ancora giocata rispetto al taglio. */
export function partitaDaGiocare(p, taglio) {
  if (entroTaglio(p?.data, taglio)) return p
  return { ...p, gol_fatti: null, gol_subiti: null, note: null }
}

/**
 * Contesto dati per una pagina dell'area riservata.
 *
 * Fuori dalla demo restituisce esattamente quello che le pagine usavano
 * prima: il client dell'utente e la sua stagione corrente.
 *
 * In demo sostituisce la sorgente — lettore in sola lettura sull'account
 * demo — e la data di riferimento, senza scrivere nulla da nessuna parte
 * (il puntatore stagione_corrente_id NON va toccato: non e' roba nostra).
 */
export async function contestoDati(supabase, userId) {
  const { getStagioneAttiva } = await import('@/lib/tenant')

  if (!(await inDemo())) {
    const { stagione, ownerId } = await getStagioneAttiva(supabase, userId)
    return {
      demo: false,
      db: supabase,
      stagione,
      ownerId,
      taglio: null,
      oggi: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }),
    }
  }

  const cfg = await getDemoConfig()
  const oggiVero = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
  const fuori = {
    demo: false, db: supabase, stagione: null, ownerId: null, taglio: null, oggi: oggiVero,
  }
  if (!cfg.attiva || !cfg.ownerId) return { ...fuori, ...(await getStagioneAttiva(supabase, userId)) }

  // Solo i preparatori vedono la demo: per chiunque altro il cookie non conta.
  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', userId).maybeSingle()
  if (profilo?.ruolo !== 'allenatore' || userId === cfg.ownerId) {
    const { stagione, ownerId } = await getStagioneAttiva(supabase, userId)
    return { ...fuori, stagione, ownerId }
  }

  const db = lettoreDemo()
  const taglio = cfg.dataTaglio

  // Stagione mostrata: quella che contiene la data di taglio; in mancanza,
  // la piu' recente fra le attive dell'account demo.
  const { data: stagioni } = await db.from('stagioni')
    .select('*').eq('owner_id', cfg.ownerId).eq('attiva', true)
    .order('created_at', { ascending: false })
  const elenco = stagioni ?? []
  // 1) stagione scelta dal supervisore nella tab Demo, se ancora valida
  const preferita = cfg.stagionePreferita
    ? elenco.find((s) => s.id === cfg.stagionePreferita)
    : null
  // 2) altrimenti quella che contiene la data di taglio
  const contiene = elenco.find((s) =>
    (!s.data_inizio || s.data_inizio <= taglio) && (!s.data_fine || s.data_fine >= taglio))

  return {
    demo: true,
    db,
    stagione: preferita ?? contiene ?? elenco[0] ?? null,
    ownerId: cfg.ownerId,
    taglio,
    oggi: taglio || oggiVero,
  }
}
