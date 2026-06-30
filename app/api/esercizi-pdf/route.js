import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 20, borderBottom: '2px solid #0a7ec2', paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#14202b' },
  headerSub: { fontSize: 10, color: '#4a5b68', marginTop: 3 },
  card: { marginBottom: 20, border: '1px solid #e2e6e1', borderRadius: 6, padding: 12, breakInside: 'avoid' },
  cardNum: { fontSize: 9, color: '#0a7ec2', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#14202b', marginBottom: 4 },
  cardType: { fontSize: 9, color: '#0a7ec2', marginBottom: 6, textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardImg: { width: 120, height: 80, borderRadius: 4, objectFit: 'cover', flexShrink: 0 },
  cardBody: { flex: 1 },
  cardDesc: { fontSize: 10, color: '#4a5b68', lineHeight: 1.5, marginBottom: 4 },
  cardNote: { fontSize: 9, color: '#4a5b68', fontStyle: 'italic' },
  tempi: { flexDirection: 'row', gap: 16, marginTop: 4 },
  tempoLabel: { fontSize: 9, color: '#4a5b68' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 8, color: '#aebfca', flexDirection: 'row', justifyContent: 'space-between' },
  totale: { marginTop: 16, backgroundColor: '#f6f7f4', borderRadius: 6, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  totaleLabel: { fontSize: 12, fontWeight: 'bold', color: '#14202b' },
  totaleSub: { fontSize: 9, color: '#4a5b68' },
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const allenamentoId = searchParams.get('allenamento')
  if (!allenamentoId) return NextResponse.json({ error: 'Parametro mancante' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Carica allenamento
  const { data: allenamento } = await supabase.from('allenamenti')
    .select('data, ora, squadre(nome)').eq('id', allenamentoId).maybeSingle()

  // Carica esercizi nell'ordine stabilito
  const { data: rows } = await supabase.from('allenamento_esercizi')
    .select('ordine, esercizi(id, titolo, tipologia, descrizione_breve, descrizione, note, immagine_url, durata_minuti, recupero_minuti)')
    .eq('allenamento_id', allenamentoId)
    .order('ordine')

  const esercizi = (rows ?? [])
    .sort((a, b) => a.ordine - b.ordine)
    .map((r) => r.esercizi)
    .filter(Boolean)

  const dataLabel = allenamento?.data
    ? new Date(allenamento.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const catLabel = allenamento?.squadre?.nome ?? ''
  const oraLabel = allenamento?.ora ? allenamento.ora.slice(0, 5) : ''

  const stimaMinuti = esercizi.reduce((t, e) => t + (parseFloat(e.durata_minuti) || 0) + (parseFloat(e.recupero_minuti) || 0), 0)
  const stimaLabel = stimaMinuti > 0
    ? stimaMinuti >= 60 ? `${Math.floor(stimaMinuti / 60)}h ${Math.round(stimaMinuti % 60)}min` : `${Math.round(stimaMinuti)} min`
    : null

  const oggi = new Date().toLocaleDateString('it-IT')

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Seduta allenamento — {catLabel}</Text>
          <Text style={s.headerSub}>{dataLabel}{oraLabel ? '  ·  ore ' + oraLabel : ''}  ·  {esercizi.length} esercizi{stimaLabel ? '  ·  stima: ' + stimaLabel : ''}</Text>
        </View>

        {/* Esercizi */}
        {esercizi.map((e, i) => (
          <View key={e.id} style={s.card}>
            <Text style={s.cardNum}>Esercizio {i + 1}</Text>
            <Text style={s.cardTitle}>{e.titolo}</Text>
            {e.tipologia && <Text style={s.cardType}>{e.tipologia}</Text>}
            <View style={s.cardRow}>
              {e.immagine_url && <Image src={e.immagine_url} style={s.cardImg} />}
              <View style={s.cardBody}>
                {e.descrizione_breve && <Text style={s.cardDesc}>{e.descrizione_breve}</Text>}
                {e.descrizione && <Text style={s.cardDesc}>{e.descrizione}</Text>}
                {e.note && <Text style={s.cardNote}>Note: {e.note}</Text>}
                {(e.durata_minuti || e.recupero_minuti) && (
                  <View style={s.tempi}>
                    {e.durata_minuti && <Text style={s.tempoLabel}>⏱ Durata: {e.durata_minuti} min</Text>}
                    {e.recupero_minuti && <Text style={s.tempoLabel}>↩ Recupero: {e.recupero_minuti} min</Text>}
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Totale */}
        {stimaLabel && (
          <View style={s.totale}>
            <View>
              <Text style={s.totaleLabel}>⏱ Durata stimata totale: {stimaLabel}</Text>
              <Text style={s.totaleSub}>Somma durata + recupero degli esercizi con tempi impostati</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>GKSeason — Gestionale Allenamento Portieri</Text>
          <Text>Generato il {oggi}</Text>
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="seduta-${allenamentoId.slice(0, 8)}.pdf"`,
    },
  })
}
