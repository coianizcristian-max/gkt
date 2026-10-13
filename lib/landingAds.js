/**
 * Contenuti delle landing degli annunci (gkseason.it/lp/<slug>).
 *
 * Una landing per gruppo di annunci Google: il titolo ripete quello che la
 * persona ha appena cercato, cosi' il clic "atterra" su quello che si
 * aspettava. Solo italiano: le campagne girano in Italia, in italiano.
 *
 * Per cambiare un testo modifica qui e basta. Per aggiungere una landing
 * aggiungi una voce con un nuovo slug: la pagina e' la stessa per tutte.
 *
 * Le immagini sono screenshot veri dell'app (stagione demo, da telefono),
 * in public/lp/*.webp (750x1300). Per sostituirne una basta rimpiazzare il
 * file con lo stesso nome; per aggiungerne, aggiungi una voce a SCHERMATE.
 */

/** Schermate disponibili: chiave -> file + testo alternativo. */
export const SCHERMATE = {
  dashboard: { src: '/lp/dashboard.webp', alt: 'Dashboard di GKSeason: prossimo allenamento, partite della settimana e allenamenti da valutare' },
  calendarioMese: { src: '/lp/calendario-mese.webp', alt: 'Calendario mensile con gli allenamenti di tutte le categorie' },
  calendarioEventi: { src: '/lp/calendario-eventi.webp', alt: 'Prossimi allenamenti con lo stato "da valutare"' },
  statistichePortiere: { src: '/lp/statistiche-portiere.webp', alt: 'Statistiche del portiere: media voto, presenze, clean sheet, indice di crescita' },
  andamento: { src: '/lp/andamento.webp', alt: 'Andamento mensile dei voti del portiere' },
  statisticheSquadra: { src: '/lp/statistiche-squadra.webp', alt: 'Confronto tra i portieri della stagione' },
  esercizi: { src: '/lp/esercizi.webp', alt: 'Libreria esercizi personale divisa per categorie' },
}

/** Blocchi del "tour" dentro l'app: li riusano tutte le landing, in ordine diverso. */
export const TOUR = {
  calendario: {
    schermata: 'calendarioMese',
    titolo: 'Il calendario della stagione si genera da solo',
    testo: 'Imposti giorni, orari e categorie una volta (le ricorrenze) e tutta la stagione compare nel calendario, colorata per categoria. Sposti o annulli una seduta senza toccare il resto. Allenamenti e partite nello stesso posto.',
    punti: ['Ricorrenze per categoria', 'Vista mese e prossimi eventi', 'Partite con presenze e risultato'],
  },
  valutazione: {
    schermata: 'statistichePortiere',
    titolo: 'Ogni portiere ha la sua scheda, con i numeri che contano',
    testo: 'Voto dopo ogni seduta e dopo ogni partita, presenze, disponibilità, clean sheet, gol subiti. La media si aggiorna da sola e l\'indice di crescita ti dice a colpo d\'occhio chi sta migliorando e chi no.',
    punti: ['Voti in 30 secondi dallo spogliatoio', 'Parametri scelti da te', 'Obiettivi e infortuni nella stessa scheda'],
  },
  andamento: {
    schermata: 'andamento',
    titolo: 'L\'andamento mese per mese, pronto da mostrare',
    testo: 'Media voto, presenze, voto partita, gol subiti e clean sheet mese per mese. È la pagina che apri davanti al portiere, al genitore o al direttore sportivo: parla da sola.',
    punti: ['Grafico mensile o progressivo', 'Tabella esportabile', 'Report PDF della stagione'],
  },
  confronto: {
    schermata: 'statisticheSquadra',
    titolo: 'Confronta i portieri della stessa categoria',
    testo: 'Presenze, media voto, partite giocate: tutti i portieri della stagione sullo stesso grafico, filtrabili per categoria. Decidi chi gioca con i dati, non a memoria.',
    punti: ['Confronto per categoria', 'Presenze per mese', 'Statistiche squadra in PDF'],
  },
  esercizi: {
    schermata: 'esercizi',
    titolo: 'La tua libreria di esercizi, con la lavagna',
    testo: 'Ogni esercizio con obiettivo, materiale, durata e lo schema disegnato sulla lavagna tattica. Lo aggiungi alla seduta, lo riusi nelle sedute tipo e lo stampi in PDF per il campo.',
    punti: ['Categorie e tag tuoi', 'Lavagna per disegnare lo schema', 'Sedute tipo da richiamare in un clic'],
  },
  dashboard: {
    schermata: 'dashboard',
    titolo: 'Apri l\'app e sai subito cosa fare',
    testo: 'Prossimo allenamento, partite della settimana, sedute ancora da valutare e portieri da tenere d\'occhio. La dashboard è la tua lista di cose da fare, aggiornata da sola.',
    punti: ['Sedute da valutare in evidenza', 'Portieri con obiettivi in ritardo', 'Tutto da telefono, anche a bordo campo'],
  },
}

