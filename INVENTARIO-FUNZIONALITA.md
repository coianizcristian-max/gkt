# GKSeason — Inventario completo funzionalità (free / a pagamento)

Documento di riferimento per decidere cosa mettere a pagamento. Ricavato dal codice reale
(`lib/gating.js`, `app/(app)/layout.js`, pagine e componenti), non a memoria.

Legenda stato attuale:

* 🟢 **Free** oggi (accessibile senza abbonamento)
* 🔒 **A pagamento** oggi (serve abbonamento attivo, oppure il flag reso Free dal supervisore)
* 🌐 **Pubblico** (nessun login)
* 👑 **Supervisore** (è un ruolo, non un abbonamento)
* `chiave` = nome del flag in Supervisore → Funzionalità; **— nessun flag** = oggi non è
disattivabile singolarmente (è sempre incluso o eredita dal padre): se lo vuoi rendere
attivabile/disattivabile va aggiunto un nuovo flag (vedi ultima sezione).

\---

## 0\) Come funziona OGGI il gating (in breve)

Tutto è governato dalla tabella `funzionalita\_config` e da `lib/gating.js`:

* **Interruttore globale “🌐 TUTTO FREE”** (`\_\_tutto\_free`): se ON, tutto è sbloccato per tutti
(utile per periodi di prova). Lo trovi in **Supervisore → Funzionalità**.
* **14 flag per-funzionalità**: ognuno può essere messo su ✓ **Free** o 🔒 **A pagamento**.
Sono già lì, visibili **solo al supervisore** (la pagina fa `redirect('/')` se non sei supervisore).
* **Abbonamento**: `hasAbbonamento()` controlla la tabella `abbonamenti` (stato attivo/disdetto
entro scadenza, o lifetime) **oppure** un coupon attivo. Il portiere/staff **non ha un piano
proprio: eredita quello dell’allenatore titolare** (owner). Quindi una funzione 🔒 è sbloccata
per un portiere solo se il suo allenatore ha l’abbonamento (o se il flag è Free).
* **Prezzi** (allenatore e portiere, mensile/annuale/lifetime), **fee sblocco contatti** e
**coupon**: tutti configurabili dal supervisore.
* Regola finale (`isUnlocked`): `tuttoFree` → sbloccato; altrimenti se il flag è Free → sbloccato;
altrimenti serve l’abbonamento.

### I 14 flag reali e il loro default

|chiave|Cosa sblocca|Default|
|-|-|-|
|`valutazioni\_allenamento`|Inserire/modificare valutazioni allenamento|🟢 Free|
|`valutazioni\_partita`|Inserire/modificare valutazioni partita|🟢 Free|
|`esercizi\_allenamento`|Esercizi dentro le sedute|🟢 Free|
|`esercizi\_libreria`|Libreria esercizi personale|🟢 Free|
|`statistiche\_dettaglio`|Statistiche dettaglio portiere (per-mese, per-caratteristica)|🔒 A pagamento|
|`obiettivi\_portieri`|Pagina Obiettivi portiere|🔒 A pagamento|
|`ricorrenze\_genera`|Generazione automatica ricorrenze|🔒 A pagamento|
|`feedback\_allenatore`|Tab feedback portieri (lato allenatore)|🔒 A pagamento|
|`inviti\_creazione`|Creare link di invito|🟢 Free|
|`inviti\_staff`|Invito staff/preparatore (supervisione)|🟢 Free|
|`profilo\_ricerca`|Profilo allenatore nella ricerca pubblica|🔒 A pagamento|
|`export\_dati`|Export CSV (portieri/valutazioni/partite)|🟢 Free|
|`report\_pdf\_stagione`|Report PDF stagione (percorso portiere)|🟢 Free|
|`report\_pdf\_statistiche`|Report PDF statistiche squadra|🔒 A pagamento|

> Nota: “default” = valore se non hai mai toccato il flag. Se in Supervisore → Funzionalità l’hai
> già cambiato, vince il valore salvato.

