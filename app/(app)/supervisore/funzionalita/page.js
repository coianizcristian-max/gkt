import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import GatingManager from '@/app/components/GatingManager'
import { FUNZIONALITA } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function FunzionalitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo, supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: rows } = await supabase.from('funzionalita_config').select('chiave, free')
  const configMap = {}
  for (const r of rows ?? []) configMap[r.chiave] = r.free
  const tuttoFree = configMap['__tutto_free'] ?? false

  // Costruisce lista con valori correnti
  const funzionalita = Object.entries(FUNZIONALITA).map(([k, def]) => ({
    chiave: k,
    label: def.label,
    free: configMap[k] ?? def.defaultFree,
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Funzionalità</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <GatingManager funzionalita={funzionalita} tuttoFree={tuttoFree} />
      </div>
    </>
  )
}