export const LANDING = {
  'software-portieri': {
    titoloPagina: 'Software per preparatori dei portieri',
    descrizione: 'Il gestionale fatto solo per chi allena i portieri: allenamenti, valutazioni, statistiche ed esercizi in un\'unica app. Gratis, da PC e smartphone.',
    sopratitolo: 'Software per preparatori dei portieri',
    titolo: 'Il gestionale fatto solo per chi allena i portieri',
    lead: 'Allenamenti, valutazioni, statistiche e libreria esercizi in un\'unica app. Niente fogli Excel, niente voti persi nelle chat. Gratis, da PC e da telefono.',
    heroSchermata: 'dashboard',
    heroSchermata2: 'statistichePortiere',
    tour: ['calendario', 'valutazione', 'confronto', 'esercizi', 'andamento'],
    faq: [
      { d: 'È davvero gratis?', r: 'Sì. Ti registri senza carta di credito e usi subito le funzioni base. Le funzioni avanzate (obiettivi, statistiche di dettaglio, ricorrenze automatiche) le provi gratis per un periodo e poi decidi tu se tenerle.' },
      { d: 'Devo installare qualcosa?', r: 'No. Funziona dal browser, su PC e telefono. Dal telefono puoi aggiungerla alla schermata home e si apre come un\'app.' },
      { d: 'I dati dei portieri chi li vede?', r: 'Solo tu e le persone che inviti (collaboratori, portieri). Nessun profilo è pubblico se non lo decidi tu, e puoi esportare tutto in CSV o PDF quando vuoi.' },
      { d: 'Seguo più categorie e più società: va bene?', r: 'Sì. Una stagione può contenere più squadre e categorie, e puoi avere più stagioni in archivio. Se cambi società, i tuoi dati restano tuoi.' },
    ],
  },

  'allenamenti-portieri': {
    titoloPagina: 'Programmazione allenamenti portieri',
    descrizione: 'Programma la stagione dei tuoi portieri: calendario automatico, sedute con esercizi dalla tua libreria, lavagna tattica e report PDF. Gratis.',
    sopratitolo: 'Programmazione allenamenti portieri',
    titolo: 'Programma la stagione dei tuoi portieri in un pomeriggio',
    lead: 'Calendario che si genera da solo, sedute con gli esercizi della tua libreria, lavagna per disegnare lo schema e report PDF della seduta. Tutto in ordine prima del primo allenamento.',
    heroSchermata: 'calendarioMese',
    heroSchermata2: 'esercizi',
    tour: ['esercizi', 'dashboard', 'valutazione', 'andamento', 'confronto'],
    faq: [
      { d: 'Posso usare i miei esercizi, non quelli preimpostati?', r: 'Sì, la libreria è tua: la riempi con i tuoi esercizi, con le tue categorie e i tuoi tag. Non c\'è un catalogo imposto.' },
      { d: 'Se salta un allenamento o cambia orario?', r: 'Lo sposti o lo annulli dal calendario, senza toccare il resto della stagione. Le presenze e le valutazioni restano legate alla seduta giusta.' },
      { d: 'Lo uso dal campo, col telefono?', r: 'Sì. La seduta del giorno si apre dal telefono con esercizi e schema, e dallo stesso punto registri presenze e voti a fine allenamento.' },
      { d: 'È davvero gratis?', r: 'Sì. Ti registri senza carta di credito e usi subito calendario, esercizi e valutazioni. Le funzioni avanzate le provi gratis per un periodo e poi decidi tu.' },
    ],
  },

  'valutazione-portieri': {
    titoloPagina: 'Valutazione e statistiche dei portieri',
    descrizione: 'Valuta ogni portiere dopo allenamenti e partite: voti, media, andamento, clean sheet e percorso di crescita. Report PDF per portiere e società. Gratis.',
    sopratitolo: 'Valutazione e statistiche dei portieri',
    titolo: 'Valuta ogni portiere in 30 secondi. Le statistiche si fanno da sole.',
    lead: 'Voti per allenamento e partita, media, andamento nel tempo, clean sheet e confronto tra portieri della stessa categoria. Un percorso di crescita da mostrare al portiere, alla famiglia e alla società.',
    heroSchermata: 'statistichePortiere',
    heroSchermata2: 'andamento',
    tour: ['andamento', 'confronto', 'valutazione', 'calendario', 'esercizi'],
    faq: [
      { d: 'Posso valutare anche le partite, non solo gli allenamenti?', r: 'Sì. Le partite hanno la loro valutazione, con minuti, gol subiti e clean sheet, e contano nelle statistiche insieme agli allenamenti.' },
      { d: 'Il portiere vede i suoi voti?', r: 'Solo se lo inviti. Può vedere il suo percorso, i suoi obiettivi e lasciarti un feedback sulla seduta. Decidi tu cosa condividere.' },
      { d: 'Posso cambiare i parametri a stagione iniziata?', r: 'Sì. Puoi aggiungere o rinominare parametri quando vuoi; le valutazioni già fatte restano com\'erano.' },
      { d: 'È davvero gratis?', r: 'Sì. Ti registri senza carta di credito e valuti subito. Le statistiche di dettaglio e il percorso di crescita li provi gratis per un periodo e poi decidi tu.' },
    ],
  },
}

