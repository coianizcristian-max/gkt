import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartitaForm from '@/app/components/PartitaForm'
import ValutazioniPartita from '@/app/components/ValutazioniPartita'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function PartitaPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: partita } = await supabase
    .from('partite').select('*, squadre(nome)').eq('id', id).maybeSingle()
  if (!partita) notFound()

  const [{ data: catRows }, { data: iscr }, { data: vals }, { data: scalaRows }, { data: puntiRows }, { data: avvRows }] = await Promise.all([
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', partita.stagione_id),
    supabase.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', partita.stagione_id).eq('squadra_id', partita.squadra_id),
    supabase.from('valutazioni_partita').select('portiere_id, presente, voto, punti, note').eq('partita_id', id),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'scala_voti').eq('attivo', true).order('ordine'),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'punti_partita').eq('attivo', true).order('ordine'),
    supabase.from('squadre_avversarie').select('nome').eq('stagione_id', partita.stagione_id),
  ])

  const supabase2 = await createClient()
  const { data: { user } } = await supabase2.auth.getUser()
  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canValPartita = isUnlocked('valutazioni_partita', gatingCfg, abbAttivo)

  const categorie = (catRows ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const portieri = (iscr ?? []).map((r) => r.portieri).filter(Boolean)
    .sort((a, b) => `${a.nome}`.localeCompare(`${b.nome}`))
  const valIniziali = {}
  for (const v of vals ?? []) valIniziali[v.portiere_id] = v
  const scalaVoti = (scalaRows ?? []).map((r) => ({ label: r.valore, value: r.valore_num }))
  const puntiOpts = (puntiRows ?? []).map((r) => ({ label: r.valore, value: r.valore_num }))
  const avversari = [...new Set((avvRows ?? []).map((r) => r.nome))]

  const dataLabel = new Date(partita.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/partite">Partite</Link></div>
        <h1>{partita.squadre?.nome}<span className="topbar-sub"> · {partita.casa ? 'Casa' : 'Trasferta'} vs {partita.avversario || '—'}</span></h1>
      </div>
      <div className="content">
        <p className="sub-intro">{dataLabel}</p>
        <PartitaForm partita={partita} categorie={categorie} stagioneId={partita.stagione_id} avversari={avversari} />
        <h2 className="sezione-titolo">Valutazioni</h2>
        {!canValPartita
          ? <PaywallBanner chiave="valutazioni_partita" label="Valutazioni partita" />
          : portieri.length > 0 ? (
          <ValutazioniPartita
            partitaId={id}
            golSubiti={partita.gol_subiti}
            portieri={portieri}
            valIniziali={valIniziali}
            scalaVoti={scalaVoti}
            puntiOpts={puntiOpts}
          />
        ) : (
          <div className="empty">Nessun portiere iscritto a questa categoria per la stagione.</div>
        )}
      </div>
    </>
  )
}
