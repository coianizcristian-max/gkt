import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import TemplateEsercizi from '@/app/components/TemplateEsercizi'
import { getOwnerId } from '@/lib/tenant'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const dynamic = 'force-dynamic'

export default async function TemplateDettaglioPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)

  const { data: template } = await supabase
    .from('template_allenamento').select('id, nome, descrizione, owner_id').eq('id', id).maybeSingle()
  if (!template || template.owner_id !== ownerId) notFound()

  // Carica supervisore_id — se l'utente è un preparatore con responsabile
  const { data: profiloExt } = await supabase
    .from('profili').select('supervisore_id').eq('id', user.id).maybeSingle()
  const supervisoreId = profiloExt?.supervisore_id ?? null

  const [{ data: esercizi }, { data: attributi }, { data: righeSel }] = await Promise.all([
    supabase.from('esercizi').select('*').eq('allenatore_id', ownerId).eq('archiviato', false).order('created_at', { ascending: false }),
    supabase.from('attributi_esercizio').select('id, nome').eq('attivo', true).order('ordine'),
    supabase.from('template_allenamento_esercizi').select('esercizio_id, ordine, esercizi(*)').eq('template_id', id).order('ordine'),
  ])

  const selezionatiIniziali = (righeSel ?? []).map((r) => r.esercizio_id)
  const selezionatiEsercizi = (righeSel ?? []).map((r) => r.esercizi).filter(Boolean)

  // Esercizi pubblici preferiti (stesso pattern della libreria)
  let eserciziPubbliciPreferiti = []
  try {
    const { data: prefRows } = await supabase
      .from('esercizi_preferiti').select('esercizio_id').eq('allenatore_id', user.id)
    if (prefRows && prefRows.length > 0) {
      const prefIds = prefRows.map((r) => r.esercizio_id)
      const { data: pubPref } = await supabase
        .from('esercizi').select('*').eq('pubblico', true).eq('archiviato', false)
        .neq('allenatore_id', ownerId).in('id', prefIds).order('titolo')
      eserciziPubbliciPreferiti = pubPref ?? []
    }
  } catch (_) {}

  // Esercizi del responsabile se collegato
  let eserciziResponsabile = []
  if (supervisoreId) {
    try {
      const admin = getAdmin()
      const { data: rel } = await admin
        .from('relazioni_supervisione').select('id')
        .eq('supervisore_id', supervisoreId).eq('preparatore_id', user.id).eq('attivo', true).maybeSingle()
      if (rel) {
        const { data: esResp } = await admin
          .from('esercizi').select('*').eq('allenatore_id', supervisoreId).eq('archiviato', false)
          .order('created_at', { ascending: false })
        eserciziResponsabile = esResp ?? []
      }
    } catch (_) {}
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/template-allenamenti">Template allenamenti</Link></div>
        <h1>{template.nome}</h1>
      </div>
      <div className="content">
        {template.descrizione && <p className="sub-intro">{template.descrizione}</p>}
        <TemplateEsercizi
          templateId={id}
          libreriaMia={esercizi ?? []}
          libreriaPubblica={eserciziPubbliciPreferiti}
          eserciziResponsabile={eserciziResponsabile}
          selezionatiIniziali={selezionatiIniziali}
          selezionatiEsercizi={selezionatiEsercizi}
          attributiDisponibili={attributi ?? []}
        />
      </div>
    </>
  )
}
