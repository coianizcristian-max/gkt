import { redirect } from 'next/navigation'
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
    { t: 'Supervisore → Stagioni', d: 'Controlla che ci sia una stagione attiva. Imposta nome, date di inizio e fine, nome della società e logo.' },
    { t: 'Supervisore → Categorie', d: 'Attiva e ordina le categorie (squadre) per la stagione corrente.' },
    { t: 'Portieri', d: 'Aggiungi i portieri con dati anagrafici (inclusa data di nascita per calcolare l\'età automaticamente) e iscrivili alla categoria.' },
    { t: 'Inviti', d: 'Crea un link di invito per ogni portiere e mandaglielo: si registra e viene collegato automaticamente al suo profilo.' },
    { t: 'Ricorrenze', d: 'Per ogni categoria imposta i giorni e orari fissi di allenamento, poi clicca "Genera allenamenti stagione" per creare tutte le date.' },
    { t: 'Esercizi', d: 'Crea la tua libreria di esercizi con titolo, tipologia e immagine. Potrai richiamarli in ogni allenamento.' },
    { t: 'Calendario', d: 'Apri un allenamento per segnare le presenze, inserire le valutazioni per parametro e aggiungere gli esercizi della seduta.' },
    { t: 'Partite', d: 'Inserisci le gare (campionato e amichevoli). Le amichevoli non influenzano le medie nelle statistiche.' },
    { t: 'Statistiche', d: 'Visualizza presenze, medie voti, clean sheet e punti per ogni portiere. Il tab Feedback raccoglie i commenti scritti.' },
    { t: 'Profilo allenatore', d: 'Completa i tuoi dati (foto, contatti, disponibilità) per apparire nella ricerca pubblica.' },
  ]
  const passiPortiere = [
    { t: 'La mia scheda', d: 'Completa i tuoi dati: foto, contatti, altezza, piede preferito. Nome, cognome e categoria sono gestiti dallo staff.' },
    { t: 'Calendario', d: 'Vedi gli allenamenti in cui sei iscritto. Dove risulti presente puoi lasciare la tua valutazione della seduta (voto, commento, nota privata).' },
    { t: 'Partite', d: 'Consulta le partite della tua categoria in sola lettura.' },
    { t: 'Statistiche', d: 'Vedi il tuo andamento di stagione: presenze, medie voti per allenamenti e partite.' },
    { t: 'Obiettivi', d: 'Consulta gli obiettivi che lo staff ha impostato per te.' },
    { t: 'Suggerimenti', d: 'Invia proposte o segnalazioni allo staff. Vedrai la risposta (accettata/non accettata) direttamente qui.' },
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
            ? 'Ecco le sezioni principali di GKT e come usarle come portiere.'
            : 'Segui questi passaggi in ordine per configurare GKT e iniziare a usarlo con la tua squadra.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <p><b>Il portiere non riesce ad accedere?</b><br />Verifica che l&apos;invito sia nello stato &ldquo;consumato&rdquo; nella pagina Inviti. Se è ancora &ldquo;attivo&rdquo; il portiere non ha completato la registrazione.</p>
              <p><b>Gli allenamenti non compaiono nel calendario?</b><br />Verifica che la stagione sia attiva e che le ricorrenze siano state generate. Controlla anche che il portiere sia iscritto alla categoria giusta.</p>
              <p><b>Le statistiche mostrano &ldquo;—&rdquo; per tutti?</b><br />Le statistiche si calcolano dalle valutazioni inserite negli allenamenti. Se non hai ancora valutato nessun allenamento, i dati saranno vuoti.</p>
              <p><b>Come cambio categoria a un portiere a metà stagione?</b><br />Modifica l&apos;iscrizione dalla scheda del portiere: cambia la categoria e salva. Le valutazioni precedenti restano collegate agli allenamenti originali.</p>
            </Guida>
          </div>
        )}
      </div>
    </>
  )
}
