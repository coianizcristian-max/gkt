import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import PartiteLista from '@/app/components/PartiteLista'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function PartitePage() {
  const supabase = await createClient()
  const t = await getTranslations('partite')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, permessi_collaboratore').eq('id', user?.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'
  if (profilo?.ruolo === 'staff' && !puoVisualizzare({ ruolo: profilo.ruolo, permessiCollaboratore: profilo.permessi_collaboratore }, 'partite')) {
    redirect('/dashboard')
  }

  const { db, stagione, taglio, oggi: oggiCtx } = await contestoDati(supabase, user?.id)

  let partite = []
  let categorie = []
  if (stagione) {
    let query = db.from('partite')
      .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
      .eq('stagione_id', stagione.id).order('data', { ascending: false })

    // Il portiere vede solo le partite della sua categoria
    if (isPortiere && profilo.portiere_id) {
      const { data: isc } = await db.from('iscrizioni')
        .select('squadra_id').eq('stagione_id', stagione.id).eq('portiere_id', profilo.portiere_id).maybeSingle()
      if (isc?.squadra_id) query = query.eq('squadra_id', isc.squadra_id)
    }

    const [pa, cat, vPar] = await Promise.all([
      query,
      db.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      db.from('valutazioni_partita').select('partita_id').eq('presente', true),
    ])
    const partiteConVal = new Set((vPar.data ?? []).map((v) => v.partita_id))
    partite = (pa.data ?? []).map((p) => {
      // In demo una partita successiva alla data di riferimento non e' ancora
      // stata giocata: niente risultato e niente valutazioni.
      const giocata = entroTaglio(p.data, taglio)
      return {
        id: p.id, data: p.data, squadra_id: p.squadra_id, avversario: p.avversario,
        casa: p.casa,
        gol_fatti: giocata ? p.gol_fatti : null,
        gol_subiti: giocata ? p.gol_subiti : null,
        tipo: p.tipo ?? 'campionato', squadra_nome: p.squadre?.nome ?? '',
        ha_valutazioni: giocata && partiteConVal.has(p.id),
      }
    })
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">{c('stagione', { nome: stagione?.nome ?? '—' })}</div>
          <h1>{t('titolo')}</h1>
        </div>
      </div>
      <div className="content">
        {!isPortiere && (
          <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong>, ricorrenze: (ch) => <a href="/ricorrenze" className="link-inline">{ch}</a> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        )}
        {stagione
          ? <PartiteLista partite={partite} categorie={categorie} isPortiere={isPortiere} oggiIso={oggiCtx} />
          : <div className="empty">{c('nessunaStagione')}</div>}
      </div>
    </>
  )
}
