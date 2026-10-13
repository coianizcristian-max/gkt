# Campagna Meta — solo preparatori dei portieri

## Prima di tutto: perché le campagne precedenti hanno portato poco

Nel video del pubblico di settembre c'erano: Italia, età 23+, lingua italiana, **nessun pubblico personalizzato, nessun interesse, espansione Advantage+ attiva**. Pubblico stimato 22-26 milioni di persone. Le 11.000 persone raggiunte erano italiani qualsiasi: per questo arrivavano visite a 0,11 € e quasi nessuna registrazione. La struttura era giusta (demo, evento DemoAperta, UTM), ma i pubblici non erano mai stati collegati al gruppo di inserzioni.

Su Meta **non esiste un interesse "preparatore dei portieri"**. "Calcio", "Portiere (calcio)", "Allenatore" sono tifosi, giocatori e genitori: milioni di persone, pochissimi preparatori. Quindi il pubblico non lo scegli da una lista: **lo costruisci**, in tre modi, e la campagna gira solo su quelli:

1. **Chi ha già toccato GKSeason**: visitatori del sito, chi ha aperto la demo, chi ha interagito con i tuoi profili, chi ha guardato i tuoi video.
2. **Chi si seleziona da solo**: pubblichi un reel che interessa *solo* a un preparatore (non a un tifoso, non a un genitore) e poi mostri l'annuncio di registrazione a chi l'ha guardato almeno a metà.
3. **Chi assomiglia a loro** (pubblico simile): Meta cerca in Italia persone con lo stesso profilo di quelle dei punti 1 e 2.

Nessuno di questi tre usa gli interessi. Gli interessi li usi in un solo punto: per far vedere il reel del punto 2 a un pubblico un po' più largo del tuo, a basso costo.

### I numeri reali da cui parti (PostHog, 13 ottobre 2026, solo chi ha accettato i cookie)

| Dato | Valore |
|---|---|
| Visitatori unici del sito, ultimi 30 giorni | 208 |
| Visitatori unici, ultimi 180 giorni | ~400 |
| Demo aperte da ospiti (evento DemoAperta), ultimi 30 giorni | 18 |
| Registrazioni, ultimi 30 giorni / 90 giorni | 41 / 145 |
| Registrazioni arrivate da Meta, 9-23 settembre (campagna "weekend-demo") | 30 su 71 visitatori (42%) |

Cosa vuol dire: i pubblici "caldi" sono **piccoli** (poche centinaia di persone). Meta li mostra come "Inferiore a 1.000" e ci spende poco. È normale, è il prezzo del "solo chi ha quell'interesse". Il reel di auto-selezione serve proprio a far crescere questo bacino. E il 42% di conversione della demo dice che quando la persona è giusta, la demo la converte.

### Una cosa da NON fare: caricare la lista degli utenti su Meta

La tua informativa privacy dice "i dati non vengono venduti né ceduti a terzi per finalità di marketing" e Meta non è tra i destinatari elencati. Caricare le email degli iscritti come "pubblico personalizzato da elenco clienti" (anche per escluderli o per il pubblico simile) contraddirebbe quella frase. Tutto quello che segue usa **solo il Pixel e le interazioni sui tuoi profili**, che sono già coperti dal consenso cookie e dalle condizioni Meta. Se un giorno vorrai usare l'elenco clienti, prima va aggiornata l'informativa e raccolto un consenso marketing esplicito.

---

## Fase 0 — Verifiche in Gestione eventi (15 minuti, PC)

Business Suite → **Tutti gli strumenti → Gestione eventi** → il Pixel `1029177192853278` (GKSeason).

1. **Eventi in arrivo.** Nella scheda "Panoramica" devi vedere, negli ultimi 7 giorni: `PageView`, `Lead`, `CompleteRegistration` e l'evento personalizzato `DemoAperta`. Se `DemoAperta` manca: apri `https://www.gkseason.it/d` in una finestra in incognito, accetta i cookie, aspetta 2 minuti e ricontrolla. (Ricorda: il Pixel parte solo dopo l'accettazione dei cookie, quindi i numeri di Meta sono sempre un po' sotto quelli reali.)
2. **Conversione personalizzata "Demo aperta".** Gli eventi personalizzati non si possono scegliere direttamente come obiettivo della campagna: vanno "impacchettati" in una conversione personalizzata.
   - Gestione eventi → **Conversioni personalizzate** → **Crea conversione personalizzata**
   - Origine dati: il Pixel GKSeason
   - Evento: **DemoAperta** (nel menu "Evento" scegli quello personalizzato, non "Tutto il traffico URL")
   - Nessuna regola aggiuntiva sull'URL
   - Nome: `Demo aperta` — Categoria: *Altro* — Valore: nessuno
   - Crea. Se compare "0 eventi" è perché aspetta i prossimi: va bene.
