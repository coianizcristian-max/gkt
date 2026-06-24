import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'
import ValutazioniAllenamento from '@/app/components/ValutazioniAllenamento'
import AllenamentoEsercizi from '@/app/components/AllenamentoEsercizi'
import ValutazionePortiere from '@/app/components/ValutazionePortiere'
import FeedbackAllenamento from '@/app/components/FeedbackAllenamento'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function AllenamentoPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()

  const { data: allenamento } = await supabase
    .from('allenamenti').select('*, squadra:squadre!allenamenti_squadra_id_fkey(nome)').eq('id', id).maybeSingle()
  if (!allenamento) notFound()

  const dataLabel = new Date(allenamento.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ── VISTA PORTIERE ────────────────────────────────────────────────────────
  if (profilo?.ruolo === 'portiere') {
    const [{ data: mia }, { data: aeRows }] = await Promise.all([
      supabase.from('valutazioni')
        .select('presente, voto_portiere, feedback_portiere, nota_portiere')
        .eq('allenamento_id', id).eq('portiere_id', profilo.portiere_id).maybeSingle(),
      supabase.from('allenamento_esercizi')
        .select('ordine, esercizi(id, titolo, tipologia, descrizione_breve, descrizione, immagine_url)')
        .eq('allenamento_id', id).order('ordine'),
    ])
    const esercizi = (aeRows ?? [])
      .map((r) => r.esercizi).filter(Boolean)

    return (
      <>
        <div className="topbar">
          <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
          <h1>{allenamento.squadra?.nome} · {dataLabel}</h1>
        </div>
        <div className="content">
          <h2 className="sezione-titolo">Esercizi della seduta</h2>
          {esercizi.length > 0 ? (
            <div className="es-seduta-grid">
              {esercizi.map((e) => (
                <details key={e.id} className="es-seduta-card">
                  <summary>
                    {e.immagine_url && <img src={e.immagine_url} className="es-seduta-thumb" alt="" />}
                    <div>
                      <div className="es-seduta-titolo">{e.titolo}</div>
                      {e.tipologia && <span className="stat-cat">{e.tipologia}</span>}
                    </div>
                  </summary>
                  {(e.descrizione_breve || e.descrizione) && (
                    <div className="es-seduta-body">
                      {e.descrizione_breve && <p><em>{e.descrizione_breve}</em></p>}
                      {e.descrizione && <p>{e.descrizione}</p>}
                    </div>
                  )}
                </details>
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

  // ── VISTA STAFF/ALLENATORE ────────────────────────────────────────────────
  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canValutare = isUnlocked('valutazioni_allenamento', gatingCfg, abbAttivo)
  const canEsercizi = isUnlocked('esercizi_allenamento', gatingCfg, abbAttivo)
  const canFeedback = isUnlocked('feedback_allenatore', gatingCfg, abbAttivo)

  const [
    { data: catRows },
    { data: iscr },
    { data: parametri },
    { data: vals },
    { data: scalaRows },
    { data: libRows },
    { data: aeRows },
    { data: feedbackRows },
  ] = await Promise.all([
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', allenamento.stagione_id),
    supabase.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', allenamento.stagione_id).eq('squadra_id', allenamento.squadra_id),
    supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    supabase.from('valutazioni').select('id, portiere_id, presente, voto, note').eq('allenamento_id', id),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'scala_voti').eq('attivo', true).order('ordine'),
    supabase.from('esercizi').select('id, titolo, tipologia, descrizione_breve, immagine_url, pubblico, allenatore_id, profili(ruolo)').order('titolo'),
    supabase.from('allenamento_esercizi').select('esercizio_id, ordine').eq('allenamento_id', id).order('ordine'),
    supabase.from('valutazioni')
      .select('portiere_id, feedback_portiere, nota_portiere, voto_portiere, presente, portieri(nome, cognome)')
      .eq('allenamento_id', id)
      .not('feedback_portiere', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  // Carica nomi allenatori per gli esercizi (per mostrare autore)
  const allenatoreIds = [...new Set((libRows ?? []).map((e) => e.allenatore_id).filter(Boolean))]
  let nomiAllenatori = {}
  if (allenatoreIds.length) {
    const { data: profRows } = await supabase
      .from('profili').select('id, nome_visualizzato').in('id', allenatoreIds)
    for (const p of profRows ?? []) nomiAllenatori[p.id] = p.nome_visualizzato
  }

  const tutti = (libRows ?? []).map((e) => ({
    ...e,
    autore_nome: e.allenatore_id === user?.id ? null : (nomiAllenatori[e.allenatore_id] ?? null),
  }))
  const libreriaMia = tutti.filter((e) => e.allenatore_id === user?.id)
  const libreriaPubblica = tutti.filter((e) => e.pubblico && e.allenatore_id !== user?.id)


  // Ordine esercizi dell'allenamento (per selezionatiIniziali)
  const eserciziOrdinati = (aeRows ?? []).sort((a, b) => a.ordine - b.ordine).map((r) => r.esercizio_id)

  // Carica gli esercizi già selezionati nell'allenamento con una query separata
  // per garantire che compaiano anche se non visibili tramite RLS della libreria
  const { data: esSelRows } = eserciziOrdinati.length > 0
    ? await supabase
        .from('esercizi')
        .select('id, titolo, tipologia, descrizione_breve, immagine_url, pubblico, allenatore_id')
        .in('id', eserciziOrdinati)
    : { data: [] }
  const eserciziSelezionati = (esSelRows ?? []).map((e) => ({ ...e, autore_nome: null }))

  // Aggiungi esercizi già selezionati non presenti in libreria (es. di altri allenatori)
  const idNellaLibreria = new Set(tutti.map((e) => e.id))
  const eserciziExtra = eserciziSelezionati.filter((e) => !idNellaLibreria.has(e.id))
  const libreriaPubblicaConExtra = [...libreriaPubblica, ...eserciziExtra]

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

  const feedback = (feedbackRows ?? []).map((r) => ({
    portiere_id: r.portiere_id,
    nome: r.portieri ? `${r.portieri.nome} ${r.portieri.cognome ?? ''}`.trim() : '—',
    testo: r.feedback_portiere,
    nota: r.nota_portiere,
    voto: r.voto_portiere,
    presente: r.presente,
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
        <h1>{allenamento.squadra?.nome}<span className="topbar-sub"> · {dataLabel}</span></h1>
      </div>
      <div className="content">
        <AllenamentoForm allenamento={allenamento} categorie={categorie} stagioneId={allenamento.stagione_id} />

        <h2 className="sezione-titolo">Valutazioni</h2>
        {!canValutare ? (
          <PaywallBanner label="Valutazioni allenamento" wrap>
            <ValutazioniAllenamento
              allenamentoId={id} portieri={portieri} parametri={parametri ?? []}
              valIniziali={valIniziali} punteggiIniziali={punteggiIniziali}
              scalaVoti={scalaVoti} allenamentoNessuno={allenamento.nessuna_valutazione ?? false}
            />
          </PaywallBanner>
        ) : portieri.length > 0 ? (
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
        {canEsercizi ? <AllenamentoEsercizi
          allenamentoId={id}
          libreriaMia={libreriaMia}
          libreriaPubblica={libreriaPubblicaConExtra}
          selezionatiIniziali={eserciziOrdinati}
        /> : <PaywallBanner label="Esercizi negli allenamenti" />}

        {canFeedback && feedback.length > 0 && (
          <>
            <h2 className="sezione-titolo">Feedback portieri</h2>
            <FeedbackAllenamento feedback={feedback} />
          </>
        )}
      </div>
    </>
  )
}
