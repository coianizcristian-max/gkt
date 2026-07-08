import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'

export const dynamic = 'force-dynamic'

export default async function ComeIniziarePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  const passiAllenatore = [
    { t: 'Le mie stagioni', d: 'Controlla che ci sia una stagione attiva. Imposta nome, date di inizio e fine, nome della società e logo.' },
    { t: 'Le mie categorie', d: 'Attiva e ordina le categorie (squadre) per la stagione corrente. Senza categorie attive non puoi iscrivere portieri.' },
    { t: 'Supervisore → Elenchi', d: 'Personalizza i valori dei menu a tendina (tipologie esercizi, piede preferito, provenienza…).' },
    { t: 'Parametri di valutazione', d: 'Scegli quali parametri vuoi usare nelle valutazioni degli allenamenti (tecnica, uscite, gioco coi piedi…).' },
    { t: 'Portieri', d: 'Aggiungi i portieri con dati anagrafici completi e iscrivili alla categoria. Puoi impostare obiettivi, tag e consultare il percorso di crescita da ogni scheda portiere.' },
    { t: 'Inviti', d: 'Crea un link di invito per ogni portiere e mandaglielo: si registra e viene collegato automaticamente al suo profilo.' },
    { t: 'Ricorrenze', d: 'Per ogni categoria imposta i giorni e orari fissi di allenamento, poi clicca "Genera allenamenti stagione" per creare tutte le date in blocco. Da qui puoi anche eliminare allenamenti o partite in massa.' },
    { t: 'Esercizi', d: 'Crea la tua libreria di esercizi con titolo, tipologia e immagine. Potrai aggiungerli a ogni allenamento dal tab Esercizi nella seduta.' },
    { t: 'Calendario', d: 'Apri un allenamento per segnare le presenze, inserire le valutazioni per parametro, aggiungere esercizi e attivare il flag "Nessuna valutazione" se la seduta si è svolta senza dare voti.' },
    { t: 'Partite', d: 'Inserisci le gare con risultato e valutazioni (presenza, voto, punti per portiere). Le amichevoli non influenzano le medie di campionato.' },
    { t: 'Statistiche', d: 'Visualizza presenze, medie voti, clean sheet e punti per ogni portiere. Il tab Feedback raccoglie le auto-valutazioni scritte dai portieri.' },
    { t: 'Archivio', d: 'Consulta le stagioni passate in sola lettura ed esporta i dati in CSV o PDF.' },
    { t: 'Profilo allenatore', d: 'Completa i tuoi dati (foto, contatti, disponibilità) per apparire nella ricerca pubblica degli allenatori.' },
  ]
  const passiPortiere = [
    { t: 'La mia scheda', d: 'Completa i tuoi dati: foto, contatti, altezza, piede preferito. Nome, cognome e categoria sono gestiti dallo staff.' },
    { t: 'Calendario', d: 'Vedi gli allenamenti in cui sei iscritto. Dove risulti presente puoi lasciare la tua auto-valutazione: voto personale, commento sulla seduta e nota privata visibile solo a te.' },
    { t: 'Partite', d: 'Consulta le partite della tua categoria: data, avversario, risultato e la tua valutazione inserita dallo staff.' },
    { t: 'Statistiche', d: 'Vedi il tuo andamento di stagione: presenze, medie voti allenamenti e partite, clean sheet e punti totali. Il tab Feedback mostra i commenti che hai scritto.' },
    { t: 'Obiettivi', d: 'Consulta gli obiettivi che lo staff ha impostato per te, con scadenza e stato di avanzamento.' },
    { t: 'Suggerimenti', d: 'Invia proposte o segnalazioni allo staff, anche in forma anonima. Vedrai qui lo stato della risposta.' },
  ]
  const passi = isPortiere ? passiPortiere : passiAllenatore

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Guida</div>
        <h1>Come iniziare</h1>
      </div>
      <div className="content">
        <p className="sub-intro">
          {isPortiere
            ? 'Ecco le sezioni principali di GKSeason e come usarle come portiere.'
            : 'Segui questi passaggi in ordine per configurare GKSeason e iniziare a usarlo con la tua squadra.'}
        </p>
        <div className="guida-step-grid">
          {passi.map((p, i) => (
            <div key={i} className="guida-step">
              <div className="guida-step-n">{i + 1}</div>
              <div>
                <div className="guida-step-titolo">{p.t}</div>
                <div className="guida-step-desc">{p.d}</div>
              </div>
            </div>
          ))}
        </div>

        {!isPortiere && (
          <div style={{ marginTop: 32 }}>
            <Guida titolo="Domande frequenti">
              <p>
                Le domande frequenti hanno ora una loro pagina dedicata, più completa e organizzata per
                argomento: <Link href="/faq" className="link-inline">vai a Domande frequenti →</Link>
              </p>
            </Guida>
          </div>
        )}
      </div>
    </>
  )
}
