# GKT — PROGETTO.md
**Gestionale allenamento portieri** · https://gkt2026.vercel.app · repo `coianizcristian-max/gkt`

> Questo file è il punto di ripartenza. Se apri una chat nuova, leggi questo e hai tutto il contesto per partire subito.
> Ultimo aggiornamento: 16/06/2026.

---

## 1. Stack & accessi
- **Frontend:** Next.js (App Router, JavaScript).
- **Backend:** Supabase (PostgreSQL + RLS + Auth + Storage).
- **Deploy:** Vercel (dominio `gkt2026.vercel.app`).
- **Email transazionali:** da definire (probabile Resend, come ArtLink).
- **Workflow di lavoro:** il repo è privato → si opera via **Chrome** sulla sessione loggata dell'utente (GitHub web editor, Supabase dashboard, Vercel). Estensione Chrome "Browser 1", deviceId `2f02240c-a343-4ea8-b885-1926fbda6bf5`.
- Project ref Supabase: **da riconfermare** aprendo la dashboard (NON è quello di ArtLink).

## 2. Identità del prodotto
- Società pilota: **Azzurra Sandrigo**. Vincolo: il nome società NON è hardcoded nelle pagine pubbliche; compare solo nell'area autenticata, preso dalle impostazioni della **stagione attiva**.
- Ruoli utente: `allenatore`, `staff`, `collaboratore`, `portiere`.
- Categorie tipiche: Prima Squadra, Allievi, Juniores, Giovanissimi, Esordienti (gestibili, non fisse).

## 3. Stato attuale (già costruito)
- Schema v2: `stagioni`, `stagione_categorie`, `iscrizioni`, `portieri` (anagrafica estesa: data/luogo nascita, altezza, peso, piede, n. maglia [su iscrizione], contatto, indirizzo, squadra di provenienza, note), `partite` + `valutazioni_partita` (clean sheet automatico se gol_subiti=0), `allenamenti`, `valutazioni`, `parametri_valutazione`, `profili`, `squadre`, `sito_sezioni`.
- Dati stagione 2025-26 importati: 172 allenamenti, ~400 valutazioni, 34 partite, 5 portieri.
- Landing pubblica con CMS (`sito_sezioni`), editabile dal Supervisore.
- Login/registrazione (default ruolo `portiere` per sicurezza).
- Calendario: `CalendarioMese`, `AllenamentoForm`, `ValutazioniAllenamento` con 6 parametri seed (tecnica, gioco coi piedi, uscite alte/basse, posizionamento, reattività/riflessi, atteggiamento/concentrazione).
- Mancano (già noto): Partite (UI), Statistiche, area riservata stagione/categorie/logo.

## 4. Decisioni prese (16/06/2026)
1. **Scala voti** → lista discreta gestita dal supervisore con questi 19 valori esatti:
   `4, 4.5, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.5, 9, 9.5, 10`.
   Si memorizza il **numero** (per le medie), si mostra l'etichetta (formato IT con virgola). Il supervisore può aggiungere/togliere voci.
2. **Accesso portiere** → link con **token** legato a portiere+stagione; il portiere si registra con mail+password, e il token aggancia l'account a quella iscrizione. Stagione nuova = token nuovo (i link sono validi solo per quella stagione).
3. **Partite** → inserimento **manuale** come base. Tuttocampo: solo via API ufficiale futura (vedi §6.4), no scraping.

---

## 5. ARCHITETTURA FONDANTE (da costruire per prima)

### 5.1 Motore "Liste" (tendine gestite dal supervisore) — alimenta TUTTE le tendine
- `liste` (id, chiave, nome, descrizione, gestibile_da_allenatore bool).
- `liste_voci` (id, lista_id, etichetta, valore numeric NULL, ordine, attiva, stato `standard|proposta`, proposta_da_allenatore_id NULL).
- Liste iniziali: `scala_voti` (i 19 valori), `piede_preferito`, `tipologie_esercizio`, `punti_partita` (3/1/0/-1/-3), eventuali attributi custom.
- **Attributi portiere** = due famiglie: (a) anagrafici fissi già a schema; (b) custom definiti dal supervisore agganciati a una lista. Assegnazione: dati persona → sulla scheda portiere; dati di stagione (es. n. maglia, categoria) → sull'iscrizione.
- Risponde alla domanda "come creo/assegno attributi": un unico posto in Supervisore → Liste, e ogni tendina dell'app punta a una lista.

### 5.2 Multi-squadra per allenatore
- `allenatore_squadre` (allenatore_id, squadra_id) — relazione molti-a-molti.
- In alto nell'app: **switch Squadra + Stagione**; tutti i dati filtrati di conseguenza. Una "sezione per ogni squadra" = stesso layout, contesto diverso.

