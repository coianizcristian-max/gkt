import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import ContattoClient from './ContattoClient'

export const dynamic = 'force-dynamic'

function getPublicClient() {
  return createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function ContattoAllenatorePublicPage({ params }) {
  const { id } = await params

  // Parte pubblica via RPC. Prima qui si faceva .from('profili') col client di
  // sessione: la policy profili_self_read consente il SELECT solo se
  // (id = auth.uid() OR is_staff()), quindi per un visitatore anonimo tornavano
  // zero righe e la pagina rispondeva 404 — anche a chi arrivava da Google e
  // avrebbe voluto pagare. profilo_allenatore_pubblico e' SECURITY DEFINER e
  // restituisce solo i campi pubblici (niente telefono).
  const pub = getPublicClient()
  const { data: pubData, error: pubErr } = await pub.rpc('profilo_allenatore_pubblico', { p_id: id })
  if (pubErr) console.error('[contatto] RPC profilo_allenatore_pubblico:', pubErr.message)
  const profilo = pubData?.[0] ?? null
  if (!profilo) notFound()

  // funzionalita_config e' leggibile da anon.
  const { data: feeRow } = await pub
    .from('funzionalita_config')
    .select('label')
    .eq('chiave', 'fee_contatto_importo')
    .maybeSingle()
  const importoFee = feeRow?.label ?? '2.90'

  // Contatti sbloccati: la verifica del pagamento avviene DENTRO al database.
  // La RPC restituisce il telefono solo se accessi_contatto contiene un acquisto
  // intestato a auth.uid(). Non dipende piu' dal ruolo di chi guarda.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let contatti = null
  if (user) {
    const { data: c, error: cErr } = await supabase.rpc('contatti_allenatore_sbloccati', { p_id: id })
    if (cErr) console.error('[contatto] RPC contatti_allenatore_sbloccati:', cErr.message)
    contatti = c?.[0] ?? null
  }
  const giaUnlocked = !!contatti

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
