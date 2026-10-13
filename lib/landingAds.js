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
 * `pannello` sceglie il riquadro disegnato nell'hero:
 *   'scheda'      -> scheda del portiere con voti e andamento
 *   'settimana'   -> settimana di allenamenti programmata
 *   'valutazione' -> valutazione di una seduta, portiere per portiere
 */
export const LANDING = {
  'software-portieri': {
    titoloPagina: 'Software per preparatori dei portieri',
    descrizione: 'Il gestionale fatto solo per chi allena i portieri: allenamenti, valutazioni, statistiche ed esercizi in un\'unica app. Gratis, da PC e smartphone.',
    sopratitolo: 'Software per preparatori dei portieri',
    titolo: 'Il gestionale fatto solo per chi allena i portieri',
    lead: 'Allenamenti, valutazioni, statistiche e libreria esercizi in un\'unica app. Niente fogli Excel, niente voti persi nelle chat. Gratis, da PC e da telefono.',
    pannello: 'scheda',
    vantaggiTitolo: 'Cosa fai con GKSeason',
    vantaggi: [
      { icona: 'calendario', titolo: 'Programmi la stagione una volta sola', testo: 'Imposti giorni, orari e categorie: il calendario degli allenamenti si genera da solo. Ogni seduta ha i suoi esercizi, presi dalla tua libreria.' },
      { icona: 'voto', titolo: 'Valuti in 30 secondi, dallo spogliatoio', testo: 'Voto, presenze e due righe di nota per ogni portiere, dal telefono, prima di uscire dal campo. I parametri li decidi tu.' },
      { icona: 'grafico', titolo: 'Le statistiche si costruiscono da sole', testo: 'Media voto, andamento, clean sheet, confronto tra portieri della stessa categoria. Report PDF da dare al portiere, alla famiglia o alla società.' },
    ],
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
    pannello: 'settimana',
    vantaggiTitolo: 'Come organizzi gli allenamenti',
    vantaggi: [
      { icona: 'calendario', titolo: 'Ricorrenze: imposti e dimentichi', testo: 'Martedì e giovedì alle 18 per l\'Under 15, mercoledì per l\'Under 17: lo scrivi una volta e tutta la stagione compare nel calendario. Gli spostamenti li gestisci seduta per seduta.' },
      { icona: 'esercizi', titolo: 'La tua libreria di esercizi', testo: 'Ogni esercizio con obiettivo, materiale, durata e schema disegnato sulla lavagna. Lo riusi in qualsiasi seduta e lo stampi in PDF per il campo.' },
      { icona: 'template', titolo: 'Sedute tipo da riusare', testo: 'Salvi le sedute che funzionano come modello (presa, uscite alte, piedi, 1 contro 1) e le richiami in un clic quando ti servono.' },
    ],
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
    pannello: 'valutazione',
    vantaggiTitolo: 'Come valuti e cosa ottieni',
    vantaggi: [
      { icona: 'voto', titolo: 'Parametri tuoi, non generici', testo: 'Presa, uscite alte, piedi, posizionamento, 1 contro 1: scegli i parametri che valuti davvero e dai un voto a ciascuno, oppure uno solo complessivo.' },
      { icona: 'grafico', titolo: 'Andamento e confronto', testo: 'Per ogni portiere vedi media, trend mese per mese e punti forti e deboli. Per la categoria, il confronto tra portieri sugli stessi parametri.' },
      { icona: 'report', titolo: 'Report PDF pronto da condividere', testo: 'A fine mese o a fine stagione generi il report del portiere in un clic: pulito, leggibile, da mandare alla famiglia o portare in società.' },
    ],
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
