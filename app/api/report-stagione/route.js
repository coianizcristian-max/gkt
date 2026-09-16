import { NextResponse } from 'next/server'
import { pdfLabels, tApi } from '@/lib/i18nServer'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Svg, Line, Polyline, Circle } from '@react-pdf/renderer'
import { getStagioneAttiva } from '@/lib/tenant'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#14202b' },
  header: { marginBottom: 24, borderBottom: '2 solid #0a7ec2', paddingBottom: 14 },
  eyebrow: { fontSize: 9, color: '#0a7ec2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  titolo: { fontSize: 22, fontWeight: 700, color: '#14202b' },
  sottotitolo: { fontSize: 11, color: '#4a5b68', marginTop: 4 },
  sezione: { marginBottom: 20 },
  sezioneTitolo: { fontSize: 13, fontWeight: 700, color: '#14202b', marginBottom: 10, borderBottom: '1 solid #e2e6e1', paddingBottom: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  kpiBox: { width: '23%', backgroundColor: '#f6f7f4', borderRadius: 4, padding: 10, marginBottom: 8 },
  kpiVal: { fontSize: 16, fontWeight: 700, color: '#0a7ec2' },
  kpiLabel: { fontSize: 8, color: '#4a5b68', marginTop: 2 },
  riga: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '0.5 solid #e2e6e1' },
  rigaLabel: { color: '#4a5b68' },
  rigaVal: { fontWeight: 700 },
  obiettivoBox: { backgroundColor: '#f6f7f4', borderRadius: 4, padding: 8, marginBottom: 6 },
  obiettivoTitolo: { fontWeight: 700, fontSize: 10 },
  obiettivoMeta: { fontSize: 8, color: '#4a5b68', marginTop: 2 },
  commentoBox: { backgroundColor: '#f6f7f4', borderRadius: 4, padding: 12, minHeight: 50 },
  commentoTesto: { fontSize: 10, lineHeight: 1.5, fontStyle: 'italic' },
  tabRiga: { flexDirection: 'row', borderBottom: '0.5 solid #e2e6e1', paddingVertical: 3 },
  tabHead: { flexDirection: 'row', borderBottom: '1 solid #b8c2cc', paddingBottom: 4, marginBottom: 2 },
  tabCellaMese: { width: '13%', fontSize: 9 },
  tabCella: { flex: 1, fontSize: 9, textAlign: 'right' },
  tabCellaHead: { flex: 1, fontSize: 8, textAlign: 'right', color: '#4a5b68', fontWeight: 700 },
  tabCellaMeseHead: { width: '13%', fontSize: 8, color: '#4a5b68', fontWeight: 700 },
  nota: { fontSize: 8, color: '#8899a8', marginTop: 6 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 8 },
  legendaVoce: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendaPallino: { width: 8, height: 3, borderRadius: 2 },
  legendaTesto: { fontSize: 8, color: '#4a5b68' },
  evento: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #e2e6e1' },
  eventoData: { width: '18%', fontSize: 8, color: '#4a5b68' },
  eventoTesto: { flex: 1, fontSize: 9 },
  eventoTipo: { width: '22%', fontSize: 8, color: '#8899a8', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#8899a8', textAlign: 'center', borderTop: '0.5 solid #e2e6e1', paddingTop: 8 },
})

const COLORI = ['#0a7ec2', '#1f8a4c', '#7f77dd', '#d85a30', '#e8a72c', '#1d9e75']

