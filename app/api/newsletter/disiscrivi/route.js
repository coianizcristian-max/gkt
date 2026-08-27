import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function pagina(msg) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:460px;margin:64px auto;text-align:center;padding:0 20px;color:#2a3b47;">
       <h2 style="color:#0a5a8a;">GKSeason · Newsletter</h2>
       <p style="font-size:15px;line-height:1.6;">${msg}</p>
     </div>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return pagina('Link non valido.')
  const { error } = await admin.from('newsletter_iscritti').update({ attivo: false }).eq('id', id)
  if (error) return pagina('Si è verificato un errore. Riprova più tardi.')
  return pagina('Sei stato disiscritto dalla newsletter. Non riceverai più email.')
}
