import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import { getStagioneAttiva } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'

export const dynamic = 'force-dynamic'

function fmtData(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtOra(t) { return t ? t.slice(0, 5) : '' }
// timestamptz -> "12 set, 18:40" nel fuso italiano
function fmtQuando(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect('/login')
  const t = await getTranslations('dashboard')
  const c = await getTranslations('common')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, benvenuto_visto, nome_visualizzato, nome_completo, via, citta, cap').eq('id', user.id).maybeSingle()

  // Portieri: la PRIMA volta li mandiamo sulla loro scheda (per completare i
  // dati); dalle volte successive direttamente sul calendario, piu' pratico.
  if (profilo?.ruolo === 'portiere' && profilo.portiere_id) {
    redirect(profilo.benvenuto_visto ? '/calendario' : `/portieri/${profilo.portiere_id}`)
  }
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  // In modalita' demo cambiano la sorgente dei dati (sola lettura sull'account
  // demo) e la data di riferimento. Fuori dalla demo: identico a prima.
  const { db, stagione, taglio, oggi: oggiCtx } = await contestoDati(supabase, user.id)

  // "Oggi" nel fuso italiano (Europe/Rome), NON in UTC: con toISOString() tra mezzanotte
  // e le ~02:00 (ora legale) la data risultava ancora quella di ieri, e le sedute odierne
  // non comparivano come "da valutare"/"prossime". È la radice del vecchio bug "tutto valutato".
  const oggiStr = oggiCtx
  // +7 giorni sulla data (ancorati a mezzogiorno UTC per evitare problemi di confine giorno)
  const tra7ggDate = new Date(oggiStr + 'T12:00:00Z')
  tra7ggDate.setUTCDate(tra7ggDate.getUTCDate() + 7)
  const tra7ggStr = tra7ggDate.toISOString().slice(0, 10)
  // -7 giorni: finestra dei feedback lasciati dai portieri sulle sedute recenti
  const da7ggDate = new Date(oggiStr + 'T12:00:00Z')
  da7ggDate.setUTCDate(da7ggDate.getUTCDate() - 7)
  const da7ggStr = da7ggDate.toISOString().slice(0, 10)

  let daValutareAllenamenti = []
  let daValutarePartite = []
  let prossimoAllenamento = null
  let partiteImminenti = []
  let misurazioniDaFare = []
  let feedbackRecenti = []
  let proposteDaGestire = []
  let coupon = null

  // ── Stato configurazione iniziale (per la checklist di onboarding) ──
  let haCategorie = false
  let haPortieri = false
  let haAllenamenti = false
  const nomeProfilo = (profilo?.nome_visualizzato || profilo?.nome_completo || '').trim()
  // Il profilo è "completo" quando ha i campi che servono davvero: nome e indirizzo.
  // Senza via/città/CAP la geocodifica non parte e non si compare nella ricerca per zona.
  const haProfiloCompilato = !!(
    profilo?.nome_completo?.trim() &&
    profilo?.via?.trim() &&
    profilo?.citta?.trim() &&
    profilo?.cap?.trim()
  )

  // ── Portieri da attenzionare: assenze ripetute, calo rendimento, obiettivi in ritardo ──
  let portieriAttenzione = []

  if (stagione) {
    // Le 5 query di questo primo batch sono indipendenti tra loro (dipendono solo
    // da stagione.id / user.id): eseguirle in sequenza sprecava 5 round-trip.
    // La query "iscrizioni" serve sia per haPortieri sia per l'elenco portieri
    // usato piu' sotto: prima erano due query separate con select diversi.
    const [allRows, parRows, couponRow, catRow, iscrRows] = await Promise.all([
      db.from('allenamenti')
        .select('id, data, ora_inizio, nessuna_valutazione, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      db.from('partite')
        .select('id, data, avversario, casa, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('coupon_utilizzi').select('scade_il').eq('utente_id', user.id)
        .gt('scade_il', new Date().toISOString()).order('scade_il', { ascending: false }).limit(1).maybeSingle(),
      db.from('stagione_categorie').select('id').eq('stagione_id', stagione.id).limit(1),
      db.from('iscrizioni').select('portiere_id, portieri(id, nome, cognome, attivo)').eq('stagione_id', stagione.id),
    ])

    haCategorie = (catRow.data ?? []).length > 0
    haPortieri = (iscrRows.data ?? []).some((i) => i.portieri?.attivo)
    haAllenamenti = (allRows.data ?? []).length > 0

    const allenamenti = allRows.data ?? []
    const partiteRows = parRows.data ?? []
    const allenIds = allenamenti.map((a) => a.id)
    const partitaIds = partiteRows.map((p) => p.id)
    // In demo le sedute e le partite OLTRE la data di taglio restano visibili
    // (programmate), ma non devono avere valutazioni: la stagione si vede
    // "compilata fino a" e "ancora da compilare" dopo.
    const allenIdsVal = taglio ? allenamenti.filter((a) => entroTaglio(a.data, taglio)).map((a) => a.id) : allenIds
    const partitaIdsVal = taglio ? partiteRows.filter((p) => entroTaglio(p.data, taglio)).map((p) => p.id) : partitaIds
    const portieriList = (iscrRows.data ?? []).map((r) => r.portieri).filter(Boolean)
    const portiereIds = portieriList.map((p) => p.id)

    // Anche questo secondo batch e' indipendente al suo interno: valRows/valParRows
    // servono ai blocchi "da valutare", valPortRows/obRows al blocco "da attenzionare".
    const [valRows, valParRows, valPortRows, obRows] = await Promise.all([
      allenIdsVal.length ? db.from('valutazioni').select('allenamento_id').not('voto', 'is', null).in('allenamento_id', allenIdsVal) : Promise.resolve({ data: [] }),
      partitaIdsVal.length ? db.from('valutazioni_partita').select('partita_id').eq('presente', true).in('partita_id', partitaIdsVal) : Promise.resolve({ data: [] }),
      portiereIds.length && allenIdsVal.length ? db.from('valutazioni').select('portiere_id, allenamento_id, presente, voto').in('portiere_id', portiereIds).in('allenamento_id', allenIdsVal) : Promise.resolve({ data: [] }),
      portiereIds.length ? db.from('obiettivi').select('portiere_id, scadenza, stato').in('portiere_id', portiereIds) : Promise.resolve({ data: [] }),
    ])

    const valutatiSet = new Set((valRows.data ?? []).map((v) => v.allenamento_id))
    const partite = partiteRows
    const partiteValutateSet = new Set((valParRows.data ?? []).map((v) => v.partita_id))

    // Allenamenti passati senza valutazione
    daValutareAllenamenti = allenamenti
      .filter((a) => a.data < oggiStr && !valutatiSet.has(a.id) && !a.nessuna_valutazione)
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8)

    // Prossimo allenamento futuro (incluso oggi)
    // "Prossimo allenamento" = la prima seduta non ancora iniziata, considerando anche
    // l'ORA (non solo la data): altrimenti a sera propone ancora una seduta di oggi mattina
    // già svolta. Ora corrente nel fuso italiano.
    const oraRomaHM = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour12: false }).slice(0, 5)
    prossimoAllenamento = allenamenti
      .filter((a) => a.data > oggiStr || (a.data === oggiStr && (a.ora_inizio ?? '99:99').slice(0, 5) > oraRomaHM))
      .sort((a, b) => a.data.localeCompare(b.data) || (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? ''))[0] ?? null

    // Partite nei prossimi 7 giorni
    partiteImminenti = partite
      .filter((p) => p.data >= oggiStr && p.data <= tra7ggStr)
      .sort((a, b) => a.data.localeCompare(b.data))

    // Partite passate senza valutazioni
    daValutarePartite = partite
      .filter((p) => p.data < oggiStr && !partiteValutateSet.has(p.id))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 5)

    coupon = couponRow.data

    if (portiereIds.length) {
      const dataByAllen = {}
      for (const a of allenamenti) dataByAllen[a.id] = a.data

      const motiviPerPortiere = {}
      const aggiungiMotivo = (pid, motivo) => (motiviPerPortiere[pid] ??= []).push(motivo)

      // Raggruppa valutazioni per portiere, ordinate per data allenamento
      const valByPortiere = {}
      for (const v of valPortRows.data ?? []) {
        const data = dataByAllen[v.allenamento_id]
        if (!data) continue
        ;(valByPortiere[v.portiere_id] ??= []).push({ ...v, data })
      }
      for (const pid of Object.keys(valByPortiere)) {
        const serie = valByPortiere[pid].sort((a, b) => b.data.localeCompare(a.data))

        // Assenze ripetute: 2+ assenze nelle ultime 3 convocazioni
        const ultime3 = serie.slice(0, 3)
        const assenze = ultime3.filter((v) => !v.presente).length
        if (ultime3.length >= 2 && assenze >= 2) aggiungiMotivo(pid, t('motivoAssenze', { assenze, tot: ultime3.length }))

        // Calo rendimento: media ultime 3 presenti vs media 3 precedenti
        const presentiConVoto = serie.filter((v) => v.presente && v.voto != null)
        if (presentiConVoto.length >= 4) {
          const recenti = presentiConVoto.slice(0, 3).map((v) => Number(v.voto))
          const precedenti = presentiConVoto.slice(3, 6).map((v) => Number(v.voto))
          if (precedenti.length >= 2) {
            const mediaRecente = recenti.reduce((s, x) => s + x, 0) / recenti.length
            const mediaPrecedente = precedenti.reduce((s, x) => s + x, 0) / precedenti.length
            const calo = mediaRecente - mediaPrecedente
            if (calo <= -1.5) aggiungiMotivo(pid, t('motivoCalo', { prima: mediaPrecedente.toFixed(1), dopo: mediaRecente.toFixed(1) }))
          }
        }
      }

      // Obiettivi in ritardo: scadenza superata e non raggiunto
      for (const o of obRows.data ?? []) {
        if (o.scadenza && o.scadenza < oggiStr && o.stato !== 'raggiunto') {
          aggiungiMotivo(o.portiere_id, t('motivoObiettivo'))
        }
      }

      portieriAttenzione = portieriList
        .filter((p) => motiviPerPortiere[p.id]?.length > 0)
        .map((p) => ({ ...p, motivi: motiviPerPortiere[p.id] }))
    }

    if (portiereIds.length) {
      const { data: propRows } = await supabase
        .from('proposte_obiettivi').select('portiere_id')
        .eq('stagione_id', stagione.id).eq('stato', 'da_gestire')
        .in('portiere_id', portiereIds)
      const contPerPortiere = {}
      for (const r of propRows ?? []) contPerPortiere[r.portiere_id] = (contPerPortiere[r.portiere_id] ?? 0) + 1
      proposteDaGestire = portieriList
        .filter((p) => contPerPortiere[p.id] > 0)
        .map((p) => ({ id: p.id, nome: `${p.nome ?? ''} ${p.cognome ?? ''}`.trim(), n: contPerPortiere[p.id] }))
    }

    // \u2500\u2500 Misurazioni oggettive da fare (test con cadenza, prossima <= oggi) \u2500\u2500
    if (portiereIds.length) {
      const { data: obMis } = await supabase
        .from('obiettivi').select('id, titolo, portiere_id')
        .in('portiere_id', portiereIds).eq('stagione_id', stagione.id)
      const obById = {}
      for (const o of obMis ?? []) obById[o.id] = o
      const obIds = (obMis ?? []).map((o) => o.id)
      if (obIds.length) {
        const { data: testRows } = await supabase
          .from('obiettivo_test')
          .select('id, nome, unita, tipo_misura, cadenza_giorni, data_inizio, obiettivo_id')
          .not('cadenza_giorni', 'is', null).in('obiettivo_id', obIds)
        const tests = testRows ?? []
        if (tests.length) {
          const tIds = tests.map((t) => t.id)
          const { data: rilRows } = await supabase
            .from('obiettivo_rilevazioni').select('test_id, data, valore, riusciti, tentativi')
            .in('test_id', tIds).order('data', { ascending: false })
          const ultimaByTest = {}
          for (const r of rilRows ?? []) if (!ultimaByTest[r.test_id]) ultimaByTest[r.test_id] = r
          const nomePortiere = {}
          for (const p of portieriList) nomePortiere[p.id] = `${p.nome ?? ''} ${p.cognome ?? ''}`.trim()
          misurazioniDaFare = tests.map((t) => {
            const ob = obById[t.obiettivo_id]
            if (!ob) return null
            const ult = ultimaByTest[t.id]
            const base = ult?.data ?? t.data_inizio
            if (!base) return null
            const d = new Date(base + 'T12:00:00Z')
            d.setUTCDate(d.getUTCDate() + t.cadenza_giorni)
            const prossima = d.toISOString().slice(0, 10)
            let ultimoValore = null
            if (ult) {
              if (t.tipo_misura === 'su_totale') {
                const tot = ult.tentativi ?? 0
                const ok = ult.riusciti ?? ult.valore ?? 0
                ultimoValore = `${ok}/${tot}${tot ? ` (${Math.round((ok / tot) * 100)}%)` : ''}`
              } else {
                ultimoValore = `${ult.valore ?? '—'}${t.unita ? ' ' + t.unita : ''}`
              }
            }
            return { testId: t.id, testNome: t.nome, obiettivo: ob.titolo ?? '', portiereId: ob.portiere_id, portiere: nomePortiere[ob.portiere_id] ?? '', prossima, ultimoValore }
          }).filter((x) => x && x.prossima <= oggiStr)
            .sort((a, b) => a.prossima.localeCompare(b.prossima))
            .slice(0, 10)
        }
      }
    }
    // ── Feedback lasciati dai portieri sulle sedute degli ultimi 7 giorni ──
    // Finestra sulla DATA DELL'ALLENAMENTO (non su quella del feedback): cosi'
    // funziona anche sullo storico, dove feedback_portiere_il non e' valorizzato
    // perche' la colonna e' stata aggiunta dopo.
    const allenRecenti = allenamenti.filter((a) => a.data >= da7ggStr && a.data <= oggiStr)
    if (allenRecenti.length) {
      const recentiById = {}
      for (const a of allenRecenti) recentiById[a.id] = a
      const nomePort = {}
      for (const p of portieriList) nomePort[p.id] = `${p.nome ?? ''} ${p.cognome ?? ''}`.trim()

      const { data: fbRows } = await db
        .from('valutazioni')
        .select('allenamento_id, portiere_id, voto_portiere, feedback_portiere, feedback_portiere_il')
        .in('allenamento_id', Object.keys(recentiById))
        .or('feedback_portiere.not.is.null,voto_portiere.not.is.null')

      feedbackRecenti = (fbRows ?? [])
        .map((r) => {
          const a = recentiById[r.allenamento_id]
          if (!a) return null
          return {
            allenamentoId: r.allenamento_id,
            portiereId: r.portiere_id,
            portiere: nomePort[r.portiere_id] ?? '',
            categoria: a.squadra?.nome ?? '',
            dataAllenamento: a.data,
            dataFeedback: r.feedback_portiere_il ?? null,
            voto: r.voto_portiere,
            testo: r.feedback_portiere,
          }
        })
        .filter(Boolean)
        // I piu' recenti in cima: per data del feedback quando c'e', altrimenti
        // per data della seduta.
        .sort((x, y) =>
          (y.dataFeedback ?? y.dataAllenamento).localeCompare(x.dataFeedback ?? x.dataAllenamento))
        .slice(0, 12)
    }
  }

  const totDaValutare = daValutareAllenamenti.length + daValutarePartite.length
  const couponGiorni = coupon ? Math.ceil((new Date(coupon.scade_il) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const saluto = nomeProfilo ? t('salutoNome', { nome: nomeProfilo.split(' ')[0] }) : t('saluto')

  const checksOnboarding = [
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
  ]

  // ── Blocchi standard della dashboard: riusati sia a regime sia al primo accesso
  //    (lì restano vuoti, ma fanno vedere all'utente dove sta andando). ──
  const blocchiStandard = (
    <>
      <div className="dash-grid">
        {/* Prossimo allenamento */}
        <div className="scheda" style={{ maxWidth: 'none' }}>
          <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>{t('prossimoAllenamento')}</h3>
          {prossimoAllenamento ? (
            <Link href={`/calendario/${prossimoAllenamento.id}`} className="link-inline" style={{ display: 'block' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{prossimoAllenamento.squadra?.nome}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                {prossimoAllenamento.data === oggiStr ? t('oggi') : fmtData(prossimoAllenamento.data)}
                {prossimoAllenamento.ora_inizio ? ` · ${fmtOra(prossimoAllenamento.ora_inizio)}` : ''}
              </div>
            </Link>
          ) : (
            <p className="sub-intro" style={{ margin: 0 }}>{t('nessunAllenamento')}</p>
          )}
        </div>

        {/* Partite imminenti */}
        <div className="scheda" style={{ maxWidth: 'none' }}>
          <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>{t('partite7gg')}</h3>
          {partiteImminenti.length === 0 ? (
            <p className="sub-intro" style={{ margin: 0 }}>{t('nessunaPartita')}</p>
          ) : partiteImminenti.map((p) => (
            <Link key={p.id} href={`/partite/${p.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{p.squadre?.nome ? `${p.squadre.nome} · ` : ''}{p.casa === true ? '🏠' : p.casa === false ? '✈' : '❔'} {p.avversario || '—'}</span>
              <span className="dv-data">{fmtData(p.data)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Link rapidi */}
      <div className="scheda" style={{ marginTop: 16, maxWidth: 'none' }}>
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>{t('accessoRapido')}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/portieri" className="btn-ghost" style={{ fontSize: 13 }}>{t('qkPortieri')}</Link>
          <Link href="/calendario" className="btn-ghost" style={{ fontSize: 13 }}>{t('qkCalendario')}</Link>
          <Link href="/partite" className="btn-ghost" style={{ fontSize: 13 }}>{t('qkPartite')}</Link>
          <Link href="/statistiche" className="btn-ghost" style={{ fontSize: 13 }}>{t('qkStatistiche')}</Link>
        </div>
      </div>
    </>
  )

  // ── Primo accesso: senza stagione mostriamo i passi da fare in cima,
  //    e sotto le finestre standard (vuote) per far vedere dove si arriva. ──
  if (profilo?.ruolo === 'allenatore' && !stagione) {
    return (
      <>
        <div className="topbar">
          <div className="eyebrow">{t('benvenuto')}</div>
          <h1>{saluto}</h1>
        </div>
        <div className="content">
          <p className="sub-intro" style={{ marginBottom: 16 }}>
            {t('introSetup')}
          </p>
          <OnboardingChecklist checks={checksOnboarding} />

          {proposteDaGestire.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--giallo)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--giallo)' }}>{t('proposteTitolo')}</h3>
            {proposteDaGestire.map((p) => (
              <Link key={p.id} href={`/portieri/${p.id}/obiettivi`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{t.rich('proposteRiga', { nome: p.nome || '\u2014', n: p.n, b: (ch) => <b>{ch}</b> })}</span>
                <span className="dv-data">{t('proposteGestisci')}</span>
              </Link>
            ))}
          </div>
          )}

          {blocchiStandard}

          <div className="scheda" style={{ marginTop: 16, maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 14 }}>{t('bisognoMano')}</h3>
            <p className="sub-intro" style={{ margin: 0 }}>
              {t.rich('aiutoBox', { comeIniziare: (ch) => <Link href="/come-iniziare" className="link-inline">{ch}</Link>, contatti: (ch) => <Link href="/contatti" className="link-inline">{ch}</Link> })}
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('stagione', { nome: stagione?.nome ?? '—' })}</div>
        <h1>{saluto}</h1>
      </div>
      <div className="content">

        {couponGiorni != null && (
          <div style={{ background: 'rgba(232,167,44,0.12)', border: '1px solid var(--giallo)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--giallo)', fontWeight: 600 }}>
            {t('couponGiorni', { giorni: couponGiorni })}
          </div>
        )}

        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>

        {profilo?.ruolo === 'allenatore' && <OnboardingChecklist checks={checksOnboarding} />}

        {/* Widget principale: cosa devo fare oggi */}
        {totDaValutare > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--rosso)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--rosso)' }}>
              ⚠ {t('coseDaValutare', { count: totDaValutare })}
            </h3>
            {daValutareAllenamenti.map((a) => (
              <Link key={a.id} href={`/calendario/${a.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏃 {t('allenamentoLabel')} — {a.squadra?.nome}</span>
                <span className="dv-data">{fmtData(a.data)}</span>
              </Link>
            ))}
            {daValutarePartite.map((p) => (
              <Link key={p.id} href={`/partite/${p.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⚽ {t('partitaVs')} {p.avversario || '—'} — {p.squadre?.nome}</span>
                <span className="dv-data">{fmtData(p.data)}</span>
              </Link>
            ))}
          </div>
        )}

        {totDaValutare === 0 && haAllenamenti && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--campo)', maxWidth: 'none' }}>
            <p style={{ margin: 0, color: 'var(--campo)', fontWeight: 600 }}>{t('tuttoValutato')}</p>
          </div>
        )}

        {portieriAttenzione.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--giallo)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--giallo)' }}>
              👁 {t('portieriDaAttenzionare', { count: portieriAttenzione.length })}
            </h3>
            {portieriAttenzione.map((p) => (
              <Link key={p.id} href={`/portieri/${p.id}`} className="dv-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{p.nome} {p.cognome ?? ''}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {p.motivi.map((m, i) => (
                    <span key={i} style={{ fontSize: 11, color: 'var(--giallo)', background: 'rgba(232,167,44,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                      {m}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {feedbackRecenti.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--campo)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--campo)' }}>
              💬 {t('feedbackRicevuti', { count: feedbackRecenti.length })}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)', marginLeft: 6 }}>
                ({t('feedbackUltimi7')})
              </span>
            </h3>
            {feedbackRecenti.map((f, i) => (
              <Link key={i} href={`/calendario/${f.allenamentoId}`} className="dv-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{f.portiere}{f.categoria ? ` · ${f.categoria}` : ''}</span>
                  {/* Il voto sta ATTACCATO al nome: con justify-content space-between
                      finiva al bordo destro e su schermi larghi sembrava assente. */}
                  {f.voto != null && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)',
                      background: 'rgba(242,183,5,0.14)', padding: '2px 9px', borderRadius: 999,
                      whiteSpace: 'nowrap',
                    }}>
                      {t('feedbackVoto')} {f.voto}
                      {/* Stesse stelle (1-5, ambra) della schermata in cui il portiere
                          assegna il voto, cosi' il riquadro si legge a colpo d'occhio. */}
                      <span aria-hidden="true" style={{ letterSpacing: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} style={{ color: n <= Math.round(Number(f.voto)) ? '#f2b705' : 'var(--linea)' }}>★</span>
                        ))}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {t('feedbackSeduta')}: {fmtData(f.dataAllenamento)}
                  {f.dataFeedback ? ` · ${t('feedbackScrittoIl')} ${fmtQuando(f.dataFeedback)}` : ''}
                </div>
                {f.testo && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>{f.testo}</div>
                )}
              </Link>
            ))}
          </div>
        )}

        {misurazioniDaFare.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--azzurro)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--azzurro)' }}>
              📏 {t('misurazioniDaFare', { count: misurazioniDaFare.length })}
            </h3>
            {misurazioniDaFare.map((m) => (
              <Link key={m.testId} href={`/portieri/${m.portiereId}/obiettivi`} className="dv-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>📏 {m.testNome}</span>
                  <span className="dv-data">{fmtData(m.prossima)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {m.portiere} · {t('obiettivoLabel')}: {m.obiettivo}{m.ultimoValore ? ` · ${t('ultimaMisuraLabel')}: ${m.ultimoValore}` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}

        {blocchiStandard}

      </div>
    </>
  )
}
