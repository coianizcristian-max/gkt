import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import RipristinoManager from '@/app/components/RipristinoManager'

export const dynamic = 'force-dynamic'

export default async function RipristinoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // Carica lista allenatori per il selettore utente
  const { data: allenatori } = await supabase
    .from('profili')
    .select('id, nome_visualizzato, nome_completo')
    .eq('ruolo', 'allenatore')
    .order('nome_visualizzato')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisore</div>
        <h1>Ripristino dati utente</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">
          Ripristina i dati di un singolo utente da un backup senza sovrascrivere i dati degli altri.
          Scarica il backup da GitHub → Actions → Database Backup → Artifacts, estrai il file JSON della
          tabella che vuoi ripristinare e incollalo qui.
        </p>
        <RipristinoManager allenatori={allenatori ?? []} />
      </div>
    </>
  )
}
