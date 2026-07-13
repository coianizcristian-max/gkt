import Link from 'next/link'

export const metadata = { title: 'Email confermata | GKSeason' }

export default function BenvenutoPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--landing-blue-deep, #0d2137)', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 36px', maxWidth: 440, width: '100%',
        textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.25)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>✅</div>
        <h1 style={{ fontSize: 26, margin: '0 0 12px', color: '#0d2137' }}>Email confermata!</h1>
        <p style={{ color: '#5a7080', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          Grazie per esserti iscritto a GKSeason. Il tuo account è pronto: da qui puoi iniziare a
          organizzare la tua stagione, i tuoi portieri e i tuoi allenamenti.
        </p>
        <Link href="/dashboard" className="btn" style={{
          display: 'inline-block', background: '#0a7ec2', color: '#fff', padding: '13px 28px',
          borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 15,
        }}>
          Vai alla tua area →
        </Link>
      </div>
    </div>
  )
}
