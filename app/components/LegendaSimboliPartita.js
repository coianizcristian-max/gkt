'use client'

import { useTranslations } from 'next-intl'
import IconaTipoPartita from '@/app/components/IconaTipoPartita'

const TIPI = ['campionato', 'coppa', 'torneo', 'amichevole']

/**
 * Seconda riga della legenda del calendario: spiega i simboli che compaiono
 * sulle caselle delle partite (tipologia + casa/trasferta).
 * Solo stili inline: non tocca globals.css. Stessi testi gia' tradotti del
 * namespace calendarioMese (tipo_*, casa, trasferta).
 */
export default function LegendaSimboliPartita() {
  const t = useTranslations('calendarioMese')

  return (
    <div
      className="calx-legenda calx-legenda-simboli"
      style={{ marginTop: -8, rowGap: 8 }}
    >
      {TIPI.map((tipo) => (
        <span key={tipo}>
          {/* stesso viola delle caselle partita, cosi' si riconosce al volo */}
          <span style={{ color: '#6d28d9', display: 'inline-flex' }}>
            <IconaTipoPartita tipo={tipo} size={14} className="calx-leg-ico" />
          </span>
          {t(`tipo_${tipo}`)}
        </span>
      ))}
      <span>{t('casa')}</span>
      <span>{t('trasferta')}</span>
    </div>
  )
}
