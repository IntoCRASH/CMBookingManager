import {
  formatSubscriptionDate,
  getSubscriptionAccessState,
  getSubscriptionDaysRemaining,
} from '../lib/subscriptionService';
import './BillingStatusBanner.css';

export default function BillingStatusBanner({
  subscription,
  esArtista,
  page,
  onBilling,
}) {
  if (
    !subscription ||
    subscription.billing_mode ===
      'legacy'
  ) {
    return null;
  }

  const accessState =
    getSubscriptionAccessState(
      subscription
    );

  if (accessState === 'grace') {
    const days =
      getSubscriptionDaysRemaining(
        subscription
          .payment_grace_ends_at
      );

    return (
      <aside className="billing-status-banner warning">
        <div>
          <strong>
            Pago pendiente
          </strong>

          <span>
            {esArtista
              ? `Conservas acceso temporal${
                  days !== null
                    ? ` por ${days} día${
                        days === 1
                          ? ''
                          : 's'
                      }`
                    : ''
                }. Actualiza el método de pago para evitar una interrupción.`
              : `El pago del Artista está pendiente. El workspace conserva acceso temporal${
                  days !== null
                    ? ` por ${days} día${
                        days === 1
                          ? ''
                          : 's'
                      }`
                    : ''
                }.`}
          </span>
        </div>

        {esArtista && (
          <button
            type="button"
            onClick={onBilling}
          >
            Resolver pago
          </button>
        )}
      </aside>
    );
  }

  if (
    subscription
      .cancel_at_period_end
  ) {
    return (
      <aside className="billing-status-banner neutral">
        <div>
          <strong>
            Renovación cancelada
          </strong>

          <span>
            El acceso continúa hasta{' '}
            {formatSubscriptionDate(
              subscription
                .current_period_end
            ) || 'el final del período actual'}.
          </span>
        </div>

        {esArtista && (
          <button
            type="button"
            onClick={onBilling}
          >
            Administrar
          </button>
        )}
      </aside>
    );
  }

  if (
    page === 'dashboard' &&
    subscription.status ===
      'active'
  ) {
    const days =
      getSubscriptionDaysRemaining(
        subscription
          .current_period_end
      );

    if (
      days !== null &&
      days <= 3
    ) {
      return (
        <aside className="billing-status-banner info">
          <div>
            <strong>
              Próxima renovación
            </strong>

            <span>
              Tu plan se renovará el{' '}
              {formatSubscriptionDate(
                subscription
                  .current_period_end
              )}.
            </span>
          </div>

          {esArtista && (
            <button
              type="button"
              onClick={onBilling}
            >
              Revisar facturación
            </button>
          )}
        </aside>
      );
    }
  }

  return null;
}
