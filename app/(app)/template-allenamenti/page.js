import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Guida from '@/app/components/Guida'
import TemplateManager from '@/app/components/TemplateManager'
import { getOwnerId } from '@/lib/tenant'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const dynamic = 'force-dynamic'

export default async function TemplateAllenamentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)

  // Query base: garantisce sempre la lista dei template, anche se qualcosa
  // nella parte di arricchimento (esercizi/attributi) dovesse fallire.
  const { data: templatesBase } = await supabase
    .from('template_allenamento')
    .select('id, nome, descrizione, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  const { data: attributiDisponibili } = await supabase
    .from('attributi_esercizio').select('id, nome').eq('attivo', true).order('ordine')

  // Arricchimento: esercizi contenuti (per la ricerca) + attributi derivati
  // dall'unione degli attributi di quegli esercizi. Se fallisce, i template
  // restano comunque visibili, solo senza dati per ricerca/filtro.
  let dettagliPerTemplate = {}
  try {
    const { data: righe } = await supabase
      .from('template_allenamento_esercizi')
      .select('template_id, esercizi(titolo, esercizio_attributi(attributo_id))')
      .in('template_id', (templatesBase ?? []).map((t) => t.id))
    for (const r of righe ?? []) {
      const d = (dettagliPerTemplate[r.template_id] ??= { titoli: [], attributoIds: new Set() })
      if (r.esercizi?.titolo) d.titoli.push(r.esercizi.titolo)
      for (const a of r.esercizi?.esercizio_attributi ?? []) d.attributoIds.add(a.attributo_id)
    }
  } catch (_) {
    // Migrazione esercizi/attributi non ancora presente o altro errore: si degrada senza rompere la lista.
  }

  const lista = (templatesBase ?? []).map((t) => {
    const d = dettagliPerTemplate[t.id]
    return {
      id: t.id,
      nome: t.nome,
      descrizione: t.descrizione,
      numEsercizi: d?.titoli.length ?? 0,
      eserciziTitoli: d?.titoli ?? [],
      attributoIds: d ? [...d.attributoIds] : [],
    }
  })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Template allenamenti</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano i template">
          <p>
            Crea un template con un nome (es. &ldquo;Seduta tecnica base&rdquo;) e una serie di esercizi dalla
            tua libreria, nell&apos;ordine che preferisci. Quando crei un nuovo allenamento nel calendario,
            potrai scegliere <strong>&ldquo;Duplica da un template&rdquo;</strong> invece di doverli
            reinserire ogni volta: gli esercizi vengono copiati nell&apos;ordine impostato qui.
          </p>
          <p style={{ marginTop: 10 }}>
            I template sono <strong>solo tuoi</strong>: se sei un responsabile con preparatori collegati,
            potrai vedere (in sola lettura) anche i loro template dalla sezione supervisione.
          </p>
        </Guida>
        <TemplateManager templates={lista} attributiDisponibili={attributiDisponibili ?? []} />
      </div>
    </>
  )
}