\---

## 1\) AREA PUBBLICA 🌐 (senza login)

* **Home pubblica** `/` — 🌐
* **Ricerca allenatori** `/cerca-allenatori` — 🌐

  * Comparire tra i risultati (lato allenatore) — 🔒 `profilo\_ricerca`
* **Profilo pubblico allenatore** `/allenatori/\[id]` — 🌐

  * **Sblocco contatti** `/allenatori/\[id]/contatto` — 🔒 **pagamento una tantum** (`fee\_contatto\_importo`, non è l’abbonamento)
* **Newsletter pubblica** `/newsletter` — 🌐
* **Suggerimenti** (form pubblico) `/suggerimenti` — 🌐
* **Come iniziare** `/come-iniziare` — 🌐
* **Domande frequenti (FAQ)** `/faq` — 🌐
* **Login** `/login` · **Registrazione da invito** `/registrati` — 🌐
* **Landing webinar** `/webinar` (statica) + ringraziamento `/webinar/grazie.html` — 🌐

\---

## 2\) AREA PREPARATORE / STAFF 🔑 (riservata)

> Per lo \*\*staff/collaboratore\*\* la visibilità di Portieri/Allenamenti/Partite/Statistiche dipende
> anche dai \*\*permessi collaboratore\*\* (`permessi\_collaboratore`) — è un permesso, non un paywall.

* **Dashboard** `/dashboard` — 🟢

  * Prossimo allenamento · partite imminenti · **avviso proposte obiettivi personali da gestire** (nuovo) · misurazioni oggettive da fare · portieri da attenzionare · banner “tutto valutato” — 🟢 (— nessun flag)
* **Portieri** `/portieri` (elenco) — 🟢

  * **Nuovo portiere** `/portieri/nuovo` — 🟢
  * **Scheda portiere** `/portieri/\[id]` — 🟢

    * Anagrafica, foto, dati fisici, piede, provenienza — 🟢 (— nessun flag)
    * Iscrizione a stagione/categoria, numero maglia — 🟢 (— nessun flag)
    * Infortuni (registro) — 🟢 (— nessun flag)
    * Tag portiere — 🟢 (— nessun flag)
  * **Obiettivi** `/portieri/\[id]/obiettivi` — 🔒 `obiettivi\_portieri`

    * Tab **Obiettivi**: creazione/gestione obiettivi PNL, sotto-obiettivi, collegamento a parametri ed esercizi, trend, **misurazioni oggettive** — 🔒 (stesso flag della pagina)
    * Tab **Proposta obiettivi personali** (nuovo): inserimento proposta, quadratino ☐/✔/✘ — 🔒 (stesso flag della pagina)
  * **Statistiche portiere** `/portieri/\[id]/statistiche` — 🔒 `statistiche\_dettaglio`

    * Presenze allenamenti, media voto, per-caratteristica, per-mese — 🔒
    * Partite: campionato / coppa / amichevoli — 🔒
    * **Fuori categoria** (nuovo) — 🔒 (parte della pagina)
    * Grafici andamento — 🔒
  * **Percorso di crescita** `/portieri/\[id]/percorso` — 🔒 (richiede `statistiche\_dettaglio` **e** `obiettivi\_portieri`)

    * Timeline eventi (obiettivi + misurazioni) — 🔒
    * **Report PDF stagione** — 🔒 `report\_pdf\_stagione`
* **Calendario** `/calendario` — 🟢

  * **Nuovo allenamento** `/calendario/nuovo` — 🟢
  * **Dettaglio allenamento** `/calendario/\[id]` — 🟢

    * **Presenze / Valutazioni allenamento** — 🔒 `valutazioni\_allenamento`
    * **Esercizi della seduta** — 🔒 `esercizi\_allenamento`
    * **Report PDF della seduta** (`/api/esercizi-pdf`) — 🟢 **(— nessun flag dedicato)**
    * **Tab feedback portieri** — 🔒 `feedback\_allenatore`
