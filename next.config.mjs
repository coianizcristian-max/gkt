/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Ottimizzazione immagini Vercel disattivata: sul piano free ha un tetto
    // mensile e, superato, restituisce 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)
    // lasciando le immagini rotte in tutta l'app. Con unoptimized le <Image>
    // caricano il file originale direttamente da Supabase Storage, senza passare
    // da /_next/image. (remotePatterns resta per compatibilità, se in futuro si
    // riattiva l'ottimizzazione su un piano a pagamento.)
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};
export default nextConfig;
