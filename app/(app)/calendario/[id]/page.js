import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'
import ValutazioniAllenamento from '@/app/components/ValutazioniAllenamento'
import AllenamentoEsercizi from '@/app/components/AllenamentoEsercizi'

export const dynamic = 'force-dynamic'

export default async function AllenamentoPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allenamento } = await supabase
    .from('allenamenti').select('*, squadre(nome)').eq('id', id).maybeSingle()
  if (!allenamento) notFound()

  const [{ data: catRows }, { data: iscr }, { data: parametri }, { data: vals }, { data: scalaRows }, { data: libRows }, { data: aeRows }] = await Promise.all([
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', allenamento.stagione_id),
    supabase.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', allenamento.stagione_id).eq('squadra_id', allenamento.squadra_id),
    supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    supabase.from('valutazioni').select('id, portiere_id, presente, voto, note').eq('allenamento_id', id),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'scala_voti').eq('attivo', true).order('ordine'),
    supabase.from('esercizi').select('id, titolo, tipologia, descrizione_breve, pubblico, allenatore_id').order('titolo'),
    supabase.from('allenamento_esercizi').select('esercizio_id').eq('allenamento_id', id),
  ])
  const tutti = libRows ?? []
  const libreriaMia = tutti.filter((e) => e.allenatore_id === user?.id)
  const libreriaPubblica = tutti.filter((e) => e.pubblico && e.allenatore_id !== user?.id)
  const eserciziSelezionati = (aeRows ?? []).map((r) => r.esercizio_id)
  const scalaVoti = (scalaRows ?? []).map((r) => ({ label: r.valore, value: r.valore_num }))

  const categorie = (catRows ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const portieri = (iscr ?? []).map((r) => r.portieri).filter(Boolean)
    .sort((a, b) => `${a.nome}`.localeCompare(`${b.nome}`))

  const valIniziali = {}
  for (const v of vals ?? []) valIniziali[v.portiere_id] = v
  const valIds = (vals ?? []).map((v) => v.id)
  const punteggiIniziali = {}
  if (valIds.length) {
    const { data: pp } = await supabase.from('valutazione_punteggi')
      .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', valIds)
    for (const x of pp ?? []) (punteggiIniziali[x.valutazione_id] ??= {})[x.parametro_id] = x.punteggio
  }

  const dataLabel = new Date(allenamento.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
        <h1>{allenamento.squadre?.nome} · {dataLabel}</h1>
      </div>
      <div className="content">
        <AllenamentoForm allenamento={allenamento} categorie={categorie} stagioneId={allenamento.stagione_id} />
        <h2 className="sezione-titolo">Valutazioni</h2>
        {portieri.length > 0 ? (
          <ValutazioniAllenamento
            allenamentoId={id}
            portieri={portieri}
            parametri={parametri ?? []}
            valIniziali={valIniziali}
            punteggiIniziali={punteggiIniziali}
            scalaVoti={scalaVoti}
            allenamentoNessuno={allenamento.nessuna_valutazione ?? false}
          />
        ) : (
          <div className="empty">Nessun portiere iscritto a questa categoria per la stagione.</div>
        )}
        <h2 className="sezione-titolo">Esercizi della seduta</h2>
        <AllenamentoEsercizi allenamentoId={id} libreriaMia={libreriaMia} libreriaPubblica={libreriaPubblica} selezionatiIniziali={eserciziSelezionati} />
      </div>
    </>
  )
}
