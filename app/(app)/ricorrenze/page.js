import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import RicorrenzeManager from '@/app/components/RicorrenzeManager'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function RicorrenzePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { stagione } = await getStagioneAttiva(supabase, user.id)

  let categorie = []
  let ricorrenze = []
  if (stagione) {
    const [cat, ric] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('ricorrenze_stagionali').select('*').eq('stagione_id', stagione.id),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    ricorrenze = ric.data ?? []
  }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  const canRicorrenze = isUnlocked('ricorrenze_genera', gatingCfg, abbAttivo)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
        <h1>Ricorrenze allenamenti</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano le ricorrenze">
          <p>
            Imposta per ogni categoria il giorno e l&apos;orario fisso di allenamento settimanale.
            Quando hai configurato tutti i giorni, clicca &ldquo;Genera allenamenti stagione&rdquo; per creare
            automaticamente tutte le date nel calendario. Le date già presenti non vengono duplicate:
            puoi rigenerare senza problemi dopo modifiche. Ricorda di impostare prima le date di inizio
            e fine stagione in Stagioni.
          </p>
          <p style={{ marginTop: 10 }}>
            Per ogni categoria puoi aggiungere più ricorrenze (es. martedì + giovedì), modificare
            giorno e orario in qualsiasi momento, oppure eliminare una singola ricorrenza con il
            pulsante <strong>Elimina</strong> sulla riga corrispondente. Le ricorrenze si riferiscono
            solo alla pianificazione futura: eliminare una ricorrenza non cancella gli allenamenti già
            generati nel calendario.
          </p>
          <p style={{ marginTop: 10 }}>
            Nella sezione <strong>🗑 Eliminazione massiva</strong> in fondo alla pagina puoi cancellare
            in blocco allenamenti o partite in un intervallo di date. Puoi filtrare per categoria,
            scegliere se eliminare solo quelli <em>senza valutazioni</em> (tipicamente inseriti per
            errore), solo quelli <em>con valutazioni</em>, oppure tutti indistintamente.
            L&apos;operazione è irreversibile: viene sempre richiesta una conferma prima di procedere.
          </p>
        </Guida>
        {stagione
          ? (canRicorrenze
            ? <RicorrenzeManager stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} />
            : <PaywallBanner chiave="ricorrenze_genera" label="Generazione automatica ricorrenze" />)
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
