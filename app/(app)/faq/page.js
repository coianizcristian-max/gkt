import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function Sezione({ titolo, domande }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, marginBottom: 10 }}>{titolo}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {domande.map((d, i) => (
          <details key={i} className="scheda" style={{ padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{d.q}</summary>
            <div className="sub-intro" style={{ marginTop: 8, marginBottom: 0 }}>{d.a}</div>
          </details>
        ))}
      </div>
    </div>
  )
}

export default async function FaqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  const sezioniAllenatore = [
    {
      titolo: 'Stagioni e categorie',
      domande: [
        { q: 'Devo ricreare le categorie ogni stagione?', a: 'No. Le categorie (Prima Squadra, Allievi, ecc.) sono permanenti — le crei una volta in "Le mie categorie" e restano per sempre. A ogni nuova stagione ti basta rispuntare velocemente il checkbox "Attiva in stagione" per quelle che giocano quell\'anno.' },
        { q: 'Come creo una nuova stagione?', a: 'Vai su "Le mie stagioni" → "+ Nuova stagione". Imposta nome, date di inizio/fine e rendila attiva: da quel momento calendario, ricorrenze e statistiche lavorano su quella stagione.' },
        { q: 'Le mie categorie sono visibili ad altri allenatori?', a: 'No. Ogni categoria che crei è privata del tuo account — nessun altro allenatore che usa GKSeason può vederle o modificarle.' },
      ],
    },
    {
      titolo: 'Calendario e allenamenti',
      domande: [
        { q: 'Come duplico un allenamento già fatto?', a: 'Quando crei un nuovo allenamento, usa il pulsante "Duplica esercizi da un altro allenamento" (copia gli esercizi da una seduta passata) oppure "Duplica esercizi da un template" (copia da uno schema riutilizzabile che hai preparato prima).' },
        { q: 'Come accorpo due categorie nello stesso allenamento?', a: 'Nel form dell\'allenamento della categoria "ospite", usa il campo "Accorpata con" e seleziona l\'altra categoria. L\'orario viene ereditato automaticamente da quella categoria (essendo la stessa seduta), e nel calendario la categoria che gestisce gli esercizi ha la cornice verde, quella accorpata la cornice gialla. Devono venir inserite a calendario entrambe gli allenamenti delle 2 cateogorie affinchè l\'accorpamento funzioni.' },
        { q: 'Ho inserito un allenamento per errore, come lo elimino?', a: 'Apri l\'allenamento (o la sua anteprima nel calendario) e usa il pulsante "🗑 Elimina". Per cancellarne tanti insieme, usa "Eliminazione massiva" in fondo alla pagina Ricorrenze, filtrando per categoria e intervallo di date.' },
        { q: 'Perché non vedo l\'orario di un allenamento?', a: 'Se l\'allenamento non è accorpato a un\'altra categoria, apri il form e imposta "Ora inizio"/"Ora fine" manualmente. Se è accorpato, l\'orario arriva automaticamente dalla categoria accorpante.' },
      ],
    },
    {
      titolo: 'Partite',
      domande: [
        { q: 'Come inserisco tutte le partite della stagione insieme, invece che una alla volta?', a: 'Vai su Ricorrenze → tab "Partite". Metodo 1: imposta un giorno fisso della settimana per generare partite vuote da completare dopo. Metodo 2: scarica il template Excel, compilalo con il calendario ufficiale (date, casa/trasferta, avversari) e caricalo — crea automaticamente sia andata che ritorno.' },
        { q: 'Come elimino una partita inserita per errore?', a: 'Apri la partita e usa "🗑 Elimina partita", oppure usa l\'eliminazione massiva in Ricorrenze filtrando per "Partite".' },
      ],
    },
    {
      titolo: 'Template allenamenti',
      domande: [
        { q: 'A cosa serve un template?', a: 'È uno schema di allenamento riutilizzabile: crei un nome, una descrizione e una lista ordinata di esercizi una volta sola, poi lo riusi ogni volta che vuoi creare un nuovo allenamento con quella struttura, invece di reinserire tutto da capo.' },
        { q: 'Posso modificare un template dopo averlo creato?', a: 'Sì, in qualsiasi momento: puoi cambiare nome e descrizione dal pulsante "✏️ Modifica" nella lista, oppure aprire il template per aggiungere/togliere/riordinare gli esercizi.' },
        { q: 'Se elimino un template, perdo gli allenamenti già creati con quello?', a: 'No. Una volta copiati gli esercizi in un allenamento, quella copia è indipendente — eliminare il template non tocca gli allenamenti già creati.' },
        { q: 'Posso cercare tra i miei template?', a: 'Sì: puoi cercare per nome, descrizione o esercizi contenuti, e filtrare per attributo (es. "Reattività" + "Tecnico") — un template esce nei risultati solo se tutti gli attributi cercati sono presenti tra i suoi esercizi.' },
      ],
    },
    {
      titolo: 'Esercizi',
      domande: [
        { q: 'Che differenza c\'è tra "Miei", "Pubblici" e "Del responsabile" nella libreria esercizi?', a: '"Miei" sono quelli che hai creato tu. "Pubblici" sono esercizi condivisi da altri allenatori che hai aggiunto ai preferiti. "Del responsabile" compaiono solo se sei collegato come preparatore a un responsabile: sono i suoi esercizi, condivisi in sola lettura con te.' },
      ],
    },
    {
      titolo: 'Supervisione (responsabile/preparatore)',
      domande: [
        { q: 'Cos\'è un "responsabile"?', a: 'È un allenatore che supervisiona altri allenatori (preparatori) collegati a lui: può vedere in sola lettura calendario, partite, template e libreria esercizi dei suoi preparatori. Serve per uno staff strutturato con più preparatori portieri.' },
        { q: '"Supervisore" nel menu e "responsabile" sono la stessa cosa?', a: 'No — sono due cose diverse che condividono solo il nome. "Supervisore" nel menu è il pannello di amministrazione del tuo account personale (categorie, stagioni...). Il sistema "responsabile/preparatore" è la funzione che collega più allenatori tra loro.' },
      ],
    },
    {
      titolo: 'Abbonamento e coupon',
      domande: [
        { q: 'Quali funzionalità sono gratuite?', a: 'Varia nel tempo in base a come configuriamo i piani. Se una funzione richiede l\'abbonamento, te lo segnala chiaramente a schermo (con un pulsante per abbonarti) invece di essere semplicemente nascosta.' },
        { q: 'Come uso un codice coupon?', a: 'Dalla pagina dell\'abbonamento trovi un campo per inserire il codice. Se il coupon dà uno sconto (non accesso gratuito), va invece inserito direttamente nella pagina di pagamento al momento dell\'acquisto.' },
      ],
    },
    {
      titolo: 'Portieri e inviti',
      domande: [
        { q: 'Come invito un portiere ad accedere alla sua area?', a: 'Vai su Inviti → crea un link per il portiere e mandaglielo (email, WhatsApp...). Quando si registra con quel link, viene collegato automaticamente al suo profilo.' },
        { q: 'Il portiere non riesce ad accedere, cosa controllo?', a: 'Verifica lo stato dell\'invito nella pagina Inviti: se è ancora "attivo" (non "consumato"), il portiere non ha completato la registrazione con quel link.' },
      ],
    },
  ]

  const sezioniPortiere = [
    {
      titolo: 'La mia area',
      domande: [
        { q: 'Posso modificare il mio nome o la mia categoria?', a: 'No, nome, cognome e categoria sono gestiti dal tuo staff tecnico. Puoi modificare tu foto, contatti, altezza e piede preferito dalla tua scheda.' },
        { q: 'Come lascio un commento su un allenamento?', a: 'Dal calendario, apri l\'allenamento in cui risulti presente: puoi lasciare un voto personale, un commento sulla seduta e una nota privata visibile solo a te.' },
        { q: 'Perché le mie statistiche sono vuote?', a: 'Le statistiche si calcolano dalle valutazioni inserite dal tuo staff negli allenamenti. Se non sono ancora state inserite valutazioni, i dati restano vuoti finché non arrivano le prime.' },
      ],
    },
  ]

  const sezioni = isPortiere ? sezioniPortiere : sezioniAllenatore

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Guida</div>
        <h1>Domande frequenti</h1>
      </div>
      <div className="content">
        <p className="sub-intro">Clicca su una domanda per vedere la risposta.</p>
        {sezioni.map((s, i) => <Sezione key={i} titolo={s.titolo} domande={s.domande} />)}
      </div>
    </>
  )
}
