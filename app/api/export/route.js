import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function toCSV(rows, cols) {
  const header = cols.map((c) => `"${c.label}"`).join(',')
  const lines = rows.map((r) =>
    cols.map((c) => {
      const v = r[c.key] ?? ''
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(',')
  )
  return [header, ...lines].join('\r\n')
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (profilo?.ruolo !== 'allenatore' && profilo?.ruolo !== 'staff') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const url = new URL(request.url)
  const tipo = url.searchParams.get('tipo') ?? 'portieri'
  const stagioneId = url.searchParams.get('stagione')

  let csv = ''
  let filename = ''

  if (tipo === 'portieri') {
    const { data: iscr } = await supabase
      .from('iscrizioni')
      .select('numero_maglia, squadre(nome), portieri(nome, cognome, data_nascita, telefono, contatto_genitore, luogo_nascita, altezza_cm, peso_kg, piede, note)')
      .eq('stagione_id', stagioneId)

    const rows = (iscr ?? []).map((i) => ({
      nome: i.portieri?.nome ?? '',
      cognome: i.portieri?.cognome ?? '',
      categoria: i.squadre?.nome ?? '',
      maglia: i.numero_maglia ?? '',
      data_nascita: i.portieri?.data_nascita ?? '',
      luogo_nascita: i.portieri?.luogo_nascita ?? '',
      altezza_cm: i.portieri?.altezza_cm ?? '',
      peso_kg: i.portieri?.peso_kg ?? '',
      piede: i.portieri?.piede ?? '',
      telefono: i.portieri?.telefono ?? '',
      contatto_genitore: i.portieri?.contatto_genitore ?? '',
      note: i.portieri?.note ?? '',
    }))

    csv = toCSV(rows, [
      { key: 'nome', label: 'Nome' },
      { key: 'cognome', label: 'Cognome' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'maglia', label: 'Maglia' },
      { key: 'data_nascita', label: 'Data nascita' },
      { key: 'luogo_nascita', label: 'Luogo nascita' },
      { key: 'altezza_cm', label: 'Altezza (cm)' },
      { key: 'peso_kg', label: 'Peso (kg)' },
      { key: 'piede', label: 'Piede' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'contatto_genitore', label: 'Contatto genitore' },
      { key: 'note', label: 'Note' },
    ])
    filename = 'portieri.csv'
  }

  else if (tipo === 'valutazioni') {
    const { data: allen } = await supabase
      .from('allenamenti').select('id, data, squadre(nome)').eq('stagione_id', stagioneId)
    const allenIds = (allen ?? []).map((a) => a.id)
    const allenMap = {}
    for (const a of allen ?? []) allenMap[a.id] = { data: a.data, squadra: a.squadre?.nome ?? '' }

    const { data: vals } = allenIds.length
      ? await supabase.from('valutazioni')
          .select('allenamento_id, presente, voto, note, portieri(nome, cognome)')
          .in('allenamento_id', allenIds)
          .order('allenamento_id')
      : { data: [] }

    const rows = (vals ?? []).map((v) => ({
      data: allenMap[v.allenamento_id]?.data ?? '',
      categoria: allenMap[v.allenamento_id]?.squadra ?? '',
      nome: v.portieri?.nome ?? '',
      cognome: v.portieri?.cognome ?? '',
      presente: v.presente ? 'Sì' : 'No',
      voto: v.voto ?? '',
      note: v.note ?? '',
    }))

    csv = toCSV(rows, [
      { key: 'data', label: 'Data' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'nome', label: 'Nome' },
      { key: 'cognome', label: 'Cognome' },
      { key: 'presente', label: 'Presente' },
      { key: 'voto', label: 'Voto' },
      { key: 'note', label: 'Note' },
    ])
    filename = 'valutazioni.csv'
  }

  else if (tipo === 'partite') {
    const { data: part } = await supabase
      .from('partite')
      .select('data, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
      .eq('stagione_id', stagioneId)
      .order('data')

    const rows = (part ?? []).map((p) => {
      const haRis = p.gol_fatti != null && p.gol_subiti != null
      const esito = !haRis ? '' : (p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X')
      return {
        data: p.data,
        categoria: p.squadre?.nome ?? '',
        avversario: p.avversario ?? '',
        luogo: p.casa ? 'Casa' : 'Trasferta',
        gol_fatti: p.gol_fatti ?? '',
        gol_subiti: p.gol_subiti ?? '',
        esito,
        tipo: p.tipo ?? '',
      }
    })

    csv = toCSV(rows, [
      { key: 'data', label: 'Data' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'avversario', label: 'Avversario' },
      { key: 'luogo', label: 'Casa/Trasferta' },
      { key: 'gol_fatti', label: 'Gol fatti' },
      { key: 'gol_subiti', label: 'Gol subiti' },
      { key: 'esito', label: 'Esito' },
      { key: 'tipo', label: 'Tipo' },
    ])
    filename = 'partite.csv'
  }

  return new NextResponse('\uFEFF' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
