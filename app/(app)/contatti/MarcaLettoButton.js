'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function MarcaLettoButton({ id }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function marca() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('messaggi_contatto').update({ letto: true }).eq('id', id)
    router.refresh()
  }

  return (
    <button
      className="btn-ghost"
      onClick={marca}
      disabled={loading}
      type="button"
      style={{ fontSize: 13, padding: '6px 14px' }}
    >
      {loading ? '...' : 'Marca come letto'}
    </button>
  )
}
