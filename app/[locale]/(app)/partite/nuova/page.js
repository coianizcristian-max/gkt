import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartitaForm from '@/app/components/PartitaForm'
import { getStagioneAttiva } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function NuovaPartitaPage({ searchParams }) {
  const sp = await searchParams
  const defaultData = sp?.data ?? ''
  const supabase = await createClient()
  const t = await getTranslations('partite')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user?.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const { db, stagione, taglio, oggi: oggiCtx } = await contestoDati(supabase, user?.id)

  let categorie = []
  let avversari = []
  if (stagione) {
    const [cat, avv] = await Promise.all([
      db.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      db.from('squadre_avversarie').select('nome').eq('stagione_id', stagione.id),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    avversari = [...new Set((avv.data ?? []).map((r) => r.nome))]
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/partite">{t('titolo')}</Link> &middot; {c('stagione', { nome: stagione?.nome ?? '\u2014' })}</div>
        <h1>{t('nuovaTitolo')}</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0
          ? <PartitaForm categorie={categorie} stagioneId={stagione.id} avversari={avversari} defaultData={defaultData} />
          : <div className="empty">{c('setupStagioneCategoria')}</div>}
      </div>
    </>
  )
}
