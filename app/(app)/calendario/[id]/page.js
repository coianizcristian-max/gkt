import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
import AllenamentoForm from '@/app/components/AllenamentoForm'
import ValutazioniAllenamento from '@/app/components/ValutazioniAllenamento'
import AllenamentoEsercizi from '@/app/components/AllenamentoEsercizi'
import AllenamentoTabs from '@/app/components/AllenamentoTabs'
import EserciziSedutaEditor from '@/app/components/EserciziSedutaEditor'
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

  // Risolvi accorpata_con: può contenere squadra_id (vecchia) o allenamento_id (nuova)
  let accorpataConAllenamentoId = null
  if (allenamento.accorpata_con) {
    const { data: checkAll } = await supabase
      .from('allenamenti').select('id').eq('id', allenamento.accorpata_con).maybeSingle()
    if (checkAll) {
      accorpataConAllenamentoId = checkAll.id
    } else {
      const { data: altroAll } = await supabase
        .from('allenamenti').select('id')
        .eq('stagione_id', allenamento.stagione_id)
        .eq('squadra_id', allenamento.accorpata_con)
        .eq('data', allenamento.data)
        .maybeSingle()
      if (altroAll) accorpataConAllenamentoId = altroAll.id
    }
  }


  // Nome della categoria accorpata per la testata
  let accorpataConNome = null
  if (allenamento.accorpata_con) {
    // accorpata_con può essere squadra_id o allenamento_id
    const { data: squadraAcc } = await supabase
      .from('squadre').select('nome').eq('id', allenamento.accorpata_con).maybeSingle()
    if (squadraAcc) {
      accorpataConNome = squadraAcc.nome
    } else if (accorpataConAllenamentoId) {
      const { data: allAcc } = await supabase
        .from('allenamenti').select('squadra_id, squadre(nome)')
        .eq('id', accorpataConAllenamentoId).maybeSingle()
      accorpataConNome = allAcc?.squadre?.nome ?? null
    }
  }

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
        .eq('allenamento_id', accorpataConAllenamentoId ?? id).order('ordine'),
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
    { data: attrRows },
  ] = await Promise.all([
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', allenamento.stagione_id),
    supabase.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', allenamento.stagione_id).eq('squadra_id', allenamento.squadra_id),
    supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    supabase.from('valutazioni').select('id, portiere_id, presente, voto, note').eq('allenamento_id', id),
    supabase.from('elenco_voci').select('valore, valore_num, ordine').eq('elenco', 'scala_voti').eq('attivo', true).order('ordine'),
    supabase.from('esercizi').select('id, titolo, tipologia, descrizione_breve, descrizione, note, video_url, immagine_url, pubblico, allenatore_id, durata_minuti, recupero_minuti, profili(ruolo), esercizio_attributi(attributo_id)').order('titolo'),
    supabase.from('allenamento_esercizi').select('esercizio_id, ordine').eq('allenamento_id', accorpataConAllenamentoId ?? id).order('ordine'),
    supabase.from('valutazioni')
      .select('portiere_id, feedback_portiere, nota_portiere, voto_portiere, presente, portieri(nome, cognome)')
      .eq('allenamento_id', id)
      .not('feedback_portiere', 'is', null)
      .order('created_at', { ascending: false }),
    supabase.from('attributi_esercizio').select('id, nome').eq('attivo', true).order('ordine'),
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
  // (client admin: il collegamento è già autorizzato tramite allenamento_esercizi,
  // ma la RLS sulla tabella esercizi potrebbe non far rileggere esercizi pubblici
  // o del responsabile aggiunti in precedenza, facendoli sparire alla riapertura)
  const adminSel = getAdmin()
  const { data: esSelRows } = eserciziOrdinati.length > 0
    ? await adminSel
        .from('esercizi')
        .select('id, titolo, tipologia, descrizione_breve, descrizione, immagine_url, video_url, pubblico, allenatore_id, durata_minuti, recupero_minuti')
        .in('id', eserciziOrdinati)
    : { data: [] }
  const eserciziSelezionati = (esSelRows ?? []).map((e) => ({ ...e, autore_nome: null }))

  // Aggiungi esercizi già selezionati non presenti in libreria (es. di altri allenatori)
  const idNellaLibreria = new Set(tutti.map((e) => e.id))
  const eserciziExtra = eserciziSelezionati.filter((e) => !idNellaLibreria.has(e.id))
  const libreriaPubblicaConExtra = [...libreriaPubblica, ...eserciziExtra]

  // Carica esercizi del responsabile se il preparatore è collegato
  let eserciziResponsabile = []
  try {
    const { data: profiloExt } = await supabase
      .from('profili').select('supervisore_id').eq('id', user.id).maybeSingle()
    const supervisoreId = profiloExt?.supervisore_id ?? null
    if (supervisoreId) {
      const admin = getAdmin()
      const { data: rel } = await admin
        .from('relazioni_supervisione').select('id')
        .eq('supervisore_id', supervisoreId).eq('preparatore_id', user.id).eq('attivo', true).maybeSingle()
      if (rel) {
        const { data: esResp } = await admin
          .from('esercizi')
          .select('id, titolo, tipologia, descrizione_breve, descrizione, note, video_url, immagine_url, pubblico, allenatore_id, durata_minuti, recupero_minuti, esercizio_attributi(attributo_id)')
          .eq('allenatore_id', supervisoreId)
          .eq('archiviato', false)
          .order('titolo')
        // Aggiunge nome responsabile come autore e li mette nella libreria pubblica
        const { data: profResp } = await admin
          .from('profili').select('nome_completo').eq('id', supervisoreId).maybeSingle()
        const nomeResp = profResp?.nome_completo ?? 'Responsabile'
        eserciziResponsabile = (esResp ?? []).map(e => ({
          ...e,
          autore_nome: nomeResp,
          profili: { ruolo: 'allenatore' },
        }))
      }
    }
  } catch (_) {}

  // eserciziResponsabile passati come prop separata a AllenamentoEsercizi

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
        <h1>
          {allenamento.squadra?.nome}
          {accorpataConNome && (
            <span style={{ fontWeight: 400, fontSize: '0.65em', color: 'var(--ink-soft)', marginLeft: 8 }}>
              / {accorpataConNome}
            </span>
          )}
          <span className="topbar-sub"> · {dataLabel}</span>
        </h1>
      </div>
      <div className="content">
        <AllenamentoTabs
          dettaglio={
            <AllenamentoForm allenamento={allenamento} categorie={categorie} stagioneId={allenamento.stagione_id} />
          }
          valutazioni={
            !canValutare ? (
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
            )
          }
          esercizi={
            <>
              <EserciziSedutaEditor
                esercizi={eserciziSelezionati}
                allenamentoId={accorpataConAllenamentoId ?? id}
              />
              {canEsercizi ? <AllenamentoEsercizi
                allenamentoId={accorpataConAllenamentoId ?? id}
                libreriaMia={libreriaMia}
                libreriaPubblica={libreriaPubblicaConExtra}
                eserciziResponsabile={eserciziResponsabile}
                selezionatiIniziali={eserciziOrdinati}
                selezionatiEsercizi={eserciziSelezionati}
                attributiDisponibili={attrRows ?? []}
              /> : <PaywallBanner label="Esercizi negli allenamenti" />}
            </>
          }
          feedback={
            canFeedback && feedback.length > 0 ? (
              <>
                <h2 className="sezione-titolo" style={{ marginTop: 24 }}>Feedback portieri</h2>
                <FeedbackAllenamento feedback={feedback} />
              </>
            ) : null
          }
        />
      </div>
    </>
  )
}