export const SLUGS = Object.keys(LANDING)

/** Sezione "come funziona": uguale per tutte le landing. */
export const PASSI = [
  { titolo: 'Crea l\'account', testo: 'Nome, email e password. Niente carta di credito, nessuna installazione.' },
  { titolo: 'Imposta stagione e portieri', testo: 'Società, categorie, portieri e giorni di allenamento. Dieci minuti, una volta sola.' },
  { titolo: 'Allena e valuta', testo: 'Dopo ogni seduta registri presenze e voti dal telefono. Statistiche e report arrivano da soli.' },
]

/** Prima / dopo: il nemico e' il caos, non "un altro gestionale". */
export const PRIMA_DOPO = [
  { prima: 'I voti sono in una chat, in una foto, su un foglio nel borsone', dopo: 'Ogni voto è nella scheda del portiere, con data e seduta' },
  { prima: 'Il calendario lo riscrivi ogni volta che cambia l\'orario del campo', dopo: 'Lo imposti una volta e sposti solo la seduta che cambia' },
  { prima: 'A fine stagione non sai cosa dire al genitore del portiere che gioca meno', dopo: 'Apri l\'andamento e il report PDF: i numeri parlano per te' },
  { prima: 'Gli esercizi buoni li ricordi a memoria, finché non li dimentichi', dopo: 'Sono nella tua libreria con lo schema disegnato, pronti per la prossima seduta' },
]

/** Per chi e'. */
export const PER_CHI = [
  { titolo: 'Settore giovanile', testo: 'Più categorie, più portieri, due sedute a settimana per ciascuna. Il calendario e le valutazioni tengono tutto in ordine.' },
  { titolo: 'Scuola portieri e stage', testo: 'Decine di ragazzi che ruotano: scheda per ciascuno, voti rapidi, report da consegnare alla famiglia a fine corso.' },
  { titolo: 'Prima squadra e dilettanti', testo: 'Tre portieri, una stagione, partite ogni settimana: gol subiti, clean sheet e andamento per decidere chi gioca.' },
]
