// ────────────────────────────────────────────────────────────────────────────
// GATING GKSeason — mappa gerarchica delle funzionalità + logica di sblocco
// ────────────────────────────────────────────────────────────────────────────
//
// COS'È CAMBIATO (settembre 2026)
// La vecchia lista piatta di 14 flag è stata sostituita da un ALBERO
// (sezione → funzionalità → sotto-funzionalità), così dal Supervisore puoi
// accendere/spegnere anche le sotto-voci una per una. L'editor legge questo
// albero: aggiungendo qui una voce, l'interruttore compare DA SOLO nel
// pannello Supervisore, senza altre modifiche.
//
// COMPATIBILITÀ: tutte le funzioni esportate prima (FUNZIONALITA,
// getGatingConfig, hasAbbonamento, isUnlocked) restano identiche nella firma.
// Le pagine che oggi fanno isUnlocked('valutazioni_allenamento', ...) non
// cambiano di una riga. Le chiavi delle 14 funzionalità storiche sono rimaste
// IDENTiche.
//
// COME AGGANCIARE UNA NUOVA VOCE (quello che farai tu, quando vuoi):
//   1. la chiave esiste già qui sotto (o la aggiungi);
//   2. nella pagina/porzione da proteggere:
//        const canX = isUnlocked('chiave', gatingCfg, abbAttivo)
//        ...
//        {canX ? <Contenuto/> : <PaywallBanner chiave="chiave" label="..." />}
//   Fatto: l'interruttore nel Supervisore la governa.
//
// REGOLA: ogni chiave è INDIPENDENTE. Se vuoi che una sotto-voce segua il
// padre, aggancia semplicemente la guardia alla chiave del padre. In alto,
// l'interruttore globale "TUTTO FREE" sblocca comunque tutto.
// ────────────────────────────────────────────────────────────────────────────

import { cache } from 'react'

/**
 * ALBERO delle funzionalità.
 * Nodo: { chiave, label, defaultFree, marketing?, figli?[] }
 *  - chiave       → nome del flag salvato in funzionalita_config
 *  - defaultFree  → valore se non hai mai toccato l'interruttore
 *  - marketing    → true = compare anche nell'elenco funzionalità del sito
 *                   pubblico (home). Le sole 14 storiche sono marketing:true,
 *                   così la home NON cambia rispetto a prima.
 *  - figli        → sotto-funzionalità (stessa forma). Ogni figlio è comunque
 *                   un flag indipendente.
 *
 * NB: i `defaultFree` delle voci NUOVE riflettono il comportamento REALE di
 * oggi (quasi tutte free / incluse), così finché non agganci la guardia nella
 * pagina non cambia nulla per gli utenti.
 */
