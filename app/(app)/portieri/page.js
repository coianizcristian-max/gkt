import Link from 'next/link'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortieriSearch from '@/app/components/PortieriSearch'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function PortieriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, permessi_collaboratore, nome_completo, foto_url, via, citta, cap').eq('id', user?.id).maybeSingle()
  if (profilo?.ruolo === 'portiere' && profilo.portiere_id) {
    redirect(`/portieri/${profilo.portiere_id}`)
  }
  if (profilo?.ruolo === 'staff' && !puoVisualizzare({ ruolo: profilo.ruolo, permessiCollaboratore: profilo.permessi_collaboratore }, 'portieri')) {
    redirect('/dashboard')
  }

  const ownerId = await getOwnerId(supabase, user?.id)
  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let squadre = []
  let iscrizioni = []
  let valutazioni = []

  let haCategorie = false
  let haPortieri = false
  let haAllenamenti = false
  const haProfiloCompilato = !!(
    profilo?.nome_completo?.trim() &&
    profilo?.via?.trim() &&
    profilo?.citta?.trim() &&
    profilo?.cap?.trim()
  )
  if (stagione) {
    const [sq, isc, allen, cat] = await Promise.all([
      supabase.from('squadre').select('id, nome, ordine').eq('owner_id', ownerId).order('ordine'),
      supabase.from('iscrizioni')
        .select('squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url, attivo, data_nascita)')
        .eq('stagione_id', stagione.id),
      supabase.from('allenamenti').select('id').eq('stagione_id', stagione.id),
      supabase.from('stagione_categorie').select('id').eq('stagione_id', stagione.id).limit(1),
    ])
    squadre = sq.data ?? []
    iscrizioni = isc.data ?? []
    const allenIds = (allen.data ?? []).map((a) => a.id)
    if (allenIds.length) {
      const { data: val } = await supabase.from('valutazioni').select('portiere_id, presente, voto').in('allenamento_id', allenIds)
      valutazioni = val ?? []
    }
    haCategorie = (cat.data ?? []).length > 0
    haPortieri = iscrizioni.filter((i) => i.portieri?.attivo).length > 0
    haAllenamenti = allenIds.length > 0
  }

  // Tag portiere (per badge nella card)
  const portiereIds = iscrizioni.map((i) => i.portieri?.id).filter(Boolean)
  let tagPerPortiere = {}
  if (portiereIds.length) {
    const { data: tagRows } = await supabase.from('portiere_tag').select('portiere_id, tag').in('portiere_id', portiereIds)
    for (const r of tagRows ?? []) (tagPerPortiere[r.portiere_id] ??= []).push(r.tag)
  }

  const stats = {}
  for (const v of valutazioni) {
    const s = (stats[v.portiere_id] ??= { tot: 0, presenze: 0, somma: 0, conta: 0 })
    s.tot += 1
    if (v.presente) s.presenze += 1
    if (v.presente && v.voto != null) { s.somma += Number(v.voto); s.conta += 1 }
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Portieri</h1>
        </div>
        <Link href="/portieri/nuovo" className="btn-azione">+ Nuovo</Link>
      </div>
      <div className="content">
        <Guida titolo="Come gestire i portieri">
          <p>
            Aggiungi i portieri con <strong>&ldquo;+ Nuovo&rdquo;</strong> e iscrivili a una categoria della stagione attiva.
            Dalla scheda del portiere puoi modificare tutti i dati anagrafici, la foto, il numero di maglia e la categoria di iscrizione.
            Per mandare l&apos;accesso al portiere usa la sezione <a href="/inviti" className="link-inline">Inviti</a>:
            crea un link di invito e il portiere si registra autonomamente, venendo collegato automaticamente alla sua scheda.
          </p>
          <p style={{marginTop:10}}>
            Dalla scheda portiere trovi anche i tab <strong>Obiettivi</strong> (imposta traguardi con scadenza e monitora lo stato),
            <strong> Feedback</strong> (storico dei commenti inseriti nelle valutazioni),
            <strong> Percorso</strong> (timeline della crescita stagionale) e
            <strong> Tag</strong> (etichette personalizzate per categorizzare le caratteristiche del portiere).
            L&apos;indice di crescita viene calcolato automaticamente confrontando i voti recenti con quelli precedenti.
          </p>
          <p style={{marginTop:10}}>
            Per disattivare un portiere senza eliminarlo (es. non è più nella squadra ma vuoi conservare i dati storici)
            usa il toggle <strong>Attivo/Non attivo</strong> nella sua scheda.
          </p>
          <p style={{marginTop:10}}>
            La scheda include anche le <strong>Assenze annunciate</strong>: segnali in anticipo i giorni in cui il portiere sarà assente e compaiono nel calendario, senza incidere su presenze o statistiche. Nel tab <strong>Obiettivi</strong> puoi collegare dei <strong>test con un valore target</strong> e registrare le misurazioni nel tempo: l&apos;avanzamento viene poi calcolato in automatico dai test. Gli <strong>infortuni</strong> segnati nella griglia di valutazione compaiono nella scheda e vengono esclusi dalle statistiche (indicati con 🩹).
          </p>
        </Guida>
        {profilo?.ruolo === 'allenatore' && (
          <OnboardingChecklist checks={[
            {
              ok: !!stagione,
              titolo: 'Configura la tua stagione',
              desc: 'Seleziona l\u2019anno e imposta societ\u00e0, date e categorie.',
              href: '/setup',
            },
            {
              ok: haCategorie,
              titolo: 'Almeno una categoria',
              desc: 'Aggiungi le categorie (Under 15, Under 17…) alla stagione.',
              href: '/categorie',
            },
            {
              ok: haPortieri,
              titolo: 'Portieri iscritti',
              desc: 'Aggiungi i tuoi portieri e iscrivili a una categoria.',
              href: '/portieri/nuovo',
            },
            {
              ok: haAllenamenti,
              titolo: 'Crea gli allenamenti',
              desc: 'Vai in Ricorrenze: imposta i giorni fissi di allenamento per ogni categoria e genera tutto il calendario in un click.',
              href: '/ricorrenze',
            },
            {
              ok: haProfiloCompilato,
              titolo: 'Completa il tuo profilo',
              desc: 'Aggiungi nome e indirizzo (via, città, CAP): servono a farti trovare dalle società della tua zona.',
              href: '/profilo',
            },
          ]} />
        )}
        {!stagione
          ? <div className="empty">Nessuna stagione attiva. <Link href="/setup" className="link-inline">Configura la stagione</Link></div>
          : <PortieriSearch squadre={squadre} iscrizioni={iscrizioni} stats={stats} tagPerPortiere={tagPerPortiere} />}
      </div>
    </>
  )
}
