# Campagna Google Search — preparatori dei portieri

## Stato al 13 ottobre 2026 (fatto da Claude nel tuo account, 644-485-6460)

Fatto:
- Tag Google creato: **AW-1012017816**. Origine dati "Tag Google" (non la proprietà Analytics COIANIZ, che è di ArtLink).
- Azioni di conversione: **Registrazione** (principale, etichetta `LzXlCOTDxJsdEJjVyOID`, conteggio una, finestra 30 giorni) e **Demo aperta** (etichetta `Z08FCOfDxJsdEJjVyOID`, categoria Visualizzazione di pagina: non usata per le offerte finché nessuna campagna ha quell'obiettivo). Conversioni avanzate: **spente** (manderebbero le email degli utenti a Google).
- Campagna **"Search - Preparatori portieri"** creata come bozza completa: obiettivo Registrazioni (Visualizzazioni di pagina rimosso dagli obiettivi della campagna), solo Rete di ricerca, Italia "presenza", italiano, Massimizza i clic con CPC max 1,50 €, budget 6 €/giorno, AI Max spento, suffisso UTM, **data di inizio 19 ottobre 2026**, gruppo "Software e app portieri" con 36 keyword + annuncio (15 titoli, titolo 1 bloccato, 4 descrizioni), 4 sitelink, 4 callout.

Da fare (nell'ordine):
1. **Pubblica campagna** (lo fai tu: Google Ads chiede che il clic che spende sia dell'inserzionista). Non ricaricare la scheda prima: in questa procedura di Google le keyword e l'annuncio restano in memoria solo finché la scheda è aperta.
2. Subito dopo: metti la campagna **in pausa** (tabella Campagne → interruttore) finché le landing non sono online. Con inizio il 19/10 non spende comunque prima.
3. Aggiungere gli altri 3 gruppi di annunci (Programmazione allenamenti, Valutazione e statistiche, Brand GKSeason): testi in `04-keyword-da-incollare.txt`, oppure chiedi a Claude.
4. Aggiungere le 73 parole chiave escluse a livello campagna (stesso file).
5. Rinominare "Gruppo di annunci 1" in "Software e app portieri".
6. Dopo il deploy delle landing con le variabili NEXT_PUBLIC_GADS_*: riattivare la campagna.
7. **Entro il 27 ottobre: verifica dell'identità dell'inserzionista** (Google la chiede; dopo quella data blocca gli annunci finché non è fatta).

---

Obiettivo: pagare solo chi sta cercando uno strumento per allenare i portieri. Nessun interesse, nessun pubblico: il targeting è la ricerca stessa.

Ordine di lavoro: **prima** le conversioni (parte A), **poi** il deploy del codice con le etichette, **poi** la campagna (parte B). Se crei la campagna prima delle conversioni, Google ti propone "Massimizza le conversioni" con zero dati e sprechi i primi giorni.

Tempo stimato: 60-90 minuti dal PC. Dal telefono non si fa.

---

## A. Conversioni (una volta sola)

1. Google Ads → **Obiettivi** (icona bersaglio) → **Conversioni** → **Riepilogo** → **+ Nuova azione di conversione**.
2. Scegli **Sito web** → inserisci `gkseason.it` → Scansiona → in fondo **"+ Aggiungi manualmente un'azione di conversione"**.
3. Prima azione:
   - Obiettivo e categoria: **Registrazione**
   - Nome: `Registrazione`
   - Valore: *Non utilizzare un valore*
   - Conteggio: **Una**
   - Finestra di conversione clic: 30 giorni; visualizzazione: 1 giorno
   - Attribuzione: *Basata sui dati* (se non disponibile, *Ultimo clic*)
   - Salva. Deve risultare **Azione principale** (usata per le offerte).
4. Seconda azione, stessa strada:
   - Categoria: **Altro** (o *Visualizzazione di pagina*)
   - Nome: `Demo aperta`
   - Conteggio: **Una**
   - Dopo averla salvata: aprila → **Impostazioni** → *Obiettivo e ottimizzazione delle azioni* → **Azione secondaria** (solo osservazione, non deve guidare le offerte).
5. Per **ciascuna** azione: aprila → **Configurazione del tag** → *Installa il tag manualmente* → *Usa Google tag*. Nel codice che compare trovi:
   ```
   gtag('event', 'conversion', {'send_to': 'AW-123456789/AbCdEfGhIjKlMn'});
   ```
   - `AW-123456789` → è il **NEXT_PUBLIC_GADS_ID** (uguale per tutte le azioni)
   - `AbCdEfGhIjKlMn` (la parte dopo la barra) → è l'**etichetta** di quella azione
6. Su Vercel → Settings → Environment Variables (Production + Preview + Development):
   ```
   NEXT_PUBLIC_GADS_ID                  = AW-123456789
   NEXT_PUBLIC_GADS_LABEL_REGISTRAZIONE = <etichetta di "Registrazione">
   NEXT_PUBLIC_GADS_LABEL_DEMO          = <etichetta di "Demo aperta">
   ```
   e in `.env.local`. Poi **ridistribuisci** (le variabili NEXT_PUBLIC_ entrano nel bundle al build: senza redeploy non cambia nulla).
7. Verifica: apri `https://www.gkseason.it/lp/software-portieri?gclid=test`, accetta i cookie, apri la demo. In Google Ads → Conversioni → "Demo aperta" dovrebbe passare da *Inattiva* a *Nessuna conversione recente* / *Registrazione delle conversioni* entro qualche ora (a volte un giorno). Se dopo 24 ore è ancora "Inattiva": controlla le variabili su Vercel e che il redeploy sia avvenuto.

Nota consenso: il tag parte **solo dopo** che il visitatore accetta i cookie (come Pixel e PostHog). Google Ads può mostrare un avviso "segnali di consenso mancanti" su parte del traffico: è normale con questa impostazione, e le conversioni di chi accetta vengono contate regolarmente. Chi rifiuta i cookie non viene contato da Google ma resta visibile in PostHog (gclid salvato).

---

## B. Campagna

### B1. Creazione

1. **+ Nuova campagna** → *Crea una campagna senza indicazioni sugli obiettivi* (oppure obiettivo "Lead": è uguale, ma senza obiettivo Google fa meno proposte).
2. Tipo: **Ricerca**. Non Performance Max, non Demand Gen (per ora).
3. Se chiede "risultati che vuoi ottenere": seleziona **Registrazione** (l'azione di conversione del punto A).
4. Nome campagna: `Search - Preparatori portieri`.

### B2. Impostazioni (quelle che contano)

| Impostazione | Valore | Perché |
|---|---|---|
| Reti | **togli** "Partner di ricerca" e **togli** "Rete Display" | i partner e il display portano clic fuori target |
| Località | Italia → **Opzioni località: "Presenza: persone che si trovano nelle località target"** | il default "presenza o interesse" mostra gli annunci a chi all'estero cerca cose italiane |
| Lingue | Italiano | |
| Offerta | **Massimizza i clic** con **limite CPC massimo 1,50 €** | con zero conversioni, "massimizza conversioni" spende a caso |
| Budget | **6 €/giorno** | la nicchia è piccola: probabilmente non li spenderà tutti |
| Rotazione annunci | Ottimizza | |
| Date | solo inizio | |
| Pianificazione | nessuna per i primi 30 giorni | |
| Suffisso URL finale (in "Opzioni URL campagna") | `utm_source=google&utm_medium=cpc&utm_campaign=search-preparatori&utm_term={keyword}&utm_content={adgroupid}` | così PostHog vede quale keyword ha portato la registrazione |
| Espansione annunci / "Broad match" / raccomandazioni automatiche | **tutto disattivato** | vedi B6 |

### B3. Gruppi di annunci e keyword

Quattro gruppi. Keyword e URL finale sono in `04-keyword-da-incollare.txt` (da incollare nell'interfaccia) o nei CSV `01`-`03` (per Google Ads Editor, se preferisci).

| Gruppo | Landing | CPC max iniziale |
|---|---|---|
| Software e app portieri | `/lp/software-portieri` | 1,50 € |
| Programmazione allenamenti | `/lp/allenamenti-portieri` | 1,00 € |
| Valutazione e statistiche | `/lp/valutazione-portieri` | 1,20 € |
| Brand GKSeason | `/` (home) | 0,50 € |

Ogni keyword è inserita **due volte**: esatta `[...]` e a frase `"..."`. Mai corrispondenza generica (senza simboli): su "portieri" Google la allargherebbe a custodi, guanti e Serie A.

Il gruppo Brand serve a non lasciare che altri comprino il tuo nome e a vedere quante persone ti cercano per nome dopo aver visto i reel.

### B4. Parole chiave escluse

In **Campagna → Parole chiave → Parole chiave escluse → + → Aggiungi parole chiave escluse** (livello campagna, non gruppo): incolla il blocco "escluse" di `04-keyword-da-incollare.txt`. Sono 73 termini: lavoro e portinerie, guanti e maglie, FIFA e fantacalcio, Serie A e nomi dei portieri famosi, corsi e patentini, altri sport. "Portiere" in italiano vale anche custode: senza queste esclusioni metà dei clic sarebbe gente che cerca un portiere di notte per un hotel.

### B5. Annunci

Un annuncio adattabile per gruppo, 15 titoli e 4 descrizioni (in `04-keyword-da-incollare.txt`, con i caratteri già contati).

- Il **primo titolo** di ogni gruppo va **bloccato in posizione 1** (icona spilla accanto al titolo → "Mostra in posizione 1"): è quello che ripete la ricerca. Gli altri lasciali liberi.
- Percorso visualizzato: `gkseason.it/preparatori/portieri` ecc. (indicato nel file).
- Efficacia annuncio: punta a "Buona"; "Eccellente" chiede di ripetere le keyword nei titoli e non vale la pena.

**Asset** (ex estensioni), a livello campagna — contano per il punteggio di qualità e occupano più spazio:
- Sitelink (4): `Prova la demo` → `https://www.gkseason.it/d` · `Registrati gratis` → `/registrati?ruolo=allenatore` · `Domande frequenti` → `/domande-frequenti` · `Prezzi` → `/#prezzi`
- Callout: `Gratis senza carta` · `Da smartphone e PC` · `Fatto da un preparatore` · `Dati esportabili` · `Demo senza registrazione`
- Snippet strutturati, intestazione "Funzionalità": `Calendario allenamenti`, `Valutazioni`, `Statistiche`, `Libreria esercizi`, `Report PDF`, `Obiettivi portiere`

### B6. Cose da spegnere prima di pubblicare

- **Strumenti → Consigli → Applicazione automatica**: disattiva tutto. Altrimenti Google, da solo, aggiunge keyword generiche, allarga le corrispondenze e attiva il display.
- Nelle impostazioni campagna: **"Corrispondenza generica"** (se compare come interruttore della campagna) → OFF.
- Non attivare "Ottimizzazione del testo dell'annuncio" automatica se proposta.

---

## C. Dopo la pubblicazione

**Giorni 1-3** — controlla solo che spenda e che gli annunci siano "Idonei" (non "In revisione" da più di 2 giorni, non "Rifiutato").

**Ogni 3-4 giorni, per il primo mese** — **Campagna → Parole chiave → Termini di ricerca**: è la lista di cosa ha digitato davvero chi ha cliccato. Tutto ciò che non è un preparatore di portieri → *Aggiungi come parola chiave esclusa*. Questa è l'attività che fa la differenza tra una campagna che butta via soldi e una che funziona: 10 minuti ogni volta.

**Dopo 14 giorni** — guarda per gruppo: clic, CTR, costo per clic, conversioni (Registrazione e Demo aperta sono due colonne separate). Spegni le keyword con più di 15 clic e zero demo/registrazioni. Alza il CPC max delle keyword che convertono.

**Dopo 15-20 conversioni "Registrazione" in 30 giorni** — passa l'offerta a **Massimizza le conversioni** (senza CPA target per le prime 2 settimane, poi CPA target = costo medio osservato). Prima di quella soglia non ha senso: l'algoritmo non ha dati.

**Cosa aspettarsi, onestamente.** Queste ricerche in Italia sono poche: qualche centinaio al mese in tutto, concentrate ad agosto-settembre e gennaio. Probabile scenario: 1-4 clic al giorno, 20-60 € spesi al mese, CPC 0,40-1,20 €. Ma ogni clic è una persona che stava cercando esattamente GKSeason. Se i volumi sono troppo bassi, non alzare il budget: allarga le keyword con i termini che vedi nei "Termini di ricerca", non con la corrispondenza generica.

---

## D. Passo successivo (non ora): Demand Gen con segmento personalizzato

Quando Search gira da un mese, c'è un secondo modo per raggiungere "solo chi ha quell'interesse" su Google: una campagna **Demand Gen** (YouTube, Discover, Gmail) con un **segmento personalizzato** del tipo *"persone che hanno cercato su Google: preparatore dei portieri, allenamento portieri, esercizi portieri, scuola portieri, valutazione portieri"*. Google mostra i tuoi reel a chi ha fatto quelle ricerche negli ultimi giorni. È l'unico targeting per interesse davvero stretto che esista per questa nicchia, e serve un video verticale di 15-30 secondi (gli stessi reel della campagna Meta). Se ne riparla con i dati di Search.
