import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { getStagioneAttiva } from '@/lib/tenant'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

// =====================================================================
// GKSeason · Esportatore statistiche PDF (analisi con lo staff tecnico)
//
//   GET /api/statistiche-pdf?mese=YYYY-MM|tutti&categoria=<squadra_id>|tutte
//
// In cima: presenze del periodo per tutti i portieri estratti.
// Poi, per categoria, per ogni portiere: le 3 statistiche in DUE colonne
//   A = da inizio stagione (fino a oggi)   B = solo il periodo estratto
// → 6 "grafici" per portiere, in layout compatto.
// =====================================================================

const AZ = '#0a7ec2', VERDE = '#1f9d55', AMBRA = '#d9822b', ROSSO = '#d64545', INK = '#14202b', GRIGIO = '#6a7b88'

const s = StyleSheet.create({
  page: { padding: 26, fontFamily: 'Helvetica', fontSize: 8, color: INK },
  head: { borderBottom: `2 solid ${INK}`, paddingBottom: 8, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 16, fontWeight: 700 },
  headMeta: { fontSize: 8, color: GRIGIO, textAlign: 'right' },
  filters: { fontSize: 7.5, color: GRIGIO, marginBottom: 12 },
  sec: { fontSize: 10, fontWeight: 700, color: AZ, textTransform: 'uppercase', marginTop: 10, marginBottom: 5 },
  // tabella presenze
  tr: { flexDirection: 'row', borderBottom: '0.5 solid #eceff1', paddingVertical: 2.5 },
  th: { flexDirection: 'row', borderBottom: `1 solid #cfd8dd`, paddingBottom: 3 },
  cNome: { width: '34%' }, cCat: { width: '26%', color: GRIGIO }, cNum: { width: '13%', textAlign: 'right' },
  thTxt: { color: GRIGIO, fontWeight: 700, fontSize: 7 },
  // blocco portiere
  gk: { border: '1 solid #e3e8eb', borderRadius: 4, padding: 8, marginBottom: 7 },
  gkHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gkName: { fontSize: 11, fontWeight: 700 },
  kpis: { flexDirection: 'row' },
  kpi: { marginLeft: 12, alignItems: 'flex-end' },
  kpiV: { fontSize: 11, fontWeight: 700 },
  kpiL: { fontSize: 6, color: GRIGIO, textTransform: 'uppercase' },
  cols: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48.5%' },
  colH: { fontSize: 7, fontWeight: 700, color: GRIGIO, textTransform: 'uppercase', textAlign: 'center', backgroundColor: '#f4f6f7', borderRadius: 3, paddingVertical: 2, marginBottom: 4 },
  block: { backgroundColor: '#fafbfc', borderRadius: 3, padding: 5, marginBottom: 4 },
  blockT: { fontSize: 6.5, fontWeight: 700, color: INK, marginBottom: 3, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  barLbl: { width: '46%', fontSize: 6.5, color: GRIGIO },
  barTrack: { width: '40%', height: 4, backgroundColor: '#e7edf0', borderRadius: 2 },
  barVal: { width: '14%', fontSize: 6.5, fontWeight: 700, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 16, left: 26, right: 26, fontSize: 7, color: '#9aa8b3', textAlign: 'center', borderTop: '0.5 solid #e2e6e1', paddingTop: 6 },
})

const colVoto = (v) => v == null ? GRIGIO : v >= 6.5 ? VERDE : v >= 6 ? AZ : v >= 5.5 ? AMBRA : ROSSO
const fix = (v, d = 2) => (v == null || Number.isNaN(v)) ? '—' : Number(v).toFixed(d)

function Barra({ pct, colore }) {
  return (
    <View style={s.barTrack}>
      <View style={{ height: 4, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colore, borderRadius: 2 }} />
    </View>
  )
}

function BloccoCaratteristiche({ dati }) {
  return (
    <View style={s.block}>
      <Text style={s.blockT}>Media per caratteristica</Text>
      {dati.length === 0 && <Text style={{ fontSize: 6.5, color: GRIGIO }}>Nessun dato nel periodo.</Text>}
      {dati.map((d, i) => (
        <View key={i} style={s.barRow}>
          <Text style={s.barLbl}>{d.nome}</Text>
          <Barra pct={(d.val ?? 0) / 10 * 100} colore={colVoto(d.val)} />
          <Text style={s.barVal}>{fix(d.val, 1)}</Text>
        </View>
      ))}
    </View>
  )
}

function BloccoVoti({ st }) {
  return (
    <View style={s.block}>
      <Text style={s.blockT}>Rendimento</Text>
      <View style={s.barRow}><Text style={s.barLbl}>Media allenamenti</Text><Barra pct={(st.mediaAll ?? 0) / 10 * 100} colore={colVoto(st.mediaAll)} /><Text style={s.barVal}>{fix(st.mediaAll, 2)}</Text></View>
      <View style={s.barRow}><Text style={s.barLbl}>Media partite</Text><Barra pct={(st.mediaPart ?? 0) / 10 * 100} colore={colVoto(st.mediaPart)} /><Text style={s.barVal}>{fix(st.mediaPart, 2)}</Text></View>
      <View style={s.barRow}><Text style={s.barLbl}>Partite giocate</Text><Barra pct={0} colore="#fff" /><Text style={s.barVal}>{st.nPartite}</Text></View>
    </View>
  )
}

function BloccoPrestazioni({ st }) {
  return (
    <View style={s.block}>
      <Text style={s.blockT}>Presenze & prestazioni</Text>
      <View style={s.barRow}><Text style={s.barLbl}>Presenze</Text><Barra pct={st.pct} colore={st.pct >= 90 ? VERDE : st.pct >= 70 ? AMBRA : ROSSO} /><Text style={s.barVal}>{st.presenze}/{st.disp}</Text></View>
      <View style={s.barRow}><Text style={s.barLbl}>Clean sheet</Text><Barra pct={st.nPartite ? st.cleanSheet / st.nPartite * 100 : 0} colore={VERDE} /><Text style={s.barVal}>{st.cleanSheet}</Text></View>
      <View style={s.barRow}><Text style={s.barLbl}>Gol / partita</Text><Barra pct={st.gpp != null ? Math.min(st.gpp, 5) / 5 * 100 : 0} colore={ROSSO} /><Text style={s.barVal}>{fix(st.gpp, 1)}</Text></View>
    </View>
  )
}

function Colonna({ titolo, st, full }) {
  return (
    <View style={[s.col, full ? { width: '100%' } : null]}>
      <Text style={s.colH}>{titolo}</Text>
      <BloccoCaratteristiche dati={st.caratteristiche} />
      <BloccoVoti st={st} />
      <BloccoPrestazioni st={st} />
    </View>
  )
}

function ReportPDF({ meta, presenze, categorie }) {
  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <View style={s.head}>
          <Text style={s.brand}>GKSeason</Text>
          <Text style={s.headMeta}>Report statistiche portieri{'\n'}Estrazione {meta.oggi}</Text>
        </View>
        <Text style={s.filters}>Stagione {meta.stagione}   ·   Periodo: {meta.periodoLabel}   ·   Categoria: {meta.categoriaLabel}</Text>

        <Text style={s.sec}>Presenze — {meta.periodoLabel}</Text>
        <View style={s.th}>
          <Text style={[s.cNome, s.thTxt]}>Portiere</Text>
          <Text style={[s.cCat, s.thTxt]}>Categoria</Text>
          <Text style={[s.cNum, s.thTxt]}>Presenze</Text>
          <Text style={[s.cNum, s.thTxt]}>Disp.</Text>
          <Text style={[s.cNum, s.thTxt]}>Media</Text>
        </View>
        {presenze.length === 0 && <Text style={{ fontSize: 7.5, color: GRIGIO, marginTop: 4 }}>Nessuna presenza registrata nel periodo.</Text>}
        {presenze.map((r, i) => (
          <View key={i} style={s.tr}>
            <Text style={s.cNome}>{r.nome}</Text>
            <Text style={s.cCat}>{r.categoria}</Text>
            <Text style={s.cNum}>{r.presenze}/{r.disp}</Text>
            <Text style={[s.cNum, { color: r.pct >= 90 ? VERDE : r.pct >= 70 ? AMBRA : ROSSO, fontWeight: 700 }]}>{r.pct}%</Text>
            <Text style={[s.cNum, { color: colVoto(r.mediaAll), fontWeight: 700 }]}>{fix(r.mediaAll, 2)}</Text>
          </View>
        ))}

        {categorie.map((cat, ci) => (
          <View key={ci}>
            <Text style={s.sec}>{cat.nome}</Text>
            {cat.portieri.map((p, pi) => (
              <View key={pi} style={s.gk} wrap={false}>
                <View style={s.gkHead}>
                  <Text style={s.gkName}>{p.nome}</Text>
                  <View style={s.kpis}>
                    <View style={s.kpi}><Text style={s.kpiV}>{p.head.presenze}/{p.head.disp}</Text><Text style={s.kpiL}>Presenze</Text></View>
                    <View style={s.kpi}><Text style={[s.kpiV, { color: colVoto(p.head.mediaAll) }]}>{fix(p.head.mediaAll, 2)}</Text><Text style={s.kpiL}>Media voto</Text></View>
                  </View>
                </View>
                <View style={s.cols}>
                  {meta.soloPeriodo ? (
                    <>
                      <Colonna titolo="Da inizio stagione" st={p.cumulativo} full={false} />
                      <Colonna titolo={meta.periodoLabel} st={p.periodo} full={false} />
                    </>
                  ) : (
                    <Colonna titolo="Stagione completa" st={p.cumulativo} full={true} />
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.footer} fixed>GKSeason — documento di analisi condiviso con lo staff tecnico · gkseason.it · {new Date().toLocaleDateString('it-IT')}</Text>
      </Page>
    </Document>
  )
}

// ── helpers date ──────────────────────────────────────────────────────
function rangeMese(mese) {
  // mese = 'YYYY-MM' → { da:'YYYY-MM-01', a:'YYYY-MM-<ultimo>' }
  const [y, m] = mese.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return { da: `${mese}-01`, a: `${mese}-${String(ultimo).padStart(2, '0')}` }
}
const inRange = (d, r) => !r ? true : (!!d && d >= r.da && d <= r.a)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mese = searchParams.get('mese') || 'tutti'
  const categoria = searchParams.get('categoria') || 'tutte'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) {
    return NextResponse.json({ error: 'Solo lo staff può esportare le statistiche.' }, { status: 403 })
  }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  if (!isUnlocked('report_pdf_statistiche', gatingCfg, abbAttivo)) {
    return NextResponse.json({ error: "Report disponibile con l'abbonamento." }, { status: 402 })
  }

  const { stagione } = await getStagioneAttiva(supabase, user.id)
  if (!stagione) return NextResponse.json({ error: 'Nessuna stagione attiva' }, { status: 400 })

  const oggiRoma = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
  const rPeriodo = mese === 'tutti' ? null : (() => {
    const r = rangeMese(mese)
    return { da: r.da, a: r.a < oggiRoma ? r.a : oggiRoma } // non oltre oggi
  })()
  const periodoLabel = mese === 'tutti'
    ? 'tutta la stagione'
    : new Date(mese + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  // Categorie della stagione
  const { data: catRows } = await supabase
    .from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id)
  let categorieDef = (catRows ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0))
  if (categoria !== 'tutte') categorieDef = categorieDef.filter((c) => c.id === categoria)
  const catNome = {}; categorieDef.forEach((c) => { catNome[c.id] = c.nome })
  const categoriaLabel = categoria === 'tutte' ? 'tutte' : (catNome[categoria] || '—')

  // Iscritti (roster)
  const { data: iscr } = await supabase
    .from('iscrizioni')
    .select('portiere_id, squadra_id, portieri(id, nome, cognome)')
    .eq('stagione_id', stagione.id)
  const roster = (iscr ?? [])
    .filter((r) => r.portieri && (categoria === 'tutte' || r.squadra_id === categoria) && catNome[r.squadra_id])
    .map((r) => ({ id: r.portiere_id, squadra_id: r.squadra_id, nome: `${r.portieri.nome} ${r.portieri.cognome ?? ''}`.trim() }))

  // Allenamenti e partite (≤ oggi)
  const { data: allen } = await supabase.from('allenamenti')
    .select('id, data, squadra_id').eq('stagione_id', stagione.id).lte('data', oggiRoma)
  const allenById = {}; (allen ?? []).forEach((a) => { allenById[a.id] = a })
  const allenIds = (allen ?? []).map((a) => a.id)

  const { data: part } = await supabase.from('partite')
    .select('id, data, tipo, gol_subiti').eq('stagione_id', stagione.id).lte('data', oggiRoma)
  const partById = {}; (part ?? []).forEach((p) => { partById[p.id] = p })
  const partIds = (part ?? []).map((p) => p.id)

  // Parametri
  const { data: parametri } = await supabase.from('parametri_valutazione')
    .select('id, nome, ordine').eq('attivo', true).order('ordine')

  // Valutazioni allenamento + punteggi
  const { data: vAll } = allenIds.length
    ? await supabase.from('valutazioni').select('id, portiere_id, allenamento_id, presente, voto').in('allenamento_id', allenIds)
    : { data: [] }
  const valById = {}; (vAll ?? []).forEach((v) => { valById[v.id] = v })
  const { data: punteggi } = (vAll ?? []).length
    ? await supabase.from('valutazione_punteggi').select('valutazione_id, parametro_id, punteggio').in('valutazione_id', (vAll ?? []).map((v) => v.id))
    : { data: [] }
  const punteggiByVal = {}; (punteggi ?? []).forEach((pp) => { (punteggiByVal[pp.valutazione_id] ??= []).push(pp) })

  // Valutazioni partita
  const { data: vPar } = partIds.length
    ? await supabase.from('valutazioni_partita').select('portiere_id, partita_id, presente, voto, punti, gol_subiti').in('partita_id', partIds)
    : { data: [] }

  // Indicizza per portiere, con data ereditata dal padre
  const valBy = {}, vparBy = {}
  for (const v of vAll ?? []) (valBy[v.portiere_id] ??= []).push({ ...v, data: allenById[v.allenamento_id]?.data })
  for (const v of vPar ?? []) {
    const p = partById[v.partita_id] ?? {}
    ;(vparBy[v.portiere_id] ??= []).push({ ...v, data: p.data, gol_subiti: v.gol_subiti ?? p.gol_subiti ?? null })
  }

  function statistiche(pid, r) {
    const vs = (valBy[pid] ?? []).filter((v) => inRange(v.data, r))
    const disp = vs.length
    const presenze = vs.filter((v) => v.presente).length
    const votiAll = vs.filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
    const mediaAll = votiAll.length ? votiAll.reduce((a, b) => a + b, 0) / votiAll.length : null
    const pct = disp ? Math.round(presenze / disp * 100) : 0

    // caratteristiche
    const perPar = {}
    for (const v of vs) for (const pp of punteggiByVal[v.id] ?? []) (perPar[pp.parametro_id] ??= []).push(Number(pp.punteggio))
    const caratteristiche = (parametri ?? []).map((par) => {
      const arr = perPar[par.id] ?? []
      return { nome: par.nome, val: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null }
    }).filter((c) => c.val != null)

    // partite
    const vp = (vparBy[pid] ?? []).filter((v) => inRange(v.data, r))
    const giocate = vp.filter((v) => v.presente)
    const votiP = giocate.filter((v) => v.voto != null).map((v) => Number(v.voto))
    const mediaPart = votiP.length ? votiP.reduce((a, b) => a + b, 0) / votiP.length : null
    const cleanSheet = giocate.filter((v) => v.gol_subiti === 0).length
    const golTot = giocate.reduce((a, v) => a + (v.gol_subiti != null ? Number(v.gol_subiti) : 0), 0)
    const gpp = giocate.length ? golTot / giocate.length : null
    const punti = vp.reduce((a, v) => a + (v.punti != null ? Number(v.punti) : 0), 0)

    return { disp, presenze, pct, mediaAll, caratteristiche, mediaPart, cleanSheet, gpp, punti, nPartite: giocate.length }
  }

  // Tabella presenze del periodo (tutti i portieri estratti)
  const presenzeTab = roster.map((p) => {
    const st = statistiche(p.id, rPeriodo)
    return { nome: p.nome, categoria: catNome[p.squadra_id] || '—', presenze: st.presenze, disp: st.disp, pct: st.pct, mediaAll: st.mediaAll }
  }).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))

  // Blocchi per categoria
  const soloPeriodo = mese !== 'tutti'
  const categorie = categorieDef.map((c) => ({
    nome: c.nome,
    portieri: roster.filter((p) => p.squadra_id === c.id).sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => {
      const cumulativo = statistiche(p.id, null)
      const periodo = soloPeriodo ? statistiche(p.id, rPeriodo) : cumulativo
      return { nome: p.nome, cumulativo, periodo, head: soloPeriodo ? periodo : cumulativo }
    }),
  })).filter((c) => c.portieri.length > 0)

  const meta = { oggi: new Date().toLocaleDateString('it-IT'), stagione: stagione.nome, periodoLabel, categoriaLabel, soloPeriodo }
  const buffer = await renderToBuffer(<ReportPDF meta={meta} presenze={presenzeTab} categorie={categorie} />)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="statistiche-${stagione.nome}-${mese}.pdf"`,
    },
  })
}
