import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortieriSearch from '@/app/components/PortieriSearch'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'

export const dynamic = 'force-dynamic'

export default async function PortieriPage() {
  const supabase = await createClient()
  const t = await getTranslations('portieri')
  const c = await getTranslations('common')
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
  const { db, stagione, taglio, oggi: oggiCtx } = await contestoDati(supabase, user?.id)

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
      db.from('squadre').select('id, nome, ordine').eq('owner_id', ownerId).order('ordine'),
      db.from('iscrizioni')
        .select('squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url, attivo, data_nascita)')
        .eq('stagione_id', stagione.id),
      db.from('allenamenti').select('id').eq('stagione_id', stagione.id),
      db.from('stagione_categorie').select('id').eq('stagione_id', stagione.id).limit(1),
    ])
    squadre = sq.data ?? []
    iscrizioni = isc.data ?? []
    const allenIds = (allen.data ?? []).map((a) => a.id)
    if (allenIds.length) {
      const { data: val } = await db.from('valutazioni').select('portiere_id, presente, voto').in('allenamento_id', allenIds)
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
    const { data: tagRows } = await db.from('portiere_tag').select('portiere_id, tag').in('portiere_id', portiereIds)
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
          <div className="eyebrow">{c('stagione', { nome: stagione?.nome ?? '—' })}</div>
          <h1>{t('titolo')}</h1>
        </div>
        <Link href="/portieri/nuovo" className="btn-azione">{c('nuovo')}</Link>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong>, inviti: (ch) => <a href="/inviti" className="link-inline">{ch}</a> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP5', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        {profilo?.ruolo === 'allenatore' && (
          <OnboardingChecklist checks={[
            {
              ok: !!stagione,
              titolo: t('onbStagioneTitolo'),
              desc: t('onbStagioneDesc'),
              href: '/setup',
            },
            {
              ok: haCategorie,
              titolo: t('onbCategoriaTitolo'),
              desc: t('onbCategoriaDesc'),
              href: '/categorie',
            },
            {
              ok: haPortieri,
              titolo: t('onbPortieriTitolo'),
              desc: t('onbPortieriDesc'),
              href: '/portieri/nuovo',
            },
            {
              ok: haAllenamenti,
              titolo: t('onbAllenamentiTitolo'),
              desc: t('onbAllenamentiDesc'),
              href: '/ricorrenze',
            },
            {
              ok: haProfiloCompilato,
              titolo: t('onbProfiloTitolo'),
              desc: t('onbProfiloDesc'),
              href: '/profilo',
            },
          ]} />
        )}
        {!stagione
          ? <div className="empty">{c('nessunaStagione')} <Link href="/setup" className="link-inline">{t('configuraStagione')}</Link></div>
          : <PortieriSearch squadre={squadre} iscrizioni={iscrizioni} stats={stats} tagPerPortiere={tagPerPortiere} stagioneId={stagione.id} puoEliminare={profilo?.ruolo === 'allenatore'} />}
      </div>
    </>
  )
}