3. **Dominio verificato.** Impostazioni aziendali → Sicurezza del brand → Domini → `gkseason.it` deve avere il segno di spunta verde. Il meta tag di verifica è già nel sito; se risultasse "non verificato" basta premere "Verifica".

---

## Fase 1 — Creare i pubblici (30 minuti, PC). Falli oggi: si riempiono nei giorni.

Gestione inserzioni → menu ☰ → **Pubblici** → **Crea pubblico → Pubblico personalizzato**.

Nomi esatti da usare (così poi li ritrovi):

| # | Nome del pubblico | Tipo | Impostazioni |
|---|---|---|---|
| 1 | `Sito - visitatori 180gg` | Sito web → Pixel GKSeason | "Tutti i visitatori del sito web", conservazione **180** giorni |
| 2 | `Sito - Demo aperta 180gg` | Sito web → Pixel GKSeason | "Dagli eventi" → **DemoAperta**, 180 giorni |
| 3 | `Sito - Registrati 180gg` | Sito web → Pixel GKSeason | "Dagli eventi" → **CompleteRegistration**, 180 giorni |
| 4 | `Sito - Login 180gg` | Sito web → Pixel GKSeason | "Persone che hanno visitato pagine web specifiche" → URL **contiene** `/login`, 180 giorni |
| 5 | `IG - interazioni 365gg` | Account Instagram → il profilo GKSeason | "Tutti quelli che hanno interagito con questo account professionale", 365 giorni |
| 6 | `FB - interazioni 365gg` | Pagina Facebook → la Pagina GKSeason | "Tutti quelli che hanno interagito con la tua Pagina", 365 giorni |
| 7 | `Video - 50% reel portieri` | Video | "Persone che hanno guardato almeno il 50% del video" → **Scegli video** → seleziona **solo** i reel/video che parlano di allenamento dei portieri (tutti quelli pubblicati, FB e IG, e in futuro il reel della Fase 2). 365 giorni |

I pubblici 3 e 4 servono a **escludere** chi è già utente (non ha senso pagare per mostrare "registrati" a chi è già registrato). Il 4 prende chi ha fatto login almeno una volta, anche se registrato prima che il Pixel esistesse.

Se il profilo Instagram è personale (non "professionale/creator"), il pubblico 5 non si può creare: converti il profilo (Impostazioni → Tipo di account), è gratis e non cambia nulla per i follower.

**Pubblico simile** (Crea pubblico → **Pubblico simile**):

| # | Nome | Origine | Località | Dimensione |
|---|---|---|---|---|
| 8 | `LAL 1% IT - video 50%` | pubblico 7 | Italia | **1%** (non di più: più alto = più generico) |

Meta accetta un'origine solo se ha **almeno 100 persone dello stesso Paese**. Se il pubblico 7 oggi è troppo piccolo, Meta lo dice: crea allora il simile da `Sito - visitatori 180gg` e chiamalo `LAL 1% IT - sito`, poi rifallo dal video tra 10-15 giorni (dopo la Fase 2). Quando `Sito - Registrati 180gg` supererà le 100 persone, crea `LAL 1% IT - registrati`: è l'origine migliore di tutte (persone che si sono registrate davvero) e da lì in poi usa quello.

---

## Fase 2 — Il reel di auto-selezione (10 giorni, 5 €/giorno = 50 €)

Questa è la parte che fa la differenza. Serve un video che **solo un preparatore dei portieri guarda fino in fondo**. Non un video sulla tecnica del portiere (lo guardano i ragazzi e i genitori), ma un video sul **lavoro del preparatore**: come programma, come valuta, come si organizza. Chi lo guarda a metà si è selezionato da solo.

### Tre reel da registrare (15-30 secondi, verticali 9:16, col telefono, parlato in camera o con voce sopra lo schermo)

**Reel A — "Come programmo il mese"**
Hook (primi 2 secondi, testo in sovrimpressione): *"Come programmo ottobre per i miei portieri Under 15"*
Contenuto: schermo del calendario GKSeason, voce: "Due sedute a settimana, martedì presa e posizionamento, giovedì piedi e costruzione. Le ricorrenze le imposto una volta a settembre e il calendario della stagione è fatto. Ogni seduta ha i suoi esercizi dalla mia libreria. A fine allenamento, presenze e voti dal telefono prima di uscire dal campo."
Chiusura: *"Se alleni portieri e vuoi provarla, è gratis: link in bio / Scopri di più."*

