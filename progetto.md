# GKT — PROGETTO.md
**Gestionale allenamento portieri** · https://gkt2026.vercel.app · repo `coianizcristian-max/gkt`

> Questo file è il punto di ripartenza. Se apri una chat nuova, leggi questo e hai tutto il contesto per partire subito senza dover rispiegare lo stato del progetto.
> Ultimo aggiornamento: 20/06/2026.

---

## 1. Stack & accessi
- **Frontend:** Next.js 15.1 / React 19 (App Router, JavaScript).
- **Backend:** Supabase (PostgreSQL + RLS + Auth + Storage). Project ref: `kaqgpdbojawjbssqrtoh`.
- **Deploy:** Vercel (dominio `gkt2026.vercel.app`).
- **Pagamenti:** Stripe (modalità test — `sk_test_`). Prezzi dinamici letti dal DB (tabella `funzionalita_config`), non da Price ID fissi.
- **Workflow di lavoro:** Cristian applica le modifiche manualmente — Claude prepara zip di patch, Cristian copia i file nel progetto locale e fa `git add -A && git commit && git push`. Build verificato su Vercel dopo ogni deploy.
- **Identità prodotto:** SaaS multi-tenant. Il nome società NON è hardcoded — viene letto dalla `stagione attiva` di ogni cliente. Società pilota di test: Azzurra Sandrigo.
- Ruoli utente: `allenatore`/`staff` (gestione completa), `collaboratore` (permessi configurabili), `portiere` (accesso limitato ai propri dati), `supervisore` (flag separato, accesso totale).

---

## 2. Stato attuale — TUTTO QUESTO È GIÀ FATTO E FUNZIONANTE

Non ripartire da zero su nessuno di questi moduli. Sono in produzione:

