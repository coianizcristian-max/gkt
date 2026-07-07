import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Guida from '@/app/components/Guida'
import TemplateManager from '@/app/components/TemplateManager'
import { getOwnerId } from '@/lib/tenant'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const dynamic = 'force-dynamic'

export default async function TemplateAllenamentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)

  const { data: templates } = await supabase
    .from('template_allenamento')
    .select('id, nome, descrizione, created_at, template_allenamento_esercizi(id)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  const lista = (templates ?? []).map((t) => ({
    id: t.id,
    nome: t.nome,
    descrizione: t.descrizione,
    numEsercizi: t.template_allenamento_esercizi?.length ?? 0,
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Template allenamenti</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano i template">
          <p>
            Crea un template con un nome (es. &ldquo;Seduta tecnica base&rdquo;) e una serie di esercizi dalla
            tua libreria, nell&apos;ordine che preferisci. Quando crei un nuovo allenamento nel calendario,
            potrai scegliere <strong>&ldquo;Duplica da un template&rdquo;</strong> invece di doverli
            reinserire ogni volta: gli esercizi vengono copiati nell&apos;ordine impostato qui.
          </p>
          <p style={{ marginTop: 10 }}>
            I template sono <strong>solo tuoi</strong>: se sei un responsabile con preparatori collegati,
            potrai vedere (in sola lettura) anche i loro template dalla sezione supervisione.
          </p>
        </Guida>
        <TemplateManager templates={lista} />
      </div>
    </>
  )
}
