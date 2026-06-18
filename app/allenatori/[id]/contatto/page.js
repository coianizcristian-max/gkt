import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContattoClient from './ContattoClient'

export const dynamic = 'force-dynamic'

export default async function ContattoAllenatorePublicPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profilo } = await supabase
    .from('profili')
    .select('id, nome_completo, foto_url, citta, disponibile, ruolo')
    .eq('id', id)
    .maybeSingle()

  if (!profilo || (profilo.ruolo !== 'allenatore' && profilo.ruolo !== 'staff')) notFound()
  if (!profilo.disponibile) notFound()

  // Importo fee dal config
  const { data: feeRow } = await supabase
    .from('funzionalita_config')
    .select('label')
    .eq('chiave', 'fee_contatto_importo')
    .maybeSingle()
  const importoFee = feeRow?.label ?? '2.90'

  // Controlla se chi visita ha già pagato (cookie/tabella accessi_contatto)
  const { data: { user } } = await supabase.auth.getUser()
  let giaUnlocked = false
  if (user) {
    const { data: acc } = await supabase
      .from('accessi_contatto')
      .select('id')
      .eq('acquirente_id', user.id)
      .eq('allenatore_id', id)
      .maybeSingle()
    giaUnlocked = !!acc
  }

  // Se già sbloccato, carica i contatti
  let contatti = null
  if (giaUnlocked) {
    const { data: c } = await supabase
      .from('profili')
      .select('nome_completo, telefono, citta')
      .eq('id', id)
      .maybeSingle()
    contatti = c
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      <ContattoClient
        allenatoreId={id}
        nomeAllenatore={profilo.nome_completo}
        importoFee={importoFee}
        giaUnlocked={giaUnlocked}
        contatti={contatti}
      />
    </div>
  )
}
