import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import GatingManager from '@/app/components/GatingManager'
import { ALBERO_FUNZIONALITA } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function FunzionalitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo, supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: rows } = await supabase.from('funzionalita_config').select('chiave, free, label')
  const configMap = {}   // chiave → free (boolean) per le funzionalità
  const labelMap = {}    // chiave → label (stringa) per prezzi/fee/giorni
  for (const r of rows ?? []) { configMap[r.chiave] = r.free; labelMap[r.chiave] = r.label }
  const tuttoFree = configMap['__tutto_free'] ?? false

  const feeContatto = labelMap['fee_contatto_importo'] ?? '2.90'
  const get = (k, def) => labelMap[k] ?? def
  const prezziIniziali = {
    allenatore: {
      mensile:  get('prezzo_allenatore_mensile',  '9.90'),
      annuale:  get('prezzo_allenatore_annuale',  '79.00'),
      lifetime: get('prezzo_allenatore_lifetime', '199.00'),
    },
    portiere: {
      mensile:  get('prezzo_portiere_mensile',  '4.90'),
      annuale:  get('prezzo_portiere_annuale',  '39.00'),
      lifetime: get('prezzo_portiere_lifetime', '99.00'),
    },
  }
  const giorniIniziali = {
    allenatore: get('giorni_prova_allenatore', '30'),
    portiere:   get('giorni_prova_portiere',   '30'),
  }

  // Costruisce l'albero con il valore free corrente (saved > default) su ogni nodo.
  const conValori = (nodo) => ({
    chiave: nodo.chiave,
    label: nodo.label,
    free: configMap[nodo.chiave] ?? nodo.defaultFree,
    ...(nodo.figli ? { figli: nodo.figli.map(conValori) } : {}),
  })
  const albero = ALBERO_FUNZIONALITA.map((s) => ({
    sezione: s.sezione,
    funzionalita: s.funzionalita.map(conValori),
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Funzionalità</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <GatingManager
          albero={albero}
          tuttoFree={tuttoFree}
          feeContatto={feeContatto}
          prezziIniziali={prezziIniziali}
          giorniIniziali={giorniIniziali}
        />
      </div>
    </>
  )
}