function GraficoMesi({ etichette, serie }) {
  const vis = serie.filter((s) => s.punti.some((p) => p != null))
  if (!vis.length || etichette.length < 2) return null
  const vals = vis.flatMap((s) => s.punti.filter((p) => p != null))
  const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.25
  const hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.25
  const range = hi - lo || 1
  const W = 515, H = 110, PL = 26, PR = 6, PT = 8, PB = 16
  const iw = W - PL - PR, ih = H - PT - PB
  const n = etichette.length
  const px = (i) => PL + (i / (n - 1)) * iw
  const py = (v) => PT + ih - ((v - lo) / range) * ih
  const ticks = [lo, (lo + hi) / 2, hi]
  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {ticks.map((v, i) => (
          <Line key={`g${i}`} x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} strokeWidth={0.5} stroke="#e2e6e1" />
        ))}
        {ticks.map((v, i) => (
          <Text key={`t${i}`} x={PL - 4} y={py(v) + 2.5} style={{ fontSize: 6, fill: '#8899a8', textAnchor: 'end' }}>
            {v.toFixed(1)}
          </Text>
        ))}
        {etichette.map((m, i) => (
          <Text key={`m${i}`} x={px(i)} y={H - 4} style={{ fontSize: 6, fill: '#8899a8', textAnchor: 'middle' }}>{m}</Text>
        ))}
        {vis.map((s, si) => {
          const segmenti = []
          let cur = []
          s.punti.forEach((v, i) => {
            if (v == null) { if (cur.length) segmenti.push(cur); cur = [] }
            else cur.push(`${px(i)},${py(v)}`)
          })
          if (cur.length) segmenti.push(cur)
          return segmenti.map((seg, k) => (
            <Polyline key={`${si}-${k}`} points={seg.join(' ')} fill="none" stroke={s.colore} strokeWidth={1.4} />
          ))
        })}
        {vis.map((s, si) => s.punti.map((v, i) => v == null ? null : (
          <Circle key={`c${si}-${i}`} cx={px(i)} cy={py(v)} r={1.6} fill={s.colore} />
        )))}
      </Svg>
      <View style={styles.legenda}>
        {vis.map((s, i) => (
          <View key={i} style={styles.legendaVoce}>
            <View style={[styles.legendaPallino, { backgroundColor: s.colore }]} />
            <Text style={styles.legendaTesto}>{s.nome}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function TabellaMesi({ t, titolo, intestazioni, righe, nota, grafico }) {
  if (!righe.length) return null
  return (
    <View style={styles.sezione}>
      <Text style={styles.sezioneTitolo}>{titolo}</Text>
      {grafico ? <GraficoMesi etichette={grafico.etichette} serie={grafico.serie} /> : null}
      <View style={styles.tabHead}>
        <Text style={styles.tabCellaMeseHead}>{t('mese')}</Text>
        {intestazioni.map((h) => <Text key={h} style={styles.tabCellaHead}>{h}</Text>)}
      </View>
      {righe.map((r) => (
        <View key={r.mese} style={styles.tabRiga}>
          <Text style={styles.tabCellaMese}>{r.mese}</Text>
          {r.valori.map((v, i) => <Text key={i} style={styles.tabCella}>{v}</Text>)}
        </View>
      ))}
      {nota ? <Text style={styles.nota}>{nota}</Text> : null}
    </View>
  )
}

const CHIAVE_EVENTO = {
  obiettivo_creato: 'evObCreato',
  obiettivo_raggiunto: 'evObRaggiunto',
  voto_alto: 'evVotoAlto',
  voto_basso: 'evVotoBasso',
  clean_sheet: 'evCleanSheet',
  partita: 'evPartita',
}

function ReportPDF({ t, portiere, stagione, kpi, obiettiviRaggiunti, obiettiviAperti, commenti, andamento, percorso }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('reportFine')}</Text>
          <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
          <Text style={styles.sottotitolo}>{t('stagionePrefix')} {stagione.nome}</Text>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('datiGenerali')}</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.presenze}</Text><Text style={styles.kpiLabel}>{t('presenzeAll')}</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.mediaAllenamenti}</Text><Text style={styles.kpiLabel}>{t('mediaAll')}</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.partiteGiocate}</Text><Text style={styles.kpiLabel}>{t('partiteGiocate')}</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.cleanSheet}</Text><Text style={styles.kpiLabel}>{t('cleanSheet')}</Text></View>
          </View>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('statDettagliate')}</Text>
          <View style={styles.riga}><Text style={styles.rigaLabel}>{t('mediaPart')}</Text><Text style={styles.rigaVal}>{kpi.mediaPartite}</Text></View>
          <View style={styles.riga}><Text style={styles.rigaLabel}>{t('puntiSquadra')}</Text><Text style={styles.rigaVal}>{kpi.puntiTotali}</Text></View>
          <View style={styles.riga}><Text style={styles.rigaLabel}>{t('pctPresenze')}</Text><Text style={styles.rigaVal}>{kpi.pctPresenze}%</Text></View>
          {kpi.indiceCrescita != null && (
            <View style={styles.riga}><Text style={styles.rigaLabel}>{t('indiceCrescita')}</Text><Text style={styles.rigaVal}>{kpi.indiceCrescita} / 100</Text></View>
          )}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('obRaggiunti', { n: obiettiviRaggiunti.length })}</Text>
          {obiettiviRaggiunti.length === 0 && <Text style={{ color: '#4a5b68', fontSize: 9 }}>{t('nessunObRaggiunto')}</Text>}
          {obiettiviRaggiunti.map((o, i) => (
            <View key={i} style={styles.obiettivoBox}>
              <Text style={styles.obiettivoTitolo}>{o.titolo}</Text>
              <Text style={styles.obiettivoMeta}>{o.categoria} · {o.livello}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('obAperti', { n: obiettiviAperti.length })}</Text>
          {obiettiviAperti.length === 0 && <Text style={{ color: '#4a5b68', fontSize: 9 }}>{t('nessunObSospeso')}</Text>}
          {obiettiviAperti.map((o, i) => (
            <View key={i} style={styles.obiettivoBox}>
              <Text style={styles.obiettivoTitolo}>{o.titolo} — {o.percentuale}%</Text>
              <Text style={styles.obiettivoMeta}>{o.categoria} · {o.livello}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('commentoAll')}</Text>
          <View style={styles.commentoBox}>
            <Text style={styles.commentoTesto}>{commenti.allenatore || t('nessunCommento')}</Text>
          </View>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>{t('commentoPort')}</Text>
          <View style={styles.commentoBox}>
            <Text style={styles.commentoTesto}>{commenti.portiere || t('nessunCommento')}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {t('footerGenerato')} · {new Date().toLocaleDateString(t.intlTag)}
        </Text>
      </Page>

      {andamento && andamento.mesi.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('andamento')}</Text>
            <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
            <Text style={styles.sottotitolo}>{t('stagionePrefix')} {stagione.nome}</Text>
          </View>
          <TabellaMesi
            t={t}
            titolo={t('votiMese')}
            intestazioni={andamento.intestazioniGen}
            righe={andamento.genMensile}
            grafico={andamento.graficoGenMensile}
            nota={t('notaMese')}
          />
          <TabellaMesi
            t={t}
            titolo={t('votiProg')}
            intestazioni={andamento.intestazioniGen}
            righe={andamento.genProgressivo}
            grafico={andamento.graficoGenProgressivo}
            nota={t('notaProg')}
          />
          <Text style={styles.footer}>
            {t('footerGenerato')} · {new Date().toLocaleDateString(t.intlTag)}
          </Text>
        </Page>
      )}

      {andamento && andamento.parMensile.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('parametriVal')}</Text>
            <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
            <Text style={styles.sottotitolo}>{t('stagionePrefix')} {stagione.nome}</Text>
          </View>
          <TabellaMesi
            t={t}
            titolo={t('paramMese')}
            intestazioni={andamento.intestazioniPar}
            righe={andamento.parMensile}
            grafico={andamento.graficoParMensile}
          />
          <TabellaMesi
            t={t}
            titolo={t('paramProg')}
            intestazioni={andamento.intestazioniPar}
            righe={andamento.parProgressivo}
            grafico={andamento.graficoParProgressivo}
          />
          <Text style={styles.footer}>
            {t('footerGenerato')} · {new Date().toLocaleDateString(t.intlTag)}
          </Text>
        </Page>
      )}
      {percorso && percorso.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('percorso')}</Text>
            <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
            <Text style={styles.sottotitolo}>{t('stagionePrefix')} {stagione.nome}</Text>
          </View>
          <View style={styles.sezione}>
            <Text style={styles.sezioneTitolo}>{t('momenti', { n: percorso.length })}</Text>
            {percorso.map((e, i) => (
              <View key={i} style={styles.evento}>
                <Text style={styles.eventoData}>{e.data}</Text>
                <Text style={styles.eventoTesto}>{e.titolo}</Text>
                <Text style={styles.eventoTipo}>{CHIAVE_EVENTO[e.tipo] ? t(CHIAVE_EVENTO[e.tipo]) : e.tipo}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer}>
            {t('footerGenerato')} · {new Date().toLocaleDateString(t.intlTag)}
          </Text>
        </Page>
      )}

    </Document>
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const portiereId = searchParams.get('portiere_id')
  const t = pdfLabels(request)
  if (!portiereId) return NextResponse.json({ error: tApi(request, 'portiere_id mancante') }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: tApi(request, 'Non autenticato') }, { status: 401 })

  const { data: profiloViewer } = await supabase.from('profili').select('ruolo, portiere_id').eq('id', user.id).maybeSingle()
  if (profiloViewer?.ruolo === 'portiere' && profiloViewer.portiere_id !== portiereId) {
    return NextResponse.json({ error: tApi(request, 'Non autorizzato') }, { status: 403 })
  }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  if (!isUnlocked('report_pdf_stagione', gatingCfg, abbAttivo)) {
    return NextResponse.json({ error: tApi(request, 'Funzionalità non disponibile con il tuo piano.') }, { status: 402 })
  }

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', portiereId).maybeSingle()
  if (!portiere) return NextResponse.json({ error: tApi(request, 'Portiere non trovato') }, { status: 404 })

  const { stagione } = await getStagioneAttiva(supabase, user.id)
  if (!stagione) return NextResponse.json({ error: tApi(request, 'Nessuna stagione attiva') }, { status: 400 })

  // ── Dati aggregati ─────────────────────────────────────────────────────
  const { data: allenamenti } = await supabase.from('allenamenti').select('id, data').eq('stagione_id', stagione.id)
  const allenIds = (allenamenti ?? []).map((a) => a.id)

  const { data: vAll } = allenIds.length
    ? await supabase.from('valutazioni').select('id, allenamento_id, presente, voto').eq('portiere_id', portiereId).in('allenamento_id', allenIds)
    : { data: [] }
  const presenze = (vAll ?? []).filter((v) => v.presente).length
  const votiAllenamenti = (vAll ?? []).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaAllenamenti = votiAllenamenti.length ? (votiAllenamenti.reduce((s, x) => s + x, 0) / votiAllenamenti.length).toFixed(2) : '—'
  const pctPresenze = (vAll ?? []).length ? Math.round(presenze / vAll.length * 100) : 0

  const { data: partite } = await supabase.from('partite').select('id, data, gol_subiti, tipo').eq('stagione_id', stagione.id)
  const partiteById = {}
  for (const p of partite ?? []) partiteById[p.id] = p
  const { data: vPar } = (partite ?? []).length
    ? await supabase.from('valutazioni_partita').select('partita_id, presente, voto, punti, gol_subiti').eq('portiere_id', portiereId)
    : { data: [] }
  const partiteGiocate = (vPar ?? []).filter((v) => v.presente)
  const votiPartite = partiteGiocate.filter((v) => v.voto != null).map((v) => Number(v.voto))
  const mediaPartite = votiPartite.length ? (votiPartite.reduce((s, x) => s + x, 0) / votiPartite.length).toFixed(2) : '—'
  const cleanSheet = partiteGiocate.filter((v) => partiteById[v.partita_id]?.gol_subiti === 0).length
  const puntiTotali = (vPar ?? []).reduce((s, v) => s + (v.punti != null ? Number(v.punti) : 0), 0)

  const { data: obiettiviRows } = await supabase.from('obiettivi').select('*').eq('portiere_id', portiereId)
  const obiettiviRaggiunti = (obiettiviRows ?? []).filter((o) => o.stato === 'raggiunto')
  const obiettiviAperti = (obiettiviRows ?? []).filter((o) => o.stato !== 'raggiunto')

  const { data: commentiRow } = await supabase.from('report_commenti')
    .select('commento_allenatore, commento_portiere').eq('portiere_id', portiereId).eq('stagione_id', stagione.id).maybeSingle()

  // ── Andamento mese per mese ────────────────────────────────────────────
  const MESI = t.raw('mesi')
  const meseCorrente = new Date().toISOString().slice(0, 7)
  const dataAllen = new Map((allenamenti ?? []).map((a) => [a.id, a.data]))
  const dataPart = new Map((partite ?? []).map((p) => [p.id, p.data]))

  const valIds = (vAll ?? []).map((v) => v.id)
  const { data: punteggi } = valIds.length
    ? await supabase.from('valutazione_punteggi')
        .select('valutazione_id, parametro_id, punteggio, parametri_valutazione(id, nome, ordine)')
        .in('valutazione_id', valIds)
    : { data: [] }

  const paramMap = new Map()
  for (const r of punteggi ?? []) {
    const p = r.parametri_valutazione
    if (p && !paramMap.has(p.id)) paramMap.set(p.id, { id: p.id, nome: p.nome, ordine: p.ordine ?? 0 })
  }
  const parametri = [...paramMap.values()]
    .filter((p) => !/^rpe/i.test(p.nome))
    .sort((a, b) => a.ordine - b.ordine)
    .slice(0, 6)

  const meseDiVal = new Map((vAll ?? []).map((v) => [v.id, (dataAllen.get(v.allenamento_id) ?? '').slice(0, 7)]))
  const bucket = new Map()
  const tocca = (k) => {
    if (!bucket.has(k)) bucket.set(k, { k, tot: 0, pres: 0, vs: 0, vn: 0, gio: 0, pvs: 0, pvn: 0, gs: 0, cs: 0, pt: 0, par: {} })
    return bucket.get(k)
  }
  for (const v of vAll ?? []) {
    const k = (dataAllen.get(v.allenamento_id) ?? '').slice(0, 7)
    if (!k || k >= meseCorrente) continue
    const b = tocca(k); b.tot += 1
    if (v.presente) b.pres += 1
    if (v.presente && v.voto != null) { b.vs += Number(v.voto); b.vn += 1 }
  }
  for (const r of punteggi ?? []) {
    const k = meseDiVal.get(r.valutazione_id)
    if (!k || k >= meseCorrente || r.punteggio == null) continue
    const b = tocca(k)
    if (!b.par[r.parametro_id]) b.par[r.parametro_id] = { s: 0, n: 0 }
    b.par[r.parametro_id].s += Number(r.punteggio); b.par[r.parametro_id].n += 1
  }
  for (const v of vPar ?? []) {
    const k = (dataPart.get(v.partita_id) ?? '').slice(0, 7)
    if (!k || k >= meseCorrente || !v.presente) continue
    const b = tocca(k); b.gio += 1
    if (v.voto != null) { b.pvs += Number(v.voto); b.pvn += 1 }
    const golSub = v.gol_subiti != null ? v.gol_subiti : partiteById[v.partita_id]?.gol_subiti
    if (golSub != null) { b.gs += golSub; if (golSub === 0) b.cs += 1 }
    if (v.punti != null) b.pt += Number(v.punti)
  }

  const chiavi = [...bucket.keys()].sort()
  const n2 = (x) => (x == null ? '—' : x.toFixed(2))
  const somma = (f, sel) => f.reduce((a, b) => a + sel(b), 0)
  const mediaPes = (f, s, n) => { const d = somma(f, n); return d ? somma(f, s) / d : null }

  const rigaGen = (fetta, mese) => {
    const tot = somma(fetta, (b) => b.tot)
    const gio = somma(fetta, (b) => b.gio)
    return {
      mese,
      valori: [
        tot ? Math.round(somma(fetta, (b) => b.pres) / tot * 100) + '%' : '—',
        n2(mediaPes(fetta, (b) => b.vs, (b) => b.vn)),
        gio || '—',
        n2(mediaPes(fetta, (b) => b.pvs, (b) => b.pvn)),
        gio ? somma(fetta, (b) => b.gs) : '—',
        gio ? somma(fetta, (b) => b.cs) : '—',
        gio ? (somma(fetta, (b) => b.pt) > 0 ? '+' : '') + somma(fetta, (b) => b.pt) : '—',
      ],
    }
  }
  const rigaPar = (fetta, mese) => ({
    mese,
    valori: parametri.map((p) => n2(mediaPes(fetta, (b) => b.par[p.id]?.s ?? 0, (b) => b.par[p.id]?.n ?? 0))),
  })

  const etich = (k) => MESI[Number(k.slice(5)) - 1]
  const fette = chiavi.map((k, i) => ({
    mensile: [bucket.get(k)],
    progressivo: chiavi.slice(0, i + 1).map((x) => bucket.get(x)),
    label: etich(k),
  }))

  // Serie per i grafici: solo grandezze omogenee (medie voto), altrimenti la scala si rompe.
  const serieVoto = (prog) => [
    { nome: t('mediaAll'), colore: COLORI[0],
      punti: fette.map((f) => mediaPes(prog ? f.progressivo : f.mensile, (b) => b.vs, (b) => b.vn)) },
    { nome: t('mediaPart'), colore: COLORI[2],
      punti: fette.map((f) => mediaPes(prog ? f.progressivo : f.mensile, (b) => b.pvs, (b) => b.pvn)) },
  ]
  const seriePar = (prog) => parametri.map((p, i) => ({
    nome: p.nome, colore: COLORI[i % COLORI.length],
    punti: fette.map((f) => mediaPes(prog ? f.progressivo : f.mensile, (b) => b.par[p.id]?.s ?? 0, (b) => b.par[p.id]?.n ?? 0)),
  }))
  const etichette = fette.map((f) => f.label)

  const andamento = {
    mesi: chiavi,
    graficoGenMensile: { etichette, serie: serieVoto(false) },
    graficoGenProgressivo: { etichette, serie: serieVoto(true) },
    graficoParMensile: parametri.length ? { etichette, serie: seriePar(false) } : null,
    graficoParProgressivo: parametri.length ? { etichette, serie: seriePar(true) } : null,
    intestazioniGen: t.raw('thGen'),
    intestazioniPar: parametri.map((p) => (p.nome.length > 11 ? p.nome.slice(0, 10) + '.' : p.nome)),
    genMensile: fette.map((f) => rigaGen(f.mensile, f.label)),
    genProgressivo: fette.map((f) => rigaGen(f.progressivo, f.label)),
    parMensile: parametri.length ? fette.map((f) => rigaPar(f.mensile, f.label)) : [],
    parProgressivo: parametri.length ? fette.map((f) => rigaPar(f.progressivo, f.label)) : [],
  }

  // ── Percorso: i momenti salienti, come nella pagina Percorso ───────────
  const percorso = []
  for (const o of obiettiviRows ?? []) {
    if (o.created_at) percorso.push({ tipo: 'obiettivo_creato', data: o.created_at.slice(0, 10), titolo: o.titolo })
    if (o.stato === 'raggiunto' && o.updated_at) percorso.push({ tipo: 'obiettivo_raggiunto', data: o.updated_at.slice(0, 10), titolo: o.titolo })
  }
  for (const v of vAll ?? []) {
    if (!v.presente || v.voto == null) continue
    const voto = Number(v.voto)
    const data = dataAllen.get(v.allenamento_id)
    if (!data) continue
    if (voto >= 8) percorso.push({ tipo: 'voto_alto', data, titolo: `Allenamento valutato ${voto}` })
    if (voto <= 4) percorso.push({ tipo: 'voto_basso', data, titolo: `Allenamento valutato ${voto}` })
  }
  for (const v of vPar ?? []) {
    if (!v.presente) continue
    const p = partiteById[v.partita_id]
    if (!p) continue
    const cs = p.gol_subiti === 0
    percorso.push({
      tipo: cs ? 'clean_sheet' : 'partita',
      data: p.data,
      titolo: (p.avversario || t('avversario')) + (v.voto != null ? ` — ${t('voto')} ${v.voto}` : ''),
    })
  }
  percorso.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
  const percorsoLimitato = percorso.slice(0, 60)

  const kpi = {
    presenze: `${presenze}/${(vAll ?? []).length}`,
    mediaAllenamenti, partiteGiocate: partiteGiocate.length, cleanSheet,
    mediaPartite, puntiTotali, pctPresenze, indiceCrescita: null,
  }

  const buffer = await renderToBuffer(
    <ReportPDF
      t={t}
      portiere={portiere} stagione={stagione} kpi={kpi}
      obiettiviRaggiunti={obiettiviRaggiunti} obiettiviAperti={obiettiviAperti}
      commenti={{ allenatore: commentiRow?.commento_allenatore, portiere: commentiRow?.commento_portiere }}
      andamento={andamento}
      percorso={percorsoLimitato}
    />
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${portiere.nome}-${portiere.cognome ?? ''}-${stagione.nome}.pdf"`,
    },
  })
}