* **Ricorrenze** `/ricorrenze` — 🟢 (la pagina)

  * **Generazione automatica ricorrenze** — 🔒 `ricorrenze\_genera`
* **Partite** `/partite` (elenco) — 🟢

  * **Nuova partita** `/partite/nuova` — 🟢
  * **Dettaglio partita** `/partite/\[id]` — 🟢

    * **Valutazioni partita** — 🔒 `valutazioni\_partita`
    * **Valutazione portiere fuori categoria** (nuovo) — 🔒 (parte di `valutazioni\_partita`)
* **Statistiche squadra** `/statistiche` — 🟢 (la vista)

  * **Report PDF statistiche squadra** (per mese/categoria) — 🔒 `report\_pdf\_statistiche`
* **Esercizi** `/esercizi` — 🟢 (la pagina)

  * **Libreria esercizi personale** — 🔒 `esercizi\_libreria`
  * **Lavagna esercizio** (editor schema) — 🔒 (parte della libreria/esercizi)
* **Template allenamenti** `/template-allenamenti` (+ `\[id]`) — 🟢 (— nessun flag)
* **Profilo allenatore** `/profilo` — 🟢 (la pagina)

  * **Comparire nella ricerca pubblica** — 🔒 `profilo\_ricerca`
* **Le mie stagioni** `/stagioni` (+ nuova) — 🟢 (— nessun flag)
* **Le mie categorie** `/categorie` — 🟢 (— nessun flag)
* **Parametri di valutazione personalizzati** `/parametri-valutazione` — 🟢 (— nessun flag)
* **Inviti** `/inviti` — 🟢 (la pagina)

  * **Creazione link di invito** — 🟢 `inviti\_creazione` (default Free, ma è un flag)
  * **Invito staff / preparatore** — 🟢 `inviti\_staff` (default Free, ma è un flag)
* **I miei preparatori** `/i-miei-preparatori` — 🟢 (solo allenatori con preparatori collegati; — nessun flag)
* **Contatti ricevuti** `/contatti` — 🟢 (— nessun flag)
* **Archivio stagioni** `/archivio` — 🟢 (la pagina)

  * **Export dati CSV** (portieri/valutazioni/partite) — 🟢 `export\_dati` (default Free, ma è un flag)
* **Newsletter (lettura)** `/newsletter` — 🟢
* **Account** `/account` — 🟢 (— nessun flag)
* **Abbonati / sblocca funzionalità** `/abbonati` — 🟢 (pagina per acquistare)

\---

## 3\) AREA PORTIERE 🧤 (riservata, vista propria)

> Il portiere \*\*non paga un abbonamento suo\*\*: \*\*eredita il piano del proprio allenatore\*\*.
> Quindi le voci 🔒 qui sotto sono sbloccate per lui \*\*solo se l’allenatore ha l’abbonamento\*\*
> (o se il relativo flag è Free).

* **La mia scheda** `/portieri/\[id]` — 🟢 (anagrafica propria, in gran parte sola lettura)
* **Obiettivi (propri)** `/portieri/\[id]/obiettivi` — 🔒 `obiettivi\_portieri`

  * Tab Obiettivi: **sola lettura** (nuovo: pulsanti di scrittura nascosti al portiere) — 🔒
  * Tab **Proposta obiettivi personali**: il portiere **può inserire** le proprie proposte (nuovo) — 🔒
* **Statistiche (proprie)** `/portieri/\[id]/statistiche` — 🔒 `statistiche\_dettaglio`
* **Percorso (proprio)** `/portieri/\[id]/percorso` — 🔒 (`statistiche\_dettaglio` + `obiettivi\_portieri`)
* **Calendario (proprio)** `/calendario` — 🟢 (se il ruolo lo prevede)
* **Partite (proprie)** `/partite` — 🟢
* **Statistiche squadra** `/statistiche` (vista portiere) — 🟢
* **Newsletter · FAQ · Come iniziare · Account** — 🟢

\---

