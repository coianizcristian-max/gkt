import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: stagione, error: e1 } = await supabase
    .from('stagioni').select('id, nome, attiva').eq('attiva', true).maybeSingle()
  
  const { data: allenamenti, error: e2 } = await supabase
    .from('allenamenti').select('id, data, squadra_id, stagione_id').limit(5)

  const al_stagione_res = stagione ? await supabase
    .from('allenamenti').select('id', { count: 'exact', head: true }).eq('stagione_id', stagione.id) : { count: null, error: null }

  return NextResponse.json({
    user_id: user?.id ?? null,
    stagione,
    stagione_error: e1?.message ?? null,
    allenamenti_sample: allenamenti,
    allenamenti_error: e2?.message ?? null,
    count_per_stagione: al_stagione_res.count,
    count_error: al_stagione_res.error?.message ?? null,
  })
}
