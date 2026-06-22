import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

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
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#8899a8', textAlign: 'center', borderTop: '0.5 solid #e2e6e1', paddingTop: 8 },
})

function ReportPDF({ portiere, stagione, kpi, obiettiviRaggiunti, obiettiviAperti, commenti }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>GKT — Report fine stagione</Text>
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
            <View style={styles.riga}><Text style={styles.rigaLabel}>Indice di Crescita GKT</Text><Text style={styles.rigaVal}>{kpi.indiceCrescita} / 100</Text></View>
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
          Generato da GKT — Gestionale Allenamento Portieri · {new Date().toLocaleDateString('it-IT')}
        </Text>
      </Page>
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

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', portiereId).maybeSingle()
  if (!portiere) return NextResponse.json({ error: 'Portiere non trovato' }, { status: 404 })

  const { data: stagione } = await supabase.from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()
  if (!stagione) return NextResponse.json({ error: 'Nessuna stagione attiva' }, { status: 400 })

  // ── Dati aggregati ─────────────────────────────────────────────────────
  const { data: allenamenti } = await supabase.from('allenamenti').select('id').eq('stagione_id', stagione.id)
  const allenIds = (allenamenti ?? []).map((a) => a.id)

  const { data: vAll } = allenIds.length
    ? await supabase.from('valutazioni').select('presente, voto').eq('portiere_id', portiereId).in('allenamento_id', allenIds)
    : { data: [] }
  const presenze = (vAll ?? []).filter((v) => v.presente).length
  const votiAllenamenti = (vAll ?? []).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaAllenamenti = votiAllenamenti.length ? (votiAllenamenti.reduce((s, x) => s + x, 0) / votiAllenamenti.length).toFixed(2) : '—'
  const pctPresenze = (vAll ?? []).length ? Math.round(presenze / vAll.length * 100) : 0

  const { data: partite } = await supabase.from('partite').select('id, gol_subiti, tipo').eq('stagione_id', stagione.id)
  const partiteById = {}
  for (const p of partite ?? []) partiteById[p.id] = p
  const { data: vPar } = (partite ?? []).length
    ? await supabase.from('valutazioni_partita').select('partita_id, presente, voto, punti').eq('portiere_id', portiereId)
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
    />
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${portiere.nome}-${portiere.cognome ?? ''}-${stagione.nome}.pdf"`,
    },
  })
}
