import Link from 'next/link'

/**
 * Banner/overlay da mostrare quando una funzionalità è bloccata.
 * Se wrap=true avvolge i children con un overlay semitrasparente.
 */
export default function PaywallBanner({ chiave, label, wrap = false, children }) {
  const banner = (
    <div className="paywall-banner">
      <div className="paywall-icon">🔒</div>
      <div className="paywall-text">
        <b>{label ?? 'Funzionalità a pagamento'}</b>
        <p>Questa funzionalità è disponibile con un abbonamento attivo.</p>
      </div>
      <Link href="/abbonati" className="btn paywall-cta">Abbonati</Link>
    </div>
  )

  if (!wrap) return banner

  return (
    <div className="paywall-wrap">
      <div className="paywall-overlay" aria-hidden="true">{banner}</div>
      <div className="paywall-content" inert="true">{children}</div>
    </div>
  )
}
