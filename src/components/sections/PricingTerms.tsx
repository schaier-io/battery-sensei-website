import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Reveal } from '#/components/zen/Reveal'

/**
 * Purchase terms under the pricing tiers: who takes the payment (Polar, the
 * merchant of record) and the refund window, each as a real link so buyers
 * see both before checkout. The 14 days match the voluntary policy on
 * /legal#withdrawal and the FAQ refund answer; change all three together.
 */
export function PricingTerms() {
  const { t } = useTranslation()
  return (
    <Reveal delay={420} className="spec-strip mt-10 space-y-2 text-center">
      <p>
        <Trans
          i18nKey="pricing.terms"
          components={[
            <Link to="/checkout" search={{ tier: 'lifetime', cur: undefined }} className="zen-link" />,
            <Link to="/legal" hash="withdrawal" className="zen-link" />,
          ]}
        />
      </p>
      <p>{t('pricing.alreadyBought')}</p>
    </Reveal>
  )
}
