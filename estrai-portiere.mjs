// ============================================================================
// GKSeason — Estrazione completa dati di un portiere in un file Excel (v2)
// Un foglio per tabella. Da lanciare in locale da D:\SITO\GKT.
//
//     node estrai-portiere.mjs
//     node estrai-portiere.mjs <altro-id-portiere>
//
// Richiede (già nel progetto): @supabase/supabase-js, xlsx
// Legge da .env.local / .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Se la SERVICE_ROLE non è nei file, la chiede a runtime (incolli e invio).
// La chiave la trovi su: Supabase -> Project Settings -> API -> "service_role"
// (oppure su Vercel -> Settings -> Environment Variables). NON committare.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const PID = process.argv[2] || 'd512d981-2cf4-4560-a4da-7c68fc41a42f'

// URL del progetto (fallback se non e' nei file .env)
const URL_DEFAULT = 'https://kaqgpdbojawjbssqrtoh.supabase.co'

// --- Caricamento file .env (tollerante a BOM e CRLF di Windows) -------------
function loadEnv(file) {
  if (!existsSync(file)) return false
  let txt = readFileSync(file, 'utf8')
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1) // togli BOM
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const noExport = line.startsWith('export ') ? line.slice(7) : line
    const eq = noExport.indexOf('=')
    if (eq === -1) continue
    const key = noExport.slice(0, eq).trim()
    let val = noExport.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
  return true
}
const filesFound = ['.env.local', '.env', '.env.development.local'].filter(loadEnv)
console.log('File .env letti:', filesFound.length ? filesFound.join(', ') : 'nessuno')

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()) }))
}
const mask = (s) => (s ? `${s.slice(0, 6)}...${s.slice(-4)} (len ${s.length})` : '-')

// --- Risoluzione credenziali -----------------------------------------------
let URL = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_DEFAULT
let KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SERVICE_ROLE_KEY ||
  ''

console.log('URL   :', URL)
console.log('KEY   :', KEY ? mask(KEY) : 'MANCANTE')

if (!KEY) {
  console.log('\nLa SERVICE_ROLE key non e\' nei file .env.')
  console.log('Prendila da Supabase -> Project Settings -> API -> "service_role" (secret).')
  KEY = await ask('Incolla qui la SERVICE_ROLE key e premi invio:\n> ')
  if (!KEY) { console.error('Nessuna chiave inserita. Esco.'); process.exit(1) }
}

const admin = createClient(URL, KEY, { auth: { persistSession: false } })

// --- Fetch paginato ---------------------------------------------------------
async function pageAll(makeQuery) {
  const size = 1000
  let from = 0
  const out = []
  for (;;) {
    const { data, error } = await makeQuery(from, from + size - 1)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < size) break
    from += size
  }
  return out
}
async function byIn(table, col, ids) {
  if (!ids.length) return []
  const out = []
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    out.push(...(await pageAll((a, b) => admin.from(table).select('*').in(col, chunk).range(a, b))))
  }
  return out
}
async function byPortiere(table) {
  return pageAll((a, b) => admin.from(table).select('*').eq('portiere_id', PID).range(a, b))
}

// --- Verifica accesso -------------------------------------------------------
{
  const { error } = await admin.from('portieri').select('id').eq('id', PID).limit(1)
  if (error) {
    console.error('\nErrore di accesso al DB:', error.message)
    console.error('Chiave errata o non service_role. Riprova con la chiave giusta.')
    process.exit(1)
  }
}

console.log('\nPortiere:', PID)

// --- Estrazione -------------------------------------------------------------
const iscrizioni = await byPortiere('iscrizioni')
const valutazioni = await byPortiere('valutazioni')
const obiettivi = await byPortiere('obiettivi')
const iscrIds = iscrizioni.map((r) => r.id)
const valuIds = valutazioni.map((r) => r.id)
const objIds = obiettivi.map((r) => r.id)
const obiettivoTest = await byIn('obiettivo_test', 'obiettivo_id', objIds)
const testIds = obiettivoTest.map((r) => r.id)

const sheets = [
  ['portieri',                 await pageAll((a, b) => admin.from('portieri').select('*').eq('id', PID).range(a, b))],
  ['profili_account',          await byPortiere('profili')],
  ['iscrizioni',               iscrizioni],
  ['valutazioni_allenamenti',  valutazioni],
  ['valutazioni_partita',      await byPortiere('valutazioni_partita')],
  ['obiettivi',                obiettivi],
  ['proposte_obiettivi',       await byPortiere('proposte_obiettivi')],
  ['report_commenti',          await byPortiere('report_commenti')],
  ['portiere_tag',             await byPortiere('portiere_tag')],
  ['portiere_attributi',       await byPortiere('portiere_attributi')],
  ['infortuni',                await byIn('infortuni', 'iscrizione_id', iscrIds)],
  ['assenze_previste',         await byIn('assenze_previste', 'iscrizione_id', iscrIds)],
  ['valutazione_punteggi',     await byIn('valutazione_punteggi', 'valutazione_id', valuIds)],
  ['sotto_obiettivi',          await byIn('sotto_obiettivi', 'obiettivo_id', objIds)],
  ['obiettivo_esercizi',       await byIn('obiettivo_esercizi', 'obiettivo_id', objIds)],
  ['obiettivo_parametri',      await byIn('obiettivo_parametri', 'obiettivo_id', objIds)],
  ['obiettivo_test',           obiettivoTest],
  ['obiettivo_rilevazioni',    await byIn('obiettivo_rilevazioni', 'test_id', testIds)],
]

// --- Excel ------------------------------------------------------------------
function flatten(rows) {
  return rows.map((r) => {
    const o = {}
    for (const k of Object.keys(r)) {
      const v = r[k]
      o[k] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v
    }
    return o
  })
}
const wb = XLSX.utils.book_new()
let totale = 0
for (const [nome, righe] of sheets) {
  const ws = righe.length ? XLSX.utils.json_to_sheet(flatten(righe)) : XLSX.utils.aoa_to_sheet([['(nessun record)']])
  XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  totale += righe.length
  console.log(String(righe.length).padStart(5), nome)
}
const outName = `portiere_${PID.slice(0, 8)}.xlsx`
XLSX.writeFile(wb, outName)
console.log(`\nTotale record: ${totale}`)
console.log(`File creato: ${outName}`)
