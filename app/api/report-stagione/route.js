import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
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
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#8899a8', textAlign: 'center', borderTop: '0.5 solid #e2e6e1', paddingTop: 8 },
})

function TabellaMesi({ titolo, intestazioni, righe, nota }) {
  if (!righe.length) return null
  return (
    <View style={styles.sezione}>
      <Text style={styles.sezioneTitolo}>{titolo}</Text>
      <View style={styles.tabHead}>
        <Text style={styles.tabCellaMeseHead}>Mese</Text>
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

function ReportPDF({ portiere, stagione, kpi, obiettiviRaggiunti, obiettiviAperti, commenti, andamento }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>GKSeason — Report fine stagione</Text>
          <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
          <Text style={styles.sottotitolo}>Stagione {stagione.nome}</Text>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Dati generali</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.presenze}</Text><Text style={styles.kpiLabel}>Presenze allenamenti</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.mediaAllenamenti}</Text><Text style={styles.kpiLabel}>Media voto allenamenti</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.partiteGiocate}</Text><Text style={styles.kpiLabel}>Partite giocate</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiVal}>{kpi.cleanSheet}</Text><Text style={styles.kpiLabel}>Clean sheet</Text></View>
          </View>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Statistiche dettagliate</Text>
          <View style={styles.riga}><Text style={styles.rigaLabel}>Media voto partite</Text><Text style={styles.rigaVal}>{kpi.mediaPartite}</Text></View>
          <View style={styles.riga}><Text style={styles.rigaLabel}>Punti portati alla squadra</Text><Text style={styles.rigaVal}>{kpi.puntiTotali}</Text></View>
          <View style={styles.riga}><Text style={styles.rigaLabel}>% presenze allenamenti</Text><Text style={styles.rigaVal}>{kpi.pctPresenze}%</Text></View>
          {kpi.indiceCrescita != null && (
            <View style={styles.riga}><Text style={styles.rigaLabel}>Indice di Crescita GKSeason</Text><Text style={styles.rigaVal}>{kpi.indiceCrescita} / 100</Text></View>
          )}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Obiettivi raggiunti ({obiettiviRaggiunti.length})</Text>
          {obiettiviRaggiunti.length === 0 && <Text style={{ color: '#4a5b68', fontSize: 9 }}>Nessun obiettivo raggiunto questa stagione.</Text>}
          {obiettiviRaggiunti.map((o, i) => (
            <View key={i} style={styles.obiettivoBox}>
              <Text style={styles.obiettivoTitolo}>{o.titolo}</Text>
              <Text style={styles.obiettivoMeta}>{o.categoria} · {o.livello}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Obiettivi non raggiunti ({obiettiviAperti.length})</Text>
          {obiettiviAperti.length === 0 && <Text style={{ color: '#4a5b68', fontSize: 9 }}>Nessun obiettivo in sospeso.</Text>}
          {obiettiviAperti.map((o, i) => (
            <View key={i} style={styles.obiettivoBox}>
              <Text style={styles.obiettivoTitolo}>{o.titolo} — {o.percentuale}%</Text>
              <Text style={styles.obiettivoMeta}>{o.categoria} · {o.livello}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Commento allenatore</Text>
          <View style={styles.commentoBox}>
            <Text style={styles.commentoTesto}>{commenti.allenatore || 'Nessun commento inserito.'}</Text>
          </View>
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Commento portiere</Text>
          <View style={styles.commentoBox}>
            <Text style={styles.commentoTesto}>{commenti.portiere || 'Nessun commento inserito.'}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generato da GKSeason — Gestionale Allenamento Portieri · {new Date().toLocaleDateString('it-IT')}
        </Text>
      </Page>

      {andamento && andamento.mesi.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>GKSeason — Andamento della stagione</Text>
            <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
            <Text style={styles.sottotitolo}>Stagione {stagione.nome}</Text>
          </View>
          <TabellaMesi
            titolo="Voti e partite — mese per mese"
            intestazioni={andamento.intestazioniGen}
            righe={andamento.genMensile}
            nota="Ogni riga usa solo i dati di quel mese. I mesi non ancora conclusi non compaiono."
          />
          <TabellaMesi
            titolo="Voti e partite — progressivo"
            intestazioni={andamento.intestazioniGen}
            righe={andamento.genProgressivo}
            nota="Ogni riga usa i dati da inizio stagione fino a quel mese incluso."
          />
          <Text style={styles.footer}>
            Generato da GKSeason — Gestionale Allenamento Portieri · {new Date().toLocaleDateString('it-IT')}
          </Text>
        </Page>
      )}

      {andamento && andamento.parMensile.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>GKSeason — Parametri di valutazione</Text>
            <Text style={styles.titolo}>{portiere.nome} {portiere.cognome ?? ''}</Text>
            <Text style={styles.sottotitolo}>Stagione {stagione.nome}</Text>
          </View>
          <TabellaMesi
            titolo="Parametri — mese per mese"
            intestazioni={andamento.intestazioniPar}
            righe={andamento.parMensile}
          />
          <TabellaMesi
            titolo="Parametri — progressivo"
            intestazioni={andamento.intestazioniPar}
            righe={andamento.parProgressivo}
          />
          <Text style={styles.footer}>
            Generato da GKSeason — Gestionale Allenamento Portieri · {new Date().toLocaleDateString('it-IT')}
          </Text>
        </Page>
      )}
    </Document>
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const portiereId = searchParams.get('portiere_id')
  if (!portiereId) return NextResponse.json({ error: 'portiere_id mancante' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profiloViewer } = await supabase.from('profili').select('ruolo, portiere_id').eq('id', user.id).maybeSingle()
  if (profiloViewer?.ruolo === 'portiere' && profiloViewer.portiere_id !== portiereId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  if (!isUnlocked('report_pdf_stagione', gatingCfg, abbAttivo)) {
    return NextResponse.json({ error: 'Funzionalità non disponibile con il tuo piano.' }, { status: 402 })
  }

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', portiereId).maybeSingle()
  if (!portiere) return NextResponse.json({ error: 'Portiere non trovato' }, { status: 404 })

  const { stagione } = await getStagioneAttiva(supabase, user.id)
  if (!stagione) return NextResponse.json({ error: 'Nessuna stagione attiva' }, { status: 400 })

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
  const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
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

  const andamento = {
    mesi: chiavi,
    intestazioniGen: ['Pres.', 'Voto all.', 'Giocate', 'Voto gara', 'Gol sub.', 'CS', 'Punti'],
    intestazioniPar: parametri.map((p) => (p.nome.length > 11 ? p.nome.slice(0, 10) + '.' : p.nome)),
    genMensile: fette.map((f) => rigaGen(f.mensile, f.label)),
    genProgressivo: fette.map((f) => rigaGen(f.progressivo, f.label)),
    parMensile: parametri.length ? fette.map((f) => rigaPar(f.mensile, f.label)) : [],
    parProgressivo: parametri.length ? fette.map((f) => rigaPar(f.progressivo, f.label)) : [],
  }

  const kpi = {
    presenze: `${presenze}/${(vAll ?? []).length}`,
    mediaAllenamenti, partiteGiocate: partiteGiocate.length, cleanSheet,
    mediaPartite, puntiTotali, pctPresenze, indiceCrescita: null,
  }

  const buffer = await renderToBuffer(
    <ReportPDF
      portiere={portiere} stagione={stagione} kpi={kpi}
      obiettiviRaggiunti={obiettiviRaggiunti} obiettiviAperti={obiettiviAperti}
      commenti={{ allenatore: commentiRow?.commento_allenatore, portiere: commentiRow?.commento_portiere }}
      andamento={andamento}
    />
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${portiere.nome}-${portiere.cognome ?? ''}-${stagione.nome}.pdf"`,
    },
  })
}
