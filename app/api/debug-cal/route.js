import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  // Esatta stessa query della calendario/page.js
  const { data: al, error: e_al } = await supabase
    .from('allenamenti')
    .select('id, data, squadra_id, accorpata_con, nessuna_valutazione, squadre(nome)')
    .eq('stagione_id', stagione?.id).order('data').limit(10)

  const { data: cat, error: e_cat } = await supabase
    .from('stagione_categorie')
    .select('squadre(id, nome, ordine)').eq('stagione_id', stagione?.id)

  return NextResponse.json({
    user_id: user?.id,
    stagione_id: stagione?.id,
    allenamenti_con_join: al?.slice(0, 3),
    allenamenti_error: e_al?.message ?? null,
    categorie: cat,
    categorie_error: e_cat?.message ?? null,
    // Simula la map della page
    allenamenti_mapped: al?.slice(0, 3).map((a) => ({
      id: a.id,
      data: a.data,
      squadra_id: a.squadra_id,
      squadra_nome: a.squadre?.nome ?? 'NULL!',
      accorpata_con: a.accorpata_con ?? null,
    })),
  })
}
