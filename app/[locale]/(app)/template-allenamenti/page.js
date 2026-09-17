import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Guida from '@/app/components/Guida'
import TemplateManager from '@/app/components/TemplateManager'
import { getOwnerId } from '@/lib/tenant'
import { contestoDati, entroTaglio, ownerDati } from '@/lib/demo'
import { getTranslations } from 'next-intl/server'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const dynamic = 'force-dynamic'

export default async function TemplateAllenamentiPage() {
  const supabase = await createClient()
  const t = await getTranslations('template')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await ownerDati(supabase, user.id)

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
      .select('template_id, esercizi(titolo, durata_minuti, recupero_minuti, esercizio_attributi(attributo_id))')
      .in('template_id', (templatesBase ?? []).map((t) => t.id))
    for (const r of righe ?? []) {
      const d = (dettagliPerTemplate[r.template_id] ??= { titoli: [], attributoIds: new Set(), minutiTotali: 0 })
      if (r.esercizi?.titolo) d.titoli.push(r.esercizi.titolo)
      for (const a of r.esercizi?.esercizio_attributi ?? []) d.attributoIds.add(a.attributo_id)
      d.minutiTotali += (parseFloat(r.esercizi?.durata_minuti) || 0) + (parseFloat(r.esercizi?.recupero_minuti) || 0)
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
      minutiTotali: d?.minutiTotali ?? 0,
    }
  })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{ marginTop: 10 }}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        <TemplateManager templates={lista} attributiDisponibili={attributiDisponibili ?? []} />
      </div>
    </>
  )
}