### 5.3 Link/token (portieri e collaboratori) — vincolati alla stagione
- `inviti` (id, token, tipo `portiere|collaboratore`, iscrizione_id [per portiere] o squadra_id+stagione_id [per collaboratore], permessi jsonb, stato `attivo|consumato|revocato`, consumato_da_user_id, scadenza).
- Flusso portiere: apre `/invito/[token]` → form registrazione (mail+password) → al signup crea profilo ruolo `portiere` legato all'iscrizione → token consumato.
- **Portiere** vede SOLO i propri dati: può inserire un voto all'allenamento in cui risulta presente, note su quell'allenamento, note generali all'allenatore, e le statistiche che riguardano solo lui.
- **Collaboratore**: accesso completo SOLO alle parti che l'allenatore abilita a priori (permessi jsonb → matrice di sezioni).
- RLS rigorosa per isolare i dati per iscrizione/ruolo.

### 5.4 Storage (FIX dei 2 errori attuali)
- Errori noti: "Bucket not found" (immagine home Supervisore) e "new row violates row-level security policy" (foto portiere).
- Causa: bucket Storage mai creati e/o policy RLS su `storage.objects` mancanti.
- Fix: creare bucket `pubblico` (home/loghi) e `portieri` (foto); lettura pubblica; policy INSERT/UPDATE/DELETE per utenti autenticati staff/allenatore. Verificare poi che la foto compaia nella card riassuntiva del portiere.

---

## 6. FEATURE DETTAGLIATE

### 6.1 Calendario
- **Ricorrenza stagionale:** nelle impostazioni stagione → inizio/fine stagione + per ogni categoria gli orari ricorrenti (giorno settimana + ora inizio/fine). Più categorie possono avere lo stesso orario. Un generatore crea gli allenamenti dell'intera stagione.
  - `ricorrenze_stagionali` (stagione_id, categoria_id, giorno_settimana, ora_inizio, ora_fine). Inizio/fine su `stagioni`.
- **Colori allenamento:**
  - VERDE = ha valutazioni dentro **oppure** è marcato "Nessuno" (vuol dire che è stato comunque svolto/registrato).
  - ROSSO = allenamento nel **passato** senza valutazioni (mancante).
  - Gli allenamenti **da oggi in avanti** non sono "mancanti": restano neutri (non rossi).
- **Campo "Nessuno"** nella valutazione = nessun portiere di quella categoria era presente. Conta comunque come allenamento svolto (→ verde).
- **Presenze per statistiche:** se in un allenamento c'è la valutazione ma era presente solo 1 portiere su 2, l'assente deve risultare assente nelle statistiche → presenza per-portiere (`presente` bool) + livello allenamento "nessuno".
- **Sezione "Allenamenti da valutare"** (sotto il calendario): elenca gli allenamenti passati rispetto a oggi privi di valutazione (rossi); spariscono quando vengono valutati.
- **Mobile:** scheda allenamento con 2 tab → "Info" e "Valutazioni".

### 6.2 Allenamento → Contenuti → Esercizi
- Nella sezione contenuti: selezione **tipologie di esercizio** da tendina (lista `tipologie_esercizio` gestita dal supervisore).
- L'allenatore può **aggiungere** una tipologia: NON diventa subito standard per tutti. Va in coda `stato='proposta'`. Il supervisore le vede in una sezione apposita e può promuoverle a standard.
- Ogni tipologia ha un link alla sua sottosezione di **descrizione esercizi**:
  - Più **blocchi** = esercizi diversi (lista). Per ogni esercizio: descrizione breve, descrizione dettagliata, immagine, note.
  - Gli esercizi si salvano nella **libreria personale dell'allenatore** e sono **richiamabili** (se un esercizio è già stato fatto lo riusi senza riscriverlo). Mini-database del bagaglio dell'allenatore.
  - Ogni esercizio è sempre legato alla sua **tipologia**.
  - Tabelle: `esercizi` (allenatore_id, tipologia_voce_id, desc_breve, desc_dettagliata, immagine_url, note), `allenamento_esercizi` (allenamento_id, esercizio_id).

### 6.3 Scheda valutazione portiere
- L'allenatore deve poter definire uno **schema standard** di cose da valutare (parametri), personalizzabile. Estendere/riusare `parametri_valutazione` rendendolo per-allenatore.

### 6.4 Partite
- Per ogni categoria: lista **squadre avversarie** (la squadra di appartenenza è già impostata).
  - `squadre_avversarie` (stagione_id, categoria_id, nome).
- Inserimento incontri: una riga per incontro → squadra casa "-" squadra trasferta (prima la squadra di casa).
- Valutazioni partita: portiere che ha giocato, voto (scala voti), note, **punti portati** (3/1/0/-1/-3), clean sheet **automatico** se gol subiti = 0.
- Ogni categoria ha il suo calendario partite.
- **Tuttocampo:** solo via API/widget UFFICIALE (richiesta alla redazione, probabile partner/a pagamento). Lo scraping è bloccato (403) e non consentito dai Termini. Eventuale import = pre-compila partite da confermare manualmente.