**Reel B — "La scheda che uso per valutare"**
Hook: *"La scheda con cui valuto i miei portieri dopo ogni allenamento"*
Contenuto: schermo della valutazione (voto, parametri: presa, uscite alte, piedi, 1 contro 1), poi la scheda del portiere con media e andamento. Voce: "Trenta secondi a portiere. A fine mese ho l'andamento di ciascuno, il confronto tra i portieri della categoria e il report PDF da portare in società. Niente più fogli Excel e voti nelle chat."

**Reel C — "Tre cose che ho smesso di fare"**
Hook: *"Tre cose che ho smesso di fare da quando uso un gestionale per i portieri"*
Contenuto: parlato in camera. "Uno: cercare i voti del mese scorso nelle foto del telefono. Due: riscrivere il calendario ogni volta che cambia l'orario del campo. Tre: arrivare a fine stagione senza sapere cosa dire al genitore del portiere che non gioca." Chiusura come sopra.

Regole: niente musica alta, sottotitoli sempre (la maggior parte guarda senza audio), il logo GKSeason solo alla fine, nessuna frase da startup. Tono: un preparatore che parla a un altro preparatore.

Pubblica i tre reel **anche in organico** sul tuo profilo (5.000 follower) e sulla Pagina, e condividili nei gruppi Facebook dei preparatori dei portieri: le visualizzazioni organiche entrano nel pubblico 7 esattamente come quelle a pagamento, gratis.

### La campagna "semina"

Gestione inserzioni → **+ Crea** → obiettivo **Interazione** → se chiede, **Configurazione manuale** (non la versione Advantage+).

**Campagna**
- Nome: `Semina - reel preparatori`
- Advantage+ budget della campagna: **OFF**
- Categoria di inserzione speciale: nessuna

**Gruppo di inserzioni**
- Nome: `Semina - interessi calcio IT`
- Luogo della conversione: **Sull'inserzione** (o "Visualizzazioni del video" se compare) → obiettivo di performance **Massimizza le visualizzazioni ThruPlay**
- Budget: **5 €/giorno**, data di fine dopo **10 giorni**
- Pubblico → se compare "Pubblico Advantage+", clicca **Passa alle opzioni pubblico originali**
  - Località: Italia
  - Età: **22-60**
  - Lingua: Italiano
  - Targeting dettagliato: cerca e aggiungi gli interessi che compaiono tra questi: `Allenatore di calcio`, `Portiere (calcio)`, `Scuola calcio`, `Settore giovanile`, `FIGC`, `Coaching sportivo`, `UEFA Coaching`. Ne bastano 4-5. Qui gli interessi vanno bene: paghi visualizzazioni a pochi centesimi e **il video fa la selezione**, non l'interesse.
  - **Escludi** pubblici personalizzati: `Sito - Registrati 180gg`, `Sito - Login 180gg` (gli utenti li hai già)
  - **Advantage targeting dettagliato / espansione: OFF** (spunta da togliere)
- Posizionamenti: **Posizionamenti manuali** → lascia solo **Reels di Instagram, Reels di Facebook, Feed di Instagram, Feed di Facebook**. Togli Stories, Audience Network, Messenger, In-stream, Risultati di ricerca, Marketplace, Explore.