export const ALBERO_FUNZIONALITA = [
  {
    sezione: 'Valutazioni',
    funzionalita: [
      { chiave: 'valutazioni_allenamento', label: 'Valutazioni allenamento (inserimento/modifica)', defaultFree: true, marketing: true },
      {
        chiave: 'valutazioni_partita', label: 'Valutazioni partita (inserimento/modifica)', defaultFree: true, marketing: true,
        figli: [
          { chiave: 'valutazione_fuori_categoria', label: 'Valutazione portiere fuori categoria', defaultFree: true },
        ],
      },
    ],
  },
  {
    sezione: 'Allenamenti & Esercizi',
    funzionalita: [
      { chiave: 'esercizi_allenamento', label: 'Esercizi negli allenamenti', defaultFree: true, marketing: true },
      {
        chiave: 'esercizi_libreria', label: 'Libreria esercizi personale', defaultFree: true, marketing: true,
        figli: [
          { chiave: 'lavagna_esercizio', label: 'Lavagna esercizio (editor schema)', defaultFree: true },
        ],
      },
      { chiave: 'template_allenamenti', label: 'Template allenamenti', defaultFree: true },
      { chiave: 'ricorrenze_genera', label: 'Generazione automatica ricorrenze', defaultFree: false, marketing: true },
      { chiave: 'report_pdf_seduta', label: 'Report PDF della seduta di allenamento', defaultFree: true },
      { chiave: 'feedback_allenatore', label: 'Tab feedback portieri (lato allenatore)', defaultFree: false, marketing: true },
    ],
  },
  {
    sezione: 'Portieri',
    funzionalita: [
      {
        chiave: 'portieri_sezione', label: 'Sezione Portieri (elenco + scheda)', defaultFree: true,
        figli: [
          { chiave: 'infortuni', label: 'Registro infortuni', defaultFree: true },
        ],
      },
      {
        chiave: 'obiettivi_portieri', label: 'Obiettivi portieri', defaultFree: false, marketing: true,
        figli: [
          { chiave: 'proposta_obiettivi', label: 'Proposta obiettivi personali (lato portiere)', defaultFree: false },
        ],
      },
      { chiave: 'statistiche_dettaglio', label: 'Statistiche dettaglio portiere (per-mese, per-caratteristica)', defaultFree: false, marketing: true },
      {
        chiave: 'percorso_crescita', label: 'Percorso di crescita', defaultFree: false,
        figli: [
          { chiave: 'report_pdf_stagione', label: 'Report PDF stagione', defaultFree: true, marketing: true },
        ],
      },
    ],
  },
  {
    sezione: 'Statistiche squadra',
    funzionalita: [
      { chiave: 'statistiche_squadra', label: 'Statistiche squadra (vista)', defaultFree: true },
      { chiave: 'report_pdf_statistiche', label: 'Report PDF statistiche squadra (per mese/categoria)', defaultFree: false, marketing: true },
    ],
  },
  {
    sezione: 'Ricerca pubblica & Contatti',
    funzionalita: [
      { chiave: 'profilo_ricerca', label: 'Profilo allenatore nella ricerca pubblica', defaultFree: false, marketing: true },
    ],
  },
  {
    sezione: 'Inviti',
    funzionalita: [
      { chiave: 'inviti_creazione', label: 'Creazione link di invito', defaultFree: true, marketing: true },
      { chiave: 'inviti_staff', label: 'Invito staff/preparatore (supervisione)', defaultFree: true, marketing: true },
    ],
  },
  {
    sezione: 'Dati & Personalizzazione',
    funzionalita: [
      { chiave: 'export_dati', label: 'Export dati (CSV portieri/valutazioni/partite)', defaultFree: true, marketing: true },
      { chiave: 'parametri_valutazione', label: 'Parametri di valutazione personalizzati', defaultFree: true },
    ],
  },
]

// ── Appiattimento dell'albero ───────────────────────────────────────────────
// Percorre l'albero e restituisce l'elenco piatto di TUTTI i nodi-flag,
// mantenendo padre/livello per l'editor.
export function flattenAlbero(albero = ALBERO_FUNZIONALITA) {
  const out = []
  const visita = (nodo, livello, sezione, padre) => {
    out.push({ chiave: nodo.chiave, label: nodo.label, defaultFree: nodo.defaultFree, marketing: !!nodo.marketing, livello, sezione, padre })
    for (const f of nodo.figli ?? []) visita(f, livello + 1, sezione, nodo.chiave)
  }
  for (const s of albero) for (const f of s.funzionalita) visita(f, 0, s.sezione, null)
  return out
}

// Elenco piatto di TUTTE le funzionalità (14 storiche + nuove sotto-voci).
// Usato da getGatingConfig e dall'editor.
export const TUTTE_FUNZIONALITA = Object.fromEntries(
  flattenAlbero().map((f) => [f.chiave, { label: f.label, defaultFree: f.defaultFree }])
)

// FUNZIONALITA (retro-compatibile): SOLO le voci "marketing", cioè le 14
// storiche mostrate nella home pubblica (app/page.js) — così il sito pubblico
// NON cambia. Stessa forma di prima: { chiave: { label, defaultFree } }.
export const FUNZIONALITA = Object.fromEntries(
  flattenAlbero().filter((f) => f.marketing).map((f) => [f.chiave, { label: f.label, defaultFree: f.defaultFree }])
)