**Core gestionale**
- Multi-stagione, multi-categoria/squadra per allenatore.
- Portieri: anagrafica completa (foto, dati, misure, piede, contatti), card riassuntiva con statistiche, tag colorati (Capitano, Talento, ecc.), attributi dinamici configurabili da Supervisore.
- Calendario allenamenti con colori (verde = valutato anche se "nessuno presente", rosso = passato non valutato), filtro per categoria, sezione "da valutare" sotto al calendario.
- Allenamento singolo a 3 tab: Info / Valutazioni / Esercizi (navigazione via URL `?tab=`).
- Sistema voti centralizzato gestito da Supervisore (scala condivisa in tutta l'app).
- Valutazioni con presente/assente/nessuno, parametri multipli (personalizzabili per allenatore), retry automatico su errore di rete.
- Ricorrenze: generazione automatica allenamenti su tutto il range data_inizio/data_fine stagione, deduplica automatica.
- Categorie: ordinamento drag-and-drop su desktop, frecce su mobile.

**Partite**
- 4 tipologie (campionato/coppa/amichevole/torneo) con tab dedicate.
- Casa/trasferta, punti portati (3/1/0/-1/-3), clean sheet automatico.
- Preview "prossimi 7/31 giorni" con bottoni colorati, partite nel calendario (viola pieno/chiaro/cornice rossa se da valutare).

**Esercizi**
- Libreria per allenatore, organizzata a tab per tipologia, tile con preview immagine+titolo, popup dettaglio.
- Link video (YouTube o altro) per ogni esercizio.
- Tipologie proposte dall'allenatore → approvazione Supervisore (pattern elenco_voci).
- Archiviazione (non cancellazione) per preservare collegamenti storici.

**Statistiche**
- Scheda portiere ricca: media voto, presenze %, clean sheet, streak, trend mensile, confronto con media categoria, prima/seconda metà stagione.
- 7 grafici SVG responsive (voti allenamenti 30gg e stagione, voti partite, gol subiti progressivi campionato/coppa, presenze mensili) — si comprimono per stare sempre nello schermo, con bottone "Espandi" per zoom.
- Indice di Crescita GKT: KPI composito 0-100 (40% obiettivi + 25% trend allenamenti + 20% trend partite + 15% presenze), gauge circolare con interpretazione a fasce.

**Obiettivi e crescita**
- Sistema obiettivi PNL-style (evidenza/contesto/risorse/ostacoli/motivazione) con categoria, priorità, percentuale avanzamento, livello (stagionale/mensile/micro).
- Collegamento a parametri di valutazione (trend automatico a grafico) ed esercizi della libreria.
- Pagina "Percorso di crescita": timeline cronologica di obiettivi creati/raggiunti, allenamenti notevoli, partite, clean sheet.
- Report PDF di fine stagione con statistiche, obiettivi raggiunti/non raggiunti, commenti allenatore/portiere.
- Archiviazione (non cancellazione) per preservare lo storico.

**Dashboard**
- Nuova destinazione post-login per staff: allenamenti/partite da valutare, prossimo allenamento, partite imminenti, portieri da attenzionare (assenze ripetute, calo rendimento, obiettivi in ritardo), banner coupon.

**Portale portiere**
- Accesso via link/token legato a stagione+portiere, profilo read-only, autovalutazione solo su allenamenti dove è presente.

**Collaboratori**
- Invito via link, permessi granulari per modulo (Portieri/Allenamenti/Partite/Statistiche × Nessuno/Visualizza/Modifica), applicati sia in sidebar che come guard lato server sulle pagine.

**Monetizzazione**
- Sistema paywall granulare per 9 funzionalità, configurabile da Supervisore (toggle free/a pagamento + interruttore "tutto free" globale).
- Ogni funzionalità bloccata ha un bottone "Vedi anteprima" con demo realistica dei dati prima del CTA abbonati.
- Piani mensile/annuale/lifetime con prezzi separati per ruolo allenatore/portiere, impostabili da Supervisore.
- Pagina contatto allenatore a pagamento (fee configurabile) nella ricerca pubblica.
- Sistema coupon: codice + durata configurabili da Supervisore, un utilizzo per utente, banner "periodo gratuito" in sidebar.

**Altro**
- Newsletter: editor con upload immagine reale (non URL), preview live, 2 template (solo testo / testo+foto), pagina pubblica con ultima + archivio.
- Suggerimenti: form pubblico (anche senza login) con categoria, workflow staff a 4 stadi (Nuovo → In valutazione → Accettato → Implementato).
- Export CSV (portieri/valutazioni/partite) dall'Archivio.
- Onboarding checklist per nuovi allenatori.
- Ricerca portieri per nome.
- SEO: metadata dinamici per pagina, Open Graph, robots.txt, sitemap.xml dinamica, JSON-LD sui profili allenatore pubblici.
- Mobile: hamburger menu, touch target ≥44px, niente zoom iOS sugli input, landing page responsive.

---

## 3. Pattern tecnici da ricordare (errori già fatti, non ripeterli)

- **FK ambigua `allenamenti`→`squadre`**: la tabella ha due FK verso squadre (`squadra_id` e `accorpata_con`). Ogni query con `squadre(nome)` va scritta esplicita: `squadra:squadre!allenamenti_squadra_id_fkey(nome)`, altrimenti Supabase ritorna errore silenzioso → dati vuoti senza crash visibile.
- **RLS è la causa #1 di "i dati ci sono ma non si vedono"**: quando qualcosa appare vuoto pur essendo presente nel DB, prima cosa da controllare è `pg_policies` sulla tabella coinvolta (incluse le tabelle joinate). Non fidarsi di `SET ROLE` nel SQL Editor per simulare `auth.uid()` — non funziona, dà sempre falsi negativi.
- **Scritture admin-only** (coupon, funzionalita_config, ecc.) vanno sempre via API route server-side con `SUPABASE_SERVICE_ROLE_KEY`, mai client-diretto, anche se sembra una semplice tabella di configurazione.
- **Stripe**: mai associare un Price dinamico a un `product` Stripe esistente — il nome mostrato sarà quello del prodotto, non quello del codice. Usare sempre `product_data` inline.
- **Validazione pre-deploy**: ogni file va validato con esbuild prima di consegnarlo, e va sempre fatto un secondo passaggio di `grep` per verificare che tutte le occorrenze di un pattern siano state sostituite (storico: destructuring `[al, cat]` non aggiornato a `[al, cat, par]` ha causato un crash in produzione).

---

## 4. BACKLOG — stato interventi

### ⚠️ REFACTORING MULTI-TENANT (20/06/2026) — leggere prima di tutto il resto
Il sito è passato da "single-tenant travestito da multi-tenant" a davvero multi-tenant,
in vista del lancio stagione 2026-27 con più allenatori indipendenti.

**Modello introdotto:**
- `stagioni` e `squadre` (categorie) hanno ora `owner_id` → l'allenatore principale proprietario.
- `profili.allenatore_id` collega ogni collaboratore/portiere al proprio allenatore principale.
- Tutto ciò che ha già `stagione_id` (allenamenti, partite, iscrizioni, inviti, ricorrenze, ecc.)
  eredita automaticamente l'isolamento passando dalla stagione.
- `elenco_voci`, `parametri_valutazione`, `attributi_definizioni`, `funzionalita_config`, `coupon`
  restano correttamente GLOBALI (configurazione gestita dal vero Supervisore per tutta la piattaforma).
- Nuovo helper centrale `lib/tenant.js`: `getOwnerId()` e `getStagioneAttiva()` — usare SEMPRE
  questi al posto di interrogare `stagioni` con `.eq('attiva', true).maybeSingle()` nudo,
  altrimenti si torna al bug del singleton globale.

**Migrazione dati 2025-26 (stagione di prova):** tutto il lavoro già fatto viene assegnato
automaticamente al primo utente con ruolo allenatore trovato nel DB. La migrazione SQL ha
un controllo preliminare da eseguire a mano per evitare errori se ci sono già più account
allenatore di test nel database — leggere il commento in testa al file SQL prima di eseguirlo.

**Pagine Supervisore riorganizzate:** Stagioni e Categorie sono ora per-allenatore (ogni
allenatore gestisce solo le proprie), non più funzioni del vero Supervisore — restano sotto
l'URL `/supervisore/...` per non rompere i link esistenti, ma il controllo accesso è
"sei staff" non "sei supervisore". La vecchia pagina `/supervisore/inviti` (duplicato
concettualmente sbagliato di `/inviti`) è stata rimossa.

### Audit di sicurezza completo (20/06/2026) — bug trovati e risolti
Audit sistematico di tutto il sito, sezione per sezione e ruolo per ruolo. Trovati e
corretti 5 problemi reali, alcuni critici:

1. **MEDIO** — `/calendario/nuovo`, `/partite/nuova`, `/portieri/nuovo` non controllavano
   il ruolo lato server (un portiere poteva raggiungere il form di creazione). Risolto.
2. **GRAVE** — `/partite/[id]` non distingueva affatto staff da portiere: un portiere
   vedeva il form di modifica completo e le valutazioni di TUTTI i compagni di squadra.
   Risolto con una vista portiere dedicata in sola lettura sui propri dati soltanto,
   stesso pattern già usato per `/calendario/[id]`.
3. **CRITICO** — 5 pagine Supervisore (`/supervisore`, `/supervisore/inviti`,
   `/supervisore/stagioni`, `/supervisore/elenchi`, `/supervisore/categorie`) controllavano
   solo "sei staff" invece del vero flag `supervisore`. Risolto (e ridisegnato il modello
   d'accesso per stagioni/categorie, vedi sopra).
4. **GRAVE** — `/portieri/[id]` e `/portieri/[id]/obiettivi` non verificavano che un
   portiere stesse guardando la PROPRIA scheda: poteva vedere/modificare dati di un
   compagno di squadra cambiando l'id nell'URL. Risolto (le pagine gemelle Statistiche
   e Percorso avevano già il controllo corretto, preso come riferimento).
5. **CRITICO** — `StagioniManager.js`, funzione `rendiAttiva()`: il reset
   `update({attiva:false}).neq('id', id)` non aveva NESSUN filtro per allenatore.
   Con un solo cliente non si è mai manifestato, ma con 2+ allenatori sulla piattaforma,
   uno che attiva una propria stagione avrebbe disattivato silenziosamente le stagioni
   attive di TUTTI gli altri clienti. Risolto contestualmente al refactoring multi-tenant.

Trovati anche, e corretti come parte dello stesso intervento: query `valutazioni`/
`valutazioni_partita` caricate senza alcun filtro in `/portieri` (lista) e `/dashboard`
(scaricavano dati di tutta la piattaforma invece che della propria stagione); libreria
esercizi (`allenatore_id`) scoped sul singolo utente invece che sull'allenatore owner,
per cui un collaboratore staff non vedeva mai la libreria condivisa del proprio team.

Rimossa anche una API route di debug residua (`/api/debug-cal`) non più necessaria e
priva di qualunque protezione di accesso.

### Punti noti, non ancora affrontati
- Permessi granulari collaboratori: il livello "Solo visualizza" nasconde/mostra intere
  sezioni ma non distingue ancora bottoni di modifica dentro alla pagina dettaglio stessa
  (es. `/calendario/[id]`, `/partite/[id]`). Affinamento futuro se serve la distinzione fine.
- Nessuna verifica diretta delle RLS Supabase per gli INSERT su `allenamenti`/`partite`/
  `portieri` — i controlli applicativi (server-side) sono ora corretti, ma andrebbe
  comunque verificato che anche le RLS lato database neghino esplicitamente l'INSERT
  a chi non è staff, come difesa in profondità.


### Livelli 1-4 (i 14 punti tecnici dal documento PDF) — TUTTI COMPLETATI
1. ✅ Fix upload immagine homepage Supervisore (RLS storage bucket `sito`)
2. ✅ Verifica upload foto portiere → comparsa in card riassuntiva
3. ✅ Drag-and-drop reale ordinamento categorie
4. ✅ Attributi dinamici portiere configurabili da Supervisore
5. ✅ Tag portiere (Capitano, Talento, Da osservare, ecc.)
6. ✅ Schema valutazione personalizzato per allenatore
7. ✅ Ricorrenze con range data inizio/fine stagione (era già completo)
8. ✅ Form Suggerimenti con workflow a 4 stadi (Nuovo → In valutazione → Accettato → Implementato)
9. ✅ Dashboard "cosa devo fare oggi" (`/dashboard`, nuova destinazione post-login)
10. ✅ Sistema obiettivi avanzato (categoria, priorità, percentuale, livelli stagionale/mensile/micro)
11. ✅ Collegamento Obiettivi ↔ Valutazioni ↔ Esercizi (trend automatico dai voti storici)
12. ✅ Indice di Crescita GKT (KPI composito 0-100, gauge visivo)
13. ✅ Pagina "Percorso di crescita" (timeline cronologica)
14. ✅ Report PDF di fine stagione (`@react-pdf/renderer`, richiede `npm install`)

### Prossimi interventi — prerequisiti per andare live (non ancora affrontati)
- ⬜ **SMTP custom domain** — email di conferma registrazione finiscono spesso in spam con SMTP default Supabase. Rischio concreto per il flusso invito portiere.
- ⬜ **Stripe modalità live** — passaggio da `sk_test_` a chiavi live + nuovo webhook endpoint configurato per la modalità live.
- ⬜ **Termini & Condizioni / Privacy Policy** — pagine mancanti, requisito esplicito del documento originale prima di accettare pagamenti reali.
- ⬜ **Test di stress flusso invito→registrazione portiere** con email confirmation attiva — rischio race condition sul consumo del token invito già annotato, da verificare concretamente.
- ⬜ **Audit RLS completo** — le policy sono state sistemate via via che emergevano problemi specifici; manca un controllo sistematico di tutte le tabelle, in particolare verificare che `allenamenti`/`partite`/`portieri` rifiutino INSERT da utenti non staff (oggi protetti solo lato applicazione, non verificato a livello RLS).

### Punti emersi dalla rilettura mirata "Visione del prodotto" (Allegato G, da pag. 3)
- ✅ Widget "Portieri da attenzionare" in dashboard (assenze ripetute, calo rendimento, obiettivi in ritardo)
- ✅ Permessi granulari collaboratori per modulo (Portieri/Allenamenti/Partite/Statistiche × Nessuno/Visualizza/Modifica) — vedi `lib/permessi.js`. Nota: il livello "Solo visualizza" oggi nasconde/mostra l'intera sezione ma non distingue ancora bottoni di modifica dentro alla pagina stessa.
- ✅ Campi Esperienze/Certificazioni nel profilo allenatore — verificato già completo (form + profilo pubblico)
- ✅ **Audit "mai cancellare dati storici, solo archiviare"** — Esercizi e Obiettivi erano cancellabili senza controllo nonostante avessero valore storico e collegamenti CASCADE; ora hanno flag `archiviato` e bottone "Archivia" al posto di "Elimina". Categorie/squadre erano già protette da un blocco preventivo su cancellazione con dati collegati — corretto così.

### Audit di sicurezza completo + refactoring multi-tenant (in vista del lancio stagione 2026-27)

**Contesto**: la stagione 2025-26 attuale è solo dati di prova. Dalla stagione 2026-27 GKT sarà un vero SaaS multi-cliente: molti allenatori indipendenti, ciascuno con le proprie squadre/categorie/portieri/staff. Questo ha reso necessario un audit di sicurezza completo PRIMA del lancio, che ha rivelato un problema architetturale di fondo oltre a singoli bug.

**Modello multi-tenant introdotto**: `stagioni` e `squadre` (categorie) ora hanno `owner_id` (l'allenatore titolare). Tutto il resto (allenamenti, partite, iscrizioni, inviti, ricorrenze, ecc.) eredita l'isolamento a cascata tramite `stagione_id`. `profili.allenatore_id` collega ogni collaboratore E ogni portiere al proprio allenatore principale, permettendo loro di ereditare scoping e abbonamento senza vedere dati di altri clienti. `elenco_voci`, `parametri_valutazione`, `attributi_definizioni`, `funzionalita_config`, `coupon` restano correttamente GLOBALI (gestiti dal vero Supervisore, standard di piattaforma condiviso). Helper centrale: `lib/tenant.js` (`getOwnerId`, `getStagioneAttiva`) sostituisce ovunque il vecchio pattern singleton `eq('attiva', true).maybeSingle()`.

**Migrazione**: lo script SQL assegna automaticamente tutti i dati esistenti (stagione 2025-26 di prova) al primo utente con ruolo allenatore trovato nel DB — con un controllo esplicito da fare PRIMA di eseguire la migrazione se nel frattempo sono stati creati altri account allenatore di test.

**Riorganizzazione sezione Supervisore**: `/supervisore/stagioni` e `/supervisore/categorie` sono concettualmente diventate funzioni per-allenatore (ogni allenatore gestisce le proprie), non più funzioni del vero Supervisore globale — il controllo di accesso resta "è staff" ma le query sono ora scoped per owner. `/supervisore/inviti` è stata rimossa (duplicato concettualmente rotto di `/inviti`, che è la sede corretta).

**5 bug di sicurezza trovati e corretti**:
1. **MEDIO/ALTO** — `/calendario/nuovo`, `/partite/nuova`, `/portieri/nuovo` non controllavano il ruolo lato server: un portiere autenticato poteva raggiungere i form di creazione.
2. **GRAVE** — `/partite/[id]` non distingueva affatto i ruoli: un portiere vedeva il form di modifica completo e le valutazioni di TUTTI i compagni di squadra. Risolto con una vista portiere dedicata (sola lettura, solo i propri dati), sul modello già usato in `/calendario/[id]`.
3. **CRITICO** — 5 pagine Supervisore (`/supervisore`, `/supervisore/inviti` [ora rimossa], `/supervisore/stagioni`, `/supervisore/elenchi`, `/supervisore/categorie`) controllavano solo "è staff" invece del vero flag `supervisore`: qualsiasi allenatore cliente poteva modificare la home page pubblica, creare/alterare stagioni di altri, toccare elenchi globali. Risolto correggendo i controlli e aggiungendo lo scoping owner dove la funzione è realmente per-allenatore.
4. **GRAVE** — `/portieri/[id]` e `/portieri/[id]/obiettivi` non verificavano che l'id nell'URL corrispondesse al proprio `portiere_id`: un portiere poteva vedere/modificare la scheda e gli obiettivi personali di un compagno di squadra cambiando l'URL. Le pagine gemelle Statistiche/Percorso avevano già il controllo corretto, usato come modello per il fix.
5. **CRITICO** (trovato durante il refactoring) — `StagioniManager.rendiAttiva()` disattivava **tutte** le stagioni attive di **tutti gli allenatori della piattaforma** quando uno qualsiasi attivava una propria stagione (`update({attiva:false}).neq('id', id)` senza alcun filtro owner). In un sito mono-cliente non si è mai manifestato; con 2+ allenatori avrebbe spento silenziosamente il sito di tutti gli altri clienti a ogni cambio stagione.

**Altre falle di scoping trovate e corrette durante il refactoring** (stesso pattern del #5, query senza filtro per allenatore): `portieri/page.js` e `dashboard/page.js` caricavano `valutazioni`/`valutazioni_partita` senza alcun filtro (scaricavano i dati di voto di ogni portiere di ogni cliente della piattaforma); `hasAbbonamento()` in `lib/gating.js` controllava l'abbonamento sull'utente grezzo invece che sull'allenatore titolare, quindi collaboratori e portieri non ereditavano mai il piano del proprio allenatore e vedevano tutte le funzionalità a pagamento bloccate; la libreria esercizi filtrava `allenatore_id` sull'utente grezzo invece che sull'owner, quindi un collaboratore vedeva sempre "0 esercizi" nella propria libreria invece di quella condivisa con il proprio allenatore (corretto in `esercizi/page.js`, `calendario/[id]/page.js`, `portieri/[id]/obiettivi/page.js`).

**File toccati**: 30 file applicativi + 1 script SQL (`lib/tenant.js` nuovo, `lib/gating.js`, `lib/permessi.js` invariato, e 27 pagine/componenti). Tutti validati con esbuild, zero errori.

**Limitazioni note rimaste, da affrontare separatamente**:
- I permessi granulari collaboratori (livello "Solo visualizza") restano a livello di pagina/sezione, non distinguono ancora i singoli bottoni di modifica dentro le pagine dettaglio (`/calendario/[id]`, `/partite/[id]`).
- Non è stata fatta una verifica RLS a livello di database per le tabelle toccate da questo refactoring (`allenamenti`, `partite`, `portieri` su INSERT) — solo guardie applicative lato Next.js. Da includere nell'audit RLS completo già in backlog.

---

## 6. REFACTORING MULTI-TENANT (2026-06-21) — propedeutico al lancio stagione 2026-27

**Contesto**: la stagione 2025-26 era solo di prova (singolo cliente: Azzurra Sandrigo). Dalla stagione 2026-27 il sito ospiterà **molti allenatori indipendenti**, ognuno con le proprie squadre/categorie/staff/portieri. Prima di questo intervento, il sito era strutturalmente single-tenant: ogni pagina leggeva "LA stagione attiva" come singleton globale (`eq('attiva', true).maybeSingle()`), senza alcun isolamento tra clienti diversi.

### Modello introdotto
- `stagioni.owner_id` e `squadre.owner_id`: riferimento esplicito all'allenatore principale proprietario.
- `profili.allenatore_id`: collega ogni collaboratore (staff) e ogni portiere al proprio allenatore principale, per ereditare lo scoping.
- Tutto ciò che ha già `stagione_id` (allenamenti, partite, iscrizioni, inviti, ricorrenze_stagionali, squadre_avversarie, stagione_categorie) eredita l'isolamento automaticamente passando dalla stagione corretta — nessuna modifica di schema necessaria su quelle tabelle.
- `elenco_voci`, `parametri_valutazione`, `attributi_definizioni`, `funzionalita_config`, `coupon` restano **volutamente globali**: sono lo standard di piattaforma gestito dal vero Supervisore, condiviso da tutti i clienti — coerente con il documento originale.
- Nuovo helper centrale `lib/tenant.js`: `getOwnerId(supabase, userId)` e `getStagioneAttiva(supabase, userId)`, usati ovunque al posto del vecchio pattern singleton.

### Migrazione dati esistenti
Lo script SQL assegna automaticamente tutto ciò che esiste oggi (stagione 2025-26 di prova) al primo utente con ruolo allenatore trovato nel DB — pensato per assegnare tutto a Cristian/Azzurra Sandrigo senza perdita di dati. **Prerequisito da verificare prima di eseguire**: che esista un solo account allenatore nel DB al momento della migrazione, altrimenti l'assegnazione automatica andrebbe a un account scelto arbitrariamente (il primo per id).

### Riorganizzazione sezione Supervisore
Le pagine `/supervisore/stagioni` e `/supervisore/categorie` sono concettualmente diventate funzioni **per-allenatore** (ogni cliente gestisce le proprie), non più funzioni del vero Supervisore globale — restano sotto quell'URL per non rompere i link esistenti, ma il controllo di accesso è "sei staff" (non "sei supervisore") e le query sono scoped per owner. La pagina `/supervisore/inviti` (duplicato concettualmente rotto di `/inviti`) è stata rimossa.

### Bug di sicurezza trovati e corretti durante l'audit pre-refactoring
Un audit sistematico di tutte le 37 pagine del sito (pubbliche/private, per ogni ruolo) ha trovato 5 problemi reali, oltre alla mancanza strutturale di scoping:

1. **MEDIO** — `/calendario/nuovo`, `/partite/nuova`, `/portieri/nuovo` non controllavano il ruolo lato server (un portiere autenticato poteva raggiungere i form di creazione). Corretto con redirect espliciti.
2. **GRAVE** — `/partite/[id]` non distingueva affatto staff da portiere: un portiere che apriva una partita dalla lista vedeva il form di modifica completo e le valutazioni di TUTTI i compagni di squadra. Corretto con una vista portiere dedicata in sola lettura sui propri dati, sullo stesso pattern già usato per `/calendario/[id]`.
3. **CRITICO** — 5 pagine Supervisore (`/supervisore`, `/supervisore/inviti`, `/supervisore/stagioni`, `/supervisore/elenchi`, `/supervisore/categorie`) controllavano solo "sei staff" invece del vero flag `supervisore`: qualsiasi allenatore cliente poteva modificare la home pubblica del sito ed editare elenchi globali di piattaforma. Le altre 5 pagine Supervisore (funzionalita, attributi, coupon, abbonamenti, newsletter) avevano già il controllo corretto. Risolto correggendo i controlli e riassegnando concettualmente stagioni/categorie come funzioni per-allenatore (vedi sopra).
4. **GRAVE** — `/portieri/[id]` e `/portieri/[id]/obiettivi` calcolavano "sei un portiere" ma non verificavano che l'id nell'URL fosse il proprio: un portiere poteva vedere/modificare la scheda anagrafica e gli obiettivi personali di un compagno di squadra cambiando l'URL. Le pagine gemelle Statistiche e Percorso avevano già il controllo corretto, usato come modello per il fix.
5. **CRITICO** (trovato durante il refactoring stesso) — `StagioniManager.rendiAttiva()` disattivava TUTTE le stagioni attive di TUTTI gli allenatori della piattaforma quando uno qualsiasi attivava una propria stagione (`update({attiva:false}).neq('id', id)` senza alcun filtro per owner). In un sito mono-cliente questo non si è mai manifestato; con 2+ allenatori avrebbe spento silenziosamente il sito di tutti gli altri clienti ogni volta che uno cambiava stagione attiva. Corretto aggiungendo lo scoping per owner al reset.

### Bug di scoping aggiuntivi trovati durante il refactoring (stesso pattern, impatto minore)
- `portieri/page.js` e `dashboard/page.js` caricavano le tabelle `valutazioni`/`valutazioni_partita` **senza alcun filtro**, scaricando i dati di valutazione di tutti i portieri di tutti gli allenatori della piattaforma per poi aggregarli lato applicazione. Corretto filtrando sempre tramite `allenamento_id`/`partita_id` derivati dalla stagione del proprio owner.
- La libreria Esercizi (`allenatore_id`) era filtrata ovunque sul `user.id` grezzo invece che sull'owner risolto: un collaboratore staff vedeva sempre "0 esercizi" nella propria libreria invece di quella condivisa del suo allenatore. Corretto in `esercizi/page.js`, `calendario/[id]/page.js` (libreriaMia/libreriaPubblica) e `portieri/[id]/obiettivi/page.js` (selettore esercizi per collegamento obiettivi).

### Limiti noti rimasti aperti
- La migrazione automatica del SQL assume un solo allenatore esistente — va verificato manualmente prima di eseguire.
- Le RLS Supabase su `stagioni`/`squadre` sono state scritte per questo refactoring ma non testate in produzione con un secondo account allenatore reale — raccomandato un test end-to-end con due account allenatore distinti prima del lancio 2026-27.
- I permessi granulari collaboratori (vedi sezione 4) restano a livello di pagina, non di singolo bottone — un collaboratore con "Solo visualizza" su un modulo non vede ancora bloccati i controlli di modifica dentro le pagine di dettaglio.

---

## 7. Note di processo
- Ogni nuova chat con Claude: incollare questo file (o linkare il repo) per ripartire subito senza dover rispiegare lo stato del progetto.
- Cristian testa rigorosamente e riporta bug con screenshot — fix rapidi entro la stessa sessione.
- Pattern di consegna: Claude valida sempre con esbuild prima di pacchettizzare, fornisce sempre l'elenco file-destinazione e l'eventuale SQL da eseguire PRIMA del deploy applicativo.