## 4\) AREA SUPERVISORE 👑 (ruolo, non abbonamento)

Tutte a `redirect('/')` se non sei supervisore:

* **Sito / Home supervisore** `/supervisore`
* **Anni disponibili** `/supervisore/anni`
* **Attributi** `/supervisore/attributi`
* **Elenchi** `/supervisore/elenchi`
* **Funzionalità (paywall + prezzi + fee + TUTTO FREE)** `/supervisore/funzionalita` ← qui vivono i 14 flag
* **FAQ (gestione)** `/supervisore/faq`
* **Abbonamenti** `/supervisore/abbonamenti` ← creazione manuale (vedi sotto)
* **Coupon** `/supervisore/coupon`
* **Newsletter (editor + invio)** `/supervisore/newsletter`
* **Metriche** `/supervisore/metriche`
* **Webinar (iscrizioni + export)** `/supervisore/webinar`
* **Versioni** `/supervisore/versioni`
* **Ripristino** `/supervisore/ripristino`
* **Ordine sidebar** `/supervisore/sidebar-ordine`

\---

## 5\) “Voglio un flag su OGNI pagina/micro-funzionalità”

Oggi il sistema copre **14 flag** (le funzionalità che aveva senso vendere). Le voci marcate
**“— nessun flag”** qui sopra **non** sono singolarmente disattivabili: o sono sempre incluse,
o ereditano dal padre. Per renderle attivabili/disattivabili una a una servono 2 passi ciascuna:

1. aggiungere la chiave in `FUNZIONALITA` dentro `lib/gating.js` (con `label` e `defaultFree`);
2. mettere il guard nella pagina/porzione: `isUnlocked('nuova\_chiave', gatingCfg, abbAttivo)` +
`PaywallBanner` (esattamente come fanno già le pagine 🔒).

Comparirà **automaticamente** come nuovo interruttore in Supervisore → Funzionalità (l’editor
legge la mappa `FUNZIONALITA`), visibile solo al supervisore.

Candidati “— nessun flag” che potresti voler rendere a pagamento (dimmi quali e li cablo io):

* Report PDF della **seduta** di allenamento (oggi Free)
* **Template allenamenti**
* **Parametri di valutazione** personalizzati
* **Infortuni** (registro nella scheda portiere)
* **Lavagna esercizio** (se vuoi separarla dalla libreria)
* **Export CSV** e **Report PDF stagione** oggi hanno flag ma default Free: basta spostarli su 🔒

> Alternativa più ambiziosa: trasformare il gating da “per funzionalità” a “per singola pagina”
> con una mappa generata da `pagine-tracciate.js`. È fattibile ma è un intervento grosso: se è la
> direzione che vuoi, lo pianifichiamo a parte.

\---

## 6\) Abbonamento manuale da supervisore (come funziona / cosa è cambiato)

**Come funziona** (`Supervisore → Abbonamenti`): in fondo c’è **“Attiva un abbonamento manuale”**.
Serve proprio a quello che volevi: dare l’accesso a un utente **senza fargli pagare** (omaggio o
pagamento alternativo). Cerchi l’allenatore, lo selezioni, scegli **Piano** + **Stato = Attivo**
(+ scadenza) e crei: `hasAbbonamento()` lo vede subito come attivo e gli sblocca tutte le funzioni.
Gli “Allenatore 1…9” che vedevi erano solo i primi profili **senza** abbonamento, mostrati di default.

**Cosa ho migliorato** (file inclusi nello zip):

* La lista di suggerimenti **non compare più a caso**: appare **solo dopo una ricerca**.
* Puoi cercare l’allenatore anche **per email** (prima solo nome/id — l’email non veniva caricata).
* Campo **Nota** (facoltativo) per annotare il motivo (“pagamento alternativo”, “omaggio”, ecc.),
mostrato poi accanto all’abbonamento.
* Richiede la colonna SQL `abbonamenti.nota` → file `supabase-sql/C\_abbonamenti\_nota.sql`.

