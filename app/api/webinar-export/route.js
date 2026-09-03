import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/webinar-export?codice=WEB-2026-10&data=<label>
//   - data assente  → un foglio per ogni data della campagna
//   - data presente → un solo foglio con quella data
// Ordine righe = ordine di ISCRIZIONE (prima riga = primo iscritto).

const SENZA = '(senza codice)'

// i nomi foglio Excel non ammettono \ / ? * [ ] : e max 31 caratteri
const nomeFoglio = (s) => (s || 'Foglio').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
const safeFile = (s) => (s || 'export').replace(/[^a-zA-Z0-9._-]/g, '_')

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const codice = searchParams.get('codice') || ''
  const dataSel = searchParams.get('data')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let q = supabase
    .from('iscrizioni_webinar')
    .select('nome, email, telefono, data_selezionata, webinar_codice, webinar_titolo, origine, created_at')
    .order('created_at', { ascending: true }) // ordine di arrivo

  if (codice === SENZA) q = q.is('webinar_codice', null)
  else if (codice) q = q.eq('webinar_codice', codice)
  if (dataSel) q = q.eq('data_selezionata', dataSel)

  const { data: righe, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fmt = (d) => d ? new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : ''

  const toRows = (arr) => arr.map((r, i) => ({
    'Pos.': i + 1,
    'Nome': r.nome,
    'Email': r.email,
    'Telefono': r.telefono || '',
    'Data webinar': r.data_selezionata,
    'Iscritto il': fmt(r.created_at),
    'Codice campagna': r.webinar_codice || '',
    'Titolo campagna': r.webinar_titolo || '',
    'Origine': r.origine || '',
  }))

  const wb = XLSX.utils.book_new()

  if (dataSel) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(righe ?? [])), nomeFoglio(dataSel))
  } else {
    // un foglio per data (nell'ordine in cui compaiono)
    const perData = {}
    for (const r of righe ?? []) (perData[r.data_selezionata || '(nessuna data)'] ??= []).push(r)
    const chiavi = Object.keys(perData)
    if (chiavi.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Info: 'Nessun iscritto' }]), 'Vuoto')
    } else {
      const usati = new Set()
      chiavi.forEach((k, idx) => {
        let nome = nomeFoglio(k); if (usati.has(nome)) nome = nomeFoglio(`${idx + 1} ${k}`); usati.add(nome)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(perData[k])), nome)
      })
    }
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const nomeFile = `webinar-${safeFile(codice || 'tutti')}${dataSel ? '-' + safeFile(dataSel) : ''}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeFile}"`,
    },
  })
}
