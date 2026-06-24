import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usa service role per bypassare le RLS - questa è una route pubblica
// che espone solo i dati esplicitamente pubblici (profili con disponibile=true)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID mancante.' }, { status: 400 })

  const [{ data: profilo }, { data: feeConfig }, { data: feeImporto }] = await Promise.all([
    supabaseAdmin
      .from('profili')
      .select('id, nome_completo, bio, foto_url, citta, esperienze, certificati, disponibile, ruolo')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('funzionalita_config')
      .select('free, label')
      .eq('chiave', 'contatto_form')
      .maybeSingle(),
    supabaseAdmin
      .from('funzionalita_config')
      .select('label')
      .eq('chiave', 'fee_contatto_importo')
      .maybeSingle(),
  ])

  if (!profilo || (profilo.ruolo !== 'allenatore' && profilo.ruolo !== 'staff')) {
    return NextResponse.json({ error: 'Profilo non trovato.' }, { status: 404 })
  }

  return NextResponse.json({
    profilo,
    gating: {
      free: feeConfig?.free ?? true,
      importo: feeImporto?.label ?? '2.90',
    },
  })
}