/**
 * Lato server: restituisce { tuttoFree, config }
 * config = { chiave: boolean (true = free/sbloccato) } per OGNI funzionalità.
 */
export const getGatingConfig = cache(async function getGatingConfig(supabase) {
  const { data } = await supabase.from('funzionalita_config').select('chiave, free')
  const rows = data ?? []
  const tuttoFreeRow = rows.find((r) => r.chiave === '__tutto_free')
  const tuttoFree = tuttoFreeRow?.free ?? false

  const config = {}
  for (const [k, def] of Object.entries(TUTTE_FUNZIONALITA)) {
    const row = rows.find((r) => r.chiave === k)
    config[k] = row ? row.free : def.defaultFree
  }
  return { tuttoFree, config }
})

/**
 * Numero di giorni di prova gratuita configurato dal Supervisore, per ruolo.
 * Salvato in funzionalita_config come chiave 'giorni_prova_{ruolo}' con il
 * valore nella colonna `label` (come si fa già per i prezzi).
 * Ritorna un intero ≥ 0 (default 30).
 */
export const getGiorniProva = cache(async function getGiorniProva(supabase, ruolo = 'allenatore') {
  const chiave = ruolo === 'portiere' ? 'giorni_prova_portiere' : 'giorni_prova_allenatore'
  const { data } = await supabase.from('funzionalita_config').select('label').eq('chiave', chiave).maybeSingle()
  const n = parseInt(String(data?.label ?? '30'), 10)
  return Number.isFinite(n) && n >= 0 ? n : 30
})

/**
 * Lato server: controlla se un utente ha un abbonamento attivo (incluso il
 * periodo di prova, che è una riga abbonamenti con stato 'prova' e scadenza
 * futura).
 *
 * REGOLA RUOLI (dal set. 2026):
 *  - allenatore → guarda la PROPRIA riga
 *  - portiere   → guarda la PROPRIA riga (autonomo, NON eredita più il coach:
 *                 ha prezzi e prova propri, valore "Portiere")
 *  - staff/collaboratore → eredita l'allenatore titolare (getOwnerId)
 */
export const hasAbbonamento = cache(async function hasAbbonamento(supabase, userId) {
  if (!userId) return false

  // Chi controllare: il portiere e l'allenatore usano sé stessi; solo lo staff
  // eredita l'owner. Leggo il ruolo direttamente (getOwnerId per il portiere
  // restituirebbe il coach, che qui NON vogliamo più).
  const { data: prof } = await supabase
    .from('profili').select('ruolo, allenatore_id').eq('id', userId).maybeSingle()
  const ruolo = prof?.ruolo ?? 'allenatore'
  const targetId = ruolo === 'staff' ? (prof?.allenatore_id ?? userId) : userId

  const { data } = await supabase
    .from('abbonamenti')
    .select('piano, stato, scadenza')
    .eq('allenatore_id', targetId)
    .in('stato', ['attivo', 'disdetto', 'prova'])  // disdetto = attivo fino a scadenza; prova = periodo gratuito
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  if (data) {
    if (data.piano === 'lifetime' && data.stato === 'attivo') return true
    if (data.scadenza && new Date(data.scadenza) > new Date()) return true
  }

  const { data: coupon } = await supabase
    .from('coupon_utilizzi')
    .select('scade_il')
    .eq('utente_id', userId)
    .gt('scade_il', new Date().toISOString())
    .limit(1).maybeSingle()
  if (coupon) return true

  return false
})

/**
 * Determina se una funzionalità è accessibile. Ritorna true se sbloccata.
 * Firma invariata.
 */
export function isUnlocked(chiave, { tuttoFree, config }, abbonamentoAttivo) {
  if (tuttoFree) return true
  if (config[chiave]) return true // impostata come free
  return abbonamentoAttivo
}
