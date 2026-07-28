import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
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
  const user = await getUser()

  // profilo e allenamento sono indipendenti (il secondo dipende solo da :id):
  // prima giravano in sequenza.
  const [{ data: profilo }, { data: allenamento }] = await Promise.all([
    supabase.from('profili').select('ruolo, portiere_id, supervisore_id').eq('id', user?.id).maybeSingle(),
    supabase.from('allenamenti').select('*, squadra:squadre!allenamenti_squadra_id_fkey(nome)').eq('id', id).maybeSingle(),
  ])
  if (!allenamento) notFound()

  // Risolvi accorpata_con: può contenere squadra_id (vecchia) o allenamento_id (nuova).
  // I due "primi tentativi" (checkAll, squadraAcc) sono indipendenti tra loro.
  let accorpataConAllenamentoId = null
  let accorpataConNome = null
  if (allenamento.accorpata_con) {
    const [{ data: checkAll }, { data: squadraAcc }] = await Promise.all([
      supabase.from('allenamenti').select('id').eq('id', allenamento.accorpata_con).maybeSingle(),
      supabase.from('squadre').select('nome').eq('id', allenamento.accorpata_con).maybeSingle(),
    ])

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

  // Esercizi del responsabile (se il preparatore e' collegato): non dipende da
  // nessuna delle 9 query sotto, solo da profilo.supervisore_id (gia' in mano).
  // Prima partiva dopo l'intero batch sottostante e i suoi passi interni erano
  // sequenziali; ora gira in parallelo e i suoi due passi indipendenti (esResp,
  // profResp) sono un Promise.all.
  async function caricaEserciziResponsabile(supervisoreId) {
    if (!supervisoreId) return []
    try {
      const admin = getAdmin()
      const { data: rel } = await admin
        .from('relazioni_supervisione').select('id')
        .eq('supervisore_id', supervisoreId).eq('preparatore_id', user.id).eq('attivo', true).maybeSingle()
      if (!rel) return []
      const [{ data: esResp }, { data: profResp }] = await Promise.all([
        admin.from('esercizi')
          .select('id, titolo, tipologia, descrizione_breve, descrizione, note, video_url, immagine_url, pubblico, allenatore_id, durata_minuti, recupero_minuti, esercizio_attributi(attributo_id)')
          .eq('allenatore_id', supervisoreId).eq('archiviato', false).order('titolo'),
        admin.from('profili').select('nome_completo').eq('id', supervisoreId).maybeSingle(),
      ])
      const nomeResp = profResp?.nome_completo ?? 'Responsabile'
      return (esResp ?? []).map(e => ({ ...e, autore_nome: nomeResp, profili: { ruolo: 'allenatore' } }))
    } catch (_) {
      return []
    }
  }

  const [bigBatch, eserciziResponsabile] = await Promise.all([
    Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', allenamento.stagione_id),
      supabase.from('iscrizioni').select('id, portieri(id, nome, cognome)')
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
    ]),
    caricaEserciziResponsabile(profilo?.supervisore_id ?? null),
  ])
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
  ] = bigBatch

  const allenatoreIds = [...new Set((libRows ?? []).map((e) => e.allenatore_id).filter(Boolean))]
  const eserciziOrdinati = (aeRows ?? []).sort((a, b) => a.ordine - b.ordine).map((r) => r.esercizio_id)
  const adminSel = getAdmin()

  // Nomi allenatori (per l'autore in libreria) ed esercizi gia' selezionati
  // (client admin, serve a rileggere esercizi pubblici/del responsabile anche
  // se la RLS su "esercizi" non li farebbe rivedere) sono query indipendenti.
  const [{ data: profRows }, { data: esSelRows }] = await Promise.all([
    allenatoreIds.length
      ? supabase.from('profili').select('id, nome_visualizzato').in('id', allenatoreIds)
      : Promise.resolve({ data: [] }),
    eserciziOrdinati.length > 0
      ? adminSel.from('esercizi')
          .select('id, titolo, tipologia, descrizione_breve, descrizione, immagine_url, video_url, pubblico, allenatore_id, durata_minuti, recupero_minuti')
          .in('id', eserciziOrdinati)
      : Promise.resolve({ data: [] }),
  ])
  const nomiAllenatori = {}
  for (const p of profRows ?? []) nomiAllenatori[p.id] = p.nome_visualizzato

  const tutti = (libRows ?? []).map((e) => ({
    ...e,
    autore_nome: e.allenatore_id === user?.id ? null : (nomiAllenatori[e.allenatore_id] ?? null),
  }))
  const libreriaMia = tutti.filter((e) => e.allenatore_id === user?.id)
  const libreriaPubblica = tutti.filter((e) => e.pubblico && e.allenatore_id !== user?.id)

  const eserciziSelezionati = (esSelRows ?? []).map((e) => ({ ...e, autore_nome: null }))

  // Aggiungi esercizi già selezionati non presenti in libreria (es. di altri allenatori)
  const idNellaLibreria = new Set(tutti.map((e) => e.id))
  const eserciziExtra = eserciziSelezionati.filter((e) => !idNellaLibreria.has(e.id))
  const libreriaPubblicaConExtra = [...libreriaPubblica, ...eserciziExtra]

  const scalaVoti = (scalaRows ?? []).map((r) => ({ label: r.valore, value: r.valore_num }))
  const categorie = (catRows ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)

  // Infortuni che coprono la data dell'allenamento (aperti o chiusi ma ancora
  // in corso alla data D): D >= data_inizio AND (data_fine IS NULL OR data_fine >= D).
  const iscrIds = (iscr ?? []).map((r) => r.id).filter(Boolean)
  let infortuniRows = []
  if (iscrIds.length) {
    const { data: infData } = await supabase.from('infortuni')
      .select('id, iscrizione_id, data_inizio')
      .in('iscrizione_id', iscrIds)
      .lte('data_inizio', allenamento.data)
      .or(`data_fine.is.null,data_fine.gte.${allenamento.data}`)
    infortuniRows = infData ?? []
  }
  const infByIscr = {}
  for (const x of infortuniRows) infByIscr[x.iscrizione_id] = x

  const portieri = (iscr ?? [])
    .filter((r) => r.portieri)
    .map((r) => {
      const inf = infByIscr[r.id]
      return {
        ...r.portieri,
        iscrizione_id: r.id,
        infortunato: !!inf,
        infortunioId: inf?.id ?? null,
        infortunioDal: inf?.data_inizio ?? null,
      }
    })
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
                  allenamentoId={id} allenamentoData={allenamento.data} portieri={portieri} parametri={parametri ?? []}
                  valIniziali={valIniziali} punteggiIniziali={punteggiIniziali}
                  scalaVoti={scalaVoti} allenamentoNessuno={allenamento.nessuna_valutazione ?? false}
                />
              </PaywallBanner>
            ) : portieri.length > 0 ? (
              <ValutazioniAllenamento
                allenamentoId={id}
                allenamentoData={allenamento.data}
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
