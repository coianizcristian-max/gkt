import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'
import ValutazioniAllenamento from '@/app/components/ValutazioniAllenamento'
import AllenamentoEsercizi from '@/app/components/AllenamentoEsercizi'
import ValutazionePortiere from '@/app/components/ValutazionePortiere'
import FeedbackAllenamento from '@/app/components/FeedbackAllenamento'
import AllenamentoTabNav from '@/app/components/AllenamentoTabNav'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function AllenamentoPage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  const tabAttivo = sp?.tab ?? 'info'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()

  const { data: allenamento } = await supabase
    .from('allenamenti')
    .select('*, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
    .eq('id', id).maybeSingle()
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
        .select('ordine, esercizi(id, titolo, tipologia, descrizione_breve, descrizione, immagine_url, video_url)')
        .eq('allenamento_id', id).order('ordine'),
    ])
    const esercizi = (aeRows ?? []).map((r) => r.esercizi).filter(Boolean)

    const tabsPortiere = [
      {
        id: 'info',
        label: '📋 Info',
        content: (
          <div>
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
                    {(e.descrizione_breve || e.descrizione || e.video_url) && (
                      <div className="es-seduta-body">
                        {e.descrizione_breve && <p><em>{e.descrizione_breve}</em></p>}
                        {e.descrizione && <p>{e.descrizione}</p>}
                        {e.video_url && (
                          <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                            style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#ff0000',color:'#fff',borderRadius:'var(--r-sm)',fontWeight:600,fontSize:12,textDecoration:'none',marginTop:4}}>
                            ▶ Guarda il video
                          </a>
                        )}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            ) : (
              <div className="empty">Nessun esercizio inserito per questa seduta.</div>
            )}
          </div>
        ),
      },
      {
        id: 'valutazione',
        label: '⭐ La mia valutazione',
        content: (
          <ValutazionePortiere
            allenamentoId={id}
            portiereId={profilo.portiere_id}
            presente={mia?.presente ?? false}
            votoIniziale={mia?.voto_portiere ?? 0}
            feedbackIniziale={mia?.feedback_portiere ?? ''}
            notaIniziale={mia?.nota_portiere ?? ''}
          />
        ),
      },
    ]

    return (
      <>
        <div className="topbar">
          <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
          <h1>{allenamento.squadra?.nome}<span className="topbar-sub"> · {dataLabel}</span></h1>
        </div>
        <div className="content">
          <AllenamentoTabNav tabs={[{id:'info',label:'📋 Esercizi'},{id:'valutazione',label:'⭐ La mia valutazione'}]} tabAttivo={tabAttivo} />
          {tabAttivo === 'info' && tabsPortiere[0].content}
          {tabAttivo === 'valutazione' && tabsPortiere[1].content}
        </div>
      </>
    )
  }

  // ── VISTA STAFF ───────────────────────────────────────────────────────────
  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canValutare = isUnlocked('valutazioni_allenamento', gatingCfg, abbAttivo)
  const canEsercizi = isUnlocked('esercizi_allenamento', gatingCfg, abbAttivo)
  const canFeedback = isUnlocked('feedback_allenatore', gatingCfg, abbAttivo)

  const [{ data: catRows }, { data: iscr }, { data: parametri }, { data: vals }, { data: scalaRows }, { data: libRows }, { data: aeRows }, { data: feedbackRows }] = await Promise.all([
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', allenamento.stagione_id),
    supabase.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', allenamento.stagione_id).eq('squadra_id', allenamento.squadra_id),
    supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    supabase.from('valutazioni').select('id, portiere_id, presente, voto, note').eq('allenamento_id', id),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'scala_voti').eq('attivo', true).order('ordine'),
    supabase.from('esercizi').select('id, titolo, tipologia, descrizione_breve, immagine_url, video_url, pubblico, allenatore_id').order('titolo'),
    supabase.from('allenamento_esercizi').select('esercizio_id, ordine').eq('allenamento_id', id).order('ordine'),
    supabase.from('valutazioni')
      .select('portiere_id, feedback_portiere, nota_portiere, voto_portiere, presente, portieri(nome, cognome)')
      .eq('allenamento_id', id).not('feedback_portiere', 'is', null).order('created_at', { ascending: false }),
  ])

  // Se accorpata_con, aggiungi anche portieri della seconda categoria
  let portieriExtra = []
  if (allenamento.accorpata_con) {
    const { data: iscrExtra } = await supabase.from('iscrizioni')
      .select('portieri(id, nome, cognome), squadre(nome)')
      .eq('stagione_id', allenamento.stagione_id).eq('squadra_id', allenamento.accorpata_con)
    portieriExtra = (iscrExtra ?? []).map((r) => ({
      ...r.portieri,
      _cat: r.squadre?.nome ?? 'Altra categoria',
    })).filter(Boolean)
  }

  const libreriaMia = (libRows ?? []).filter((e) => e.allenatore_id === user?.id)
  const libreriaPubblica = (libRows ?? []).filter((e) => e.pubblico && e.allenatore_id !== user?.id)
  const eserciziOrdinati = (aeRows ?? []).sort((a, b) => a.ordine - b.ordine).map((r) => r.esercizio_id)
  const scalaVoti = (scalaRows ?? []).map((r) => ({ label: r.valore, value: r.valore_num }))
  const categorie = (catRows ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const portieri = (iscr ?? []).map((r) => r.portieri).filter(Boolean).sort((a, b) => `${a.nome}`.localeCompare(`${b.nome}`))
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
    testo: r.feedback_portiere, nota: r.nota_portiere,
    voto: r.voto_portiere, presente: r.presente,
  }))

  const tabsStaff = [
    {
      id: 'info',
      label: '📋 Info',
      content: <AllenamentoForm allenamento={allenamento} categorie={categorie} stagioneId={allenamento.stagione_id} />,
    },
    {
      id: 'valutazioni',
      label: `⭐ Valutazioni (${portieri.length + portieriExtra.length})`,
      content: (
        <div>
          {!canValutare ? (
            <PaywallBanner chiave="valutazioni_allenamento" label="Valutazioni allenamento" wrap>
              <ValutazioniAllenamento allenamentoId={id} portieri={portieri} parametri={parametri ?? []}
                valIniziali={valIniziali} punteggiIniziali={punteggiIniziali}
                scalaVoti={scalaVoti} allenamentoNessuno={allenamento.nessuna_valutazione ?? false} />
            </PaywallBanner>
          ) : (
            <>
              {portieri.length > 0 ? (
                <ValutazioniAllenamento allenamentoId={id} portieri={portieri} parametri={parametri ?? []}
                  valIniziali={valIniziali} punteggiIniziali={punteggiIniziali}
                  scalaVoti={scalaVoti} allenamentoNessuno={allenamento.nessuna_valutazione ?? false} />
              ) : (
                <div className="empty">Nessun portiere iscritto a questa categoria per la stagione.</div>
              )}
              {portieriExtra.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 className="sezione-titolo">Portieri accorpati — {portieriExtra[0]._cat}</h3>
                  <ValutazioniAllenamento allenamentoId={id} portieri={portieriExtra} parametri={parametri ?? []}
                    valIniziali={valIniziali} punteggiIniziali={punteggiIniziali}
                    scalaVoti={scalaVoti} allenamentoNessuno={allenamento.nessuna_valutazione ?? false} />
                </div>
              )}
              {canFeedback && feedback.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 className="sezione-titolo">Feedback portieri</h3>
                  <FeedbackAllenamento feedback={feedback} />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      id: 'esercizi',
      label: `💪 Esercizi (${eserciziOrdinati.length})`,
      content: canEsercizi
        ? <AllenamentoEsercizi allenamentoId={id} libreriaMia={libreriaMia}
            libreriaPubblica={libreriaPubblica} selezionatiIniziali={eserciziOrdinati} />
        : <PaywallBanner chiave="esercizi_allenamento" label="Esercizi negli allenamenti" />,
    },
  ]

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/calendario">Calendario</Link></div>
        <h1>{allenamento.squadra?.nome}<span className="topbar-sub"> · {dataLabel}</span></h1>
      </div>
      <div className="content">
          <AllenamentoTabNav
            tabs={[
              {id:'info', label:'📋 Info'},
              {id:'valutazioni', label:'⭐ Valutazioni'},
              {id:'esercizi', label:'💪 Esercizi'},
            ]}
            tabAttivo={tabAttivo}
          />
          {tabAttivo === 'info' && tabsStaff[0].content}
          {tabAttivo === 'valutazioni' && tabsStaff[1].content}
          {tabAttivo === 'esercizi' && tabsStaff[2].content}
        </div>
    </>
  )
}
