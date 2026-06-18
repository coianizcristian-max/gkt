import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'
import ValutazioniAllenamento from '@/app/components/ValutazioniAllenamento'
import AllenamentoEsercizi from '@/app/components/AllenamentoEsercizi'
import ValutazionePortiere from '@/app/components/ValutazionePortiere'

export const dynamic = 'force-dynamic'

export default async function AllenamentoPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()

  const { data: allenamento } = await supabase
    .from('allenamenti').select('*, squadre(nome)').eq('id', id).maybeSingle()
  if (!allenamento) notFound()

  const dataLabel = new Date(allenamento.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ----- VISTA PORTIERE: sola lettura + valutazione personale -----
  if (profilo?.ruolo === 'portiere') {
    const [{ data: mia }, { data: aeRows }] = await Promise.all([
      supabase.from('valutazioni')
        .select('presente, voto_portiere, feedback_portiere, nota_portiere')
        .eq('allenamento_id', id).eq('portiere_id', profilo.portiere_id).maybeSingle(),
      supabase.from('allenamento_esercizi')
        .select('esercizi(id, titolo, tipologia, descrizione_breve)').eq('allenamento_id', id),
    ])
    const esercizi = (aeRows ?? []).map((r) => r.esercizi).filter(Boolean)

    return (
      <>
        <div className="topbar">
          <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
          <h1>{allenamento.squadre?.nome} · {dataLabel}</h1>
        </div>
        <div className="content">
          <h2 className="sezione-titolo">Esercizi della seduta</h2>
          {esercizi.length > 0 ? (
            <div className="scheda">
              {esercizi.map((e) => (
                <div key={e.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <b>{e.titolo}</b>
                  {e.tipologia && <span className="stat-cat">{e.tipologia}</span>}
                  {e.descrizione_breve && <span style={{ color: 'var(--ink-soft)' }}>{e.descrizione_breve}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Nessun esercizio inserito per questa seduta.</div>
          )}

          <h2 className="sezione-titolo">La tua valutazione</h2>
          <ValutazionePortiere
            allenamentoId={id}
            portiereId={profilo.portiere_id}
            presente={mia?.presente ?? false}
            votoIniziale={mia?.voto_portiere ?? 0}
            feedbackIniziale={mia?.feedback_portiere ?? ''}
            notaIniziale={mia?.nota_portiere ?? ''}
          />
        </div>
      </>
    )
  }

  // ----- VISTA STAFF/ALLENATORE: invariata -----
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