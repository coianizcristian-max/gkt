import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import CouponManager from '@/app/components/CouponManager'

export const dynamic = 'force-dynamic'

export default async function CouponPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: coupon } = await supabase.from('coupon')
    .select('id, codice, durata_gg, attivo, created_at')
    .order('created_at', { ascending: false })

  const { data: utilizzi } = await supabase.from('coupon_utilizzi')
    .select('coupon_id, scade_il, utente_id')

  const utilizziPerCoupon = {}
  for (const u of utilizzi ?? []) {
    (utilizziPerCoupon[u.coupon_id] ??= []).push(u)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Coupon</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <CouponManager coupon={coupon ?? []} utilizziPerCoupon={utilizziPerCoupon} />
      </div>
    </>
  )
}