**Inserzioni**: tre inserzioni, una per reel (A, B, C), formato 9:16. Testo principale breve: *"Come lavoro con i miei portieri durante la settimana. Se alleni portieri, GKSeason è gratis."* Pulsante: **Scopri di più** → `https://www.gkseason.it/d` con i parametri URL (campo "Parametri URL" in fondo all'inserzione):
```
utm_source=meta&utm_medium=cpc&utm_campaign=semina-reel&utm_content={{ad.name}}
```
Le parentesi graffe le compila Meta con il nome dell'inserzione: su PostHog vedrai quale reel ha portato gente.

Dopo 10 giorni: spegni la campagna. Guarda in Pubblici quanto è cresciuto `Video - 50% reel portieri`. Se è sopra le **500 persone**, la Fase 3 ha abbastanza materiale. Il reel che ha avuto più "ThruPlay" e più visualizzazioni al 50% è quello da riusare come inserzione in Fase 3.

---

## Fase 3 — La campagna di registrazione (conversioni su "Demo aperta")

Parte quando: pubblici creati da almeno 7 giorni, reel seminato da 10 giorni, conversione personalizzata "Demo aperta" esistente. Prima no.

Gestione inserzioni → **+ Crea** → obiettivo **Vendite** → **Configurazione manuale della campagna di vendita** (non "Campagna di vendita Advantage+").

### Campagna
- Nome: `Registrazioni - preparatori portieri`
- Advantage+ budget della campagna: **OFF** (il budget lo dai ai singoli gruppi, altrimenti Meta lo sposta tutto sul pubblico più largo e il retargeting non parte)
- Nessuna categoria speciale

### Gruppo di inserzioni 1 — `Retargeting caldo`
- Luogo della conversione: **Sito web**
- Set di dati / Pixel: GKSeason
- **Evento di conversione: `Demo aperta`** (la conversione personalizzata; NON "Lead", NON "CompleteRegistration", NON "Visualizzazione pagina di destinazione"). Perché: la registrazione è troppo rara per far imparare l'algoritmo, la demo aperta ha volume e indica intenzione.
- Obiettivo di performance: **Massimizza il numero di conversioni**
- Finestra di attribuzione: 7 giorni clic, 1 giorno visualizzazione
- Budget: **5 €/giorno**, nessuna data di fine
- Pubblico → **Passa alle opzioni pubblico originali**
  - Pubblici personalizzati: `Video - 50% reel portieri`, `Sito - visitatori 180gg`, `Sito - Demo aperta 180gg`, `IG - interazioni 365gg`, `FB - interazioni 365gg`
  - **Escludi**: `Sito - Registrati 180gg`, `Sito - Login 180gg`
  - Località: Italia. Età: 22-65. Lingua: italiano. Nessun interesse.
  - Spunta **"Pubblico personalizzato Advantage"** (espansione): **TOGLIERE**. È l'impostazione che a settembre ha trasformato un retargeting in "tutta Italia".
- Posizionamenti: **manuali**: Reels IG, Reels FB, Feed IG, Feed FB. Tutto il resto spento.

### Gruppo di inserzioni 2 — `Simile 1% video`
- Identico al gruppo 1 tranne:
  - Pubblici personalizzati: solo `LAL 1% IT - video 50%` (o `LAL 1% IT - sito` se il primo non si è potuto creare)
  - **Escludi**: `Sito - Registrati 180gg`, `Sito - Login 180gg` e anche tutti i pubblici caldi del gruppo 1 (così i due gruppi non si fanno concorrenza sulle stesse persone)
  - Budget: **4 €/giorno**
  - "Pubblico simile Advantage" (espansione): **TOGLIERE**

Totale: **9 €/giorno**, circa 270 € al mese se spende tutto. Il gruppo 1 probabilmente non li spenderà: il pubblico è piccolo. Va bene così.

### Inserzioni (le stesse in entrambi i gruppi, 3 per gruppo)

1. **Il reel vincente della Fase 2** (quello con più ThruPlay), riusato tale e quale (scegli "Usa post esistente" per tenere like e commenti).
2. **Registrazione dello schermo della demo**, 20 secondi: dal telefono, apri `gkseason.it/d`, scorri calendario, apri una seduta, apri la scheda di un portiere. Senza parlato, con tre scritte: "Calendario fatto a settembre" → "Voti dopo ogni seduta" → "Scheda e statistiche di ogni portiere". Chiusura: "Provala senza registrarti".
3. **Immagine statica 1:1** o 4:5: la scheda di un portiere (screenshot pulito) con sopra la frase *"Valuta i tuoi portieri in 30 secondi. Gratis."*

Testi (testo principale: le prime due righe sono quelle che si vedono, il resto sta sotto "Altro"):

- Variante 1: *"Allenamenti, valutazioni e statistiche dei tuoi portieri in un'unica app. L'ha fatta un preparatore dei portieri, è gratis e la provi senza registrarti."*
- Variante 2: *"Quanti voti hai perso quest'anno perché erano in una chat o in una foto? GKSeason tiene calendario, voti e statistiche dei portieri in un posto solo. Gratis, da telefono."*
- Variante 3 (solo retargeting): *"Hai già dato un'occhiata a GKSeason. La demo è aperta: una stagione vera con portieri, sedute e voti, senza registrarti."*

Titolo (max 40 caratteri): `Il gestionale per chi allena i portieri` · Descrizione: `Gratis, senza carta di credito` · Pulsante: **Scopri di più** (non "Iscriviti": porta alla demo, non al modulo)

**URL di destinazione**: `https://www.gkseason.it/d` — **sempre la demo**, non la home né /registrati: a settembre la demo ha convertito il 42% dei visitatori da Meta.

**Parametri URL** (campo in fondo, uguale per tutte le inserzioni):
```
utm_source=meta&utm_medium=cpc&utm_campaign=registrazioni-preparatori&utm_content={{adset.name}}-{{ad.name}}
```

### Prima di premere Pubblica — la lista di controllo di settembre

Questi sono i punti che a settembre erano rimasti da fare. Controllali uno per uno nel riepilogo del gruppo di inserzioni:

- [ ] Evento di conversione = **Demo aperta** (conversione personalizzata)
- [ ] Nella sezione Pubblico compaiono i **nomi dei pubblici personalizzati** (non solo "Italia, 23+")
- [ ] Le **esclusioni** compaiono (Registrati, Login)
- [ ] Espansione "Pubblico personalizzato Advantage" / "Pubblico simile Advantage": **nessuna spunta**
- [ ] "Pubblico Advantage+": **non attivo** (si legge "Opzioni pubblico originali")
- [ ] Posizionamenti: **manuali**, solo Reels e Feed
- [ ] Advantage+ budget campagna: **OFF**
- [ ] Dimensione pubblico stimata del gruppo 1: deve dire **"Inferiore a 1.000"** o qualche migliaio. Se dice milioni, un'espansione è rimasta accesa.
- [ ] Parametri URL presenti su ogni inserzione
- [ ] Anteprima: l'inserzione NON compare nelle Storie né in Audience Network

Poi Pubblica. E **per 7 giorni non toccare niente**: ogni modifica a pubblico, budget o inserzioni riporta il gruppo in fase di apprendimento. L'etichetta "Apprendimento limitato" comparirà quasi sicuramente (servono 50 conversioni a settimana per uscirne, non le avrai): ignorala, consegna lo stesso.

---

## Fase 4 — Leggere i risultati

Due posti: **Gestione inserzioni** (costi) e la dashboard PostHog **"Campagna Meta"** (cosa fanno le persone dopo il clic): https://eu.posthog.com/project/207126/dashboard/961649

In Gestione inserzioni imposta le colonne (Colonne → Personalizza): Importo speso, Copertura, Frequenza, Clic sul link, CPC, **Risultati** (= Demo aperte), **Costo per risultato**, e aggiungi la colonna **CompleteRegistration** (Registrazioni completate sul sito).

| Metrica | Buono | Da sistemare |
|---|---|---|
| Costo per Demo aperta | sotto 2 € | sopra 4 €: rivedi inserzione o pubblico |
| Costo per registrazione | sotto 8 € (settembre: 1,42 € sul pubblico caldo) | sopra 15 € |
| Frequenza (gruppo retargeting) a 7 giorni | sotto 4 | sopra 6: il pubblico è saturo, metti in pausa 2 settimane o cambia creatività |
| Registrazioni / Demo aperte (PostHog) | sopra il 25% | sotto il 10%: chi entra non è un preparatore |

**Dopo 14 giorni**, decisioni:
- Gruppo 1 spende poco e converte: normale, è piccolo. Lascialo. Ogni reel nuovo in organico lo ingrandisce.
- Gruppo 2 (simile) spende tutto e non converte: la fonte del simile non era buona. Ricrea il simile da `Sito - Registrati 180gg` appena supera 100 persone, o da `Sito - Demo aperta 180gg`.
- Un'inserzione ha costo per risultato doppio delle altre: spegni quella, non il gruppo.
- Vuoi spendere di più: alza del 20% ogni 3-4 giorni, mai di colpo (riparte l'apprendimento).

**Ogni 3-4 settimane**: un reel nuovo in organico + 5 €/giorno per 5 giorni in "semina". È il motore: ingrandisce il pubblico 7 e rinfresca le creatività del retargeting.

---

## Riassunto in una pagina

1. Gestione eventi: controlla DemoAperta, crea la conversione personalizzata **Demo aperta**.
2. Pubblici: crea i 7 personalizzati + il simile 1%. Oggi.
3. Registra 3 reel sul **lavoro del preparatore**; pubblicali in organico e nei gruppi; campagna **Interazione** 5 €/giorno × 10 giorni, Reels+Feed, interessi calcio, esclusi gli utenti.
4. Dopo 10 giorni: campagna **Vendite** → conversione **Demo aperta** → 2 gruppi (retargeting caldo 5 €, simile 1% 4 €) → **opzioni pubblico originali, espansioni spente, posizionamenti manuali Reels+Feed, budget per gruppo**, destinazione `gkseason.it/d` con UTM.
5. 7 giorni senza toccare. Poi leggi costo per Demo aperta e registrazioni su PostHog.
6. Ogni 3-4 settimane un reel nuovo.
7. Mai: Advantage+ pubblico, posizionamenti automatici, obiettivo Traffico, "metti in evidenza il post", lista clienti caricata su Meta.
