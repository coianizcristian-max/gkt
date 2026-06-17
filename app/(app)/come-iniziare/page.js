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
    'Supervisore > Stagioni: controlla che ci sia una stagione attiva (creala se manca).',
    'Supervisore > Categorie: attiva e ordina le categorie (squadre) della stagione.',
    'Portieri: aggiungi i portieri e iscrivili alla categoria giusta.',
    'Ricorrenze: per ogni categoria imposta periodo (inizio/fine) e giorni/orari, poi genera gli allenamenti.',
    'Esercizi: crea la tua libreria; potrai richiamarli dentro ogni allenamento.',
    'Calendario: apri un allenamento per segnare le presenze e inserire le valutazioni.',
    'Partite: inserisci le gare e le valutazioni dei portieri.',
    'Profilo allenatore: completa i tuoi dati (foto, contatti, disponibilita e range di ricerca).',
  ]
  const passiPortiere = [
    'Completa la tua scheda profilo (foto, contatti, dati personali): nome, cognome, categoria e squadra li gestisce lo staff.',
    'Calendario: dove risulti presente puoi lasciare la tua valutazione e una nota personale.',
    'Statistiche: vedi il tuo andamento e il confronto con la tua categoria.',
    'Suggerimenti: puoi inviare proposte o segnalazioni allo staff.',
  ]
  const passi = isPortiere ? passiPortiere : passiAllenatore

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Guida</div>
        <h1>Come iniziare</h1>
      </div>
      <div className="content">
        <Guida titolo="A cosa serve questa pagina">
          Elenco dei passi essenziali per iniziare a usare GKT. Seguili in ordine.
        </Guida>
        <ol style={{ lineHeight: 1.6, paddingLeft: '1.2rem' }}>
          {passi.map((p, i) => <li key={i} style={{ marginBottom: 8 }}>{p}</li>)}
        </ol>
      </div>
    </>
  )
}