### 6.5 Portieri — card riassuntive
Nei singoli riquadri del riassunto portieri:
- media voto allenamento;
- voto ultimo allenamento;
- media voto **ultima settimana completa** fatta + (allenamenti fatti / previsti in quella settimana);
- media voto del **mese** + (fatti / previsti nel mese);
- media voto **partite**;
- numero partite giocate;
- numero **clean sheet** (squadra non ha subito gol);
- **punti totali** portati alla squadra.
- La **foto** del portiere deve comparire nel riquadro (dopo fix Storage).

### 6.6 Statistiche
- Derivate da valutazioni (con presenza per-portiere) e valutazioni partita.
- Presenze/assenze, medie per periodo, andamento, ecc. Layout di dettaglio da definire in fase dedicata.

### 6.7 Profilo allenatore/utente
- Sezione di inserimento dati: selezione **società**, foto, dati anagrafici, **esperienze passate**, **certificati** (upload), ecc.
- Estendere `profili` + storage per foto/certificati.

### 6.8 Suggerimenti e migliorie
- Voce "Suggerimenti e note di miglioramento sito": form → tabella `suggerimenti` (utente_id, testo, creato_il, stato) → visibile al supervisore.

### 6.9 Supervisore
- **Drag-and-drop** per ordinare le categorie (sostituisce l'attuale numero di posizione fisso) → colonna `ordine` + libreria dnd.
- Gestione **Liste/attributi** (§5.1).
- Sezione **revisione tipologie esercizio** proposte dagli allenatori (§6.2).
- Gestione sito (CMS) già presente — fix immagine home (§5.4).

## 7. Mobile-first (vincolo trasversale)
- Pochi click per arrivare all'obiettivo; lettura facile; inserimenti rapidi.
- Allenamento a 2 tab (Info / Valutazioni).
- Home post-login con tab utili: "Prossimi allenamenti da impostare" e "Allenamenti da valutare" (+ eventuali idee: prossime partite, alert).

## 8. Modifiche schema previste (riepilogo tabelle nuove/colonne)
- Nuove: `liste`, `liste_voci`, `allenatore_squadre`, `inviti`, `esercizi`, `allenamento_esercizi`, `squadre_avversarie`, `ricorrenze_stagionali`, `suggerimenti`.
- Colonne: `stagioni`(data_inizio, data_fine) · `valutazioni`(presente bool) · `allenamenti`(flag/derivazione valutato + "nessuno") · `stagione_categorie`(ordine) · `profili`(societa, foto_url, esperienze, certificati) · `parametri_valutazione`(allenatore_id).
- Storage: bucket `pubblico`, `portieri` + policy RLS.

## 9. Bug / verifiche aperte
- [ ] Storage: creare bucket + policy (sblocca i 2 errori).
- [ ] Verificare che la foto portiere compaia nella card.
- [ ] Verificare la struttura cartelle del repo: in App Router `login/`, `registrati/`, `page.js`, `globals.css` di norma stanno DENTRO `app/`; `middleware.js` deve essere UNO solo alla root (storico bug doppio middleware).

## 10. Piano a fasi (ordine consigliato)
- **Fase 0 — Fondamenta:** Storage (fix 2 errori) + motore Liste (incl. scala voti) + struttura cartelle verificata.
- **Fase 1 — Setup stagione:** date inizio/fine, ricorrenze orari per categoria, generatore allenamenti, drag&drop categorie, multi-squadra.
- **Fase 2 — Calendario completo:** colori verde/rosso, "Nessuno", presenza per-portiere, sezione "Allenamenti da valutare", 2 tab.
- **Fase 3 — Esercizi:** tipologie (tendina + proposte), libreria esercizi richiamabile, link allenamento.
- **Fase 4 — Partite + Statistiche:** avversari, incontri, valutazioni partita, clean sheet, card portiere, statistiche.
- **Fase 5 — Accessi esterni:** link/token portiere + collaboratori, RLS, pagine viste limitate.
- **Fase 6 — Profili & extra:** profilo allenatore (società/foto/esperienze/certificati), form suggerimenti, rifinitura mobile.

## 11. Note tecniche / workflow
- Commit via editor web GitHub (CodeMirror): inserire con `document.execCommand('insertText', ...)`, attendere, poi "Commit changes"; impostare il messaggio col native input setter. Per stringhe lunghe/multilinea la find&replace è inaffidabile.
- Supabase SQL Editor: ogni `ALTER TABLE` come statement separato; attenzione all'autocomplete.
- Validare il JSX prima dei commit (build/esbuild) per evitare deploy rotti.
- Storico: bug "due middleware" (root vs lib) → tenere un solo `middleware.js` alla root.