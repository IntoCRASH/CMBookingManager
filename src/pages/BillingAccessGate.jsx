import {
  getPlanLabel,
  getSubscriptionStatusLabel,
} from '../lib/subscriptionService';
import './BillingAccessGate.css';

export default function BillingAccessGate({
  workspace,
  subscription,
  esArtista,
  error,
  onSubscription,
  onProfile,
  onReload,
  onLogout,
}) {
  const status =
    subscription?.status || '';

  const statusLabel =
    getSubscriptionStatusLabel(
      status
    );

  const planLabel =
    getPlanLabel(
      subscription?.plan_code
    ) || 'MiBooking';

  let title =
    'La suscripción necesita atención';

  let description =
    'El acceso operativo está temporalmente restringido hasta regularizar la facturación.';

  if (status === 'canceled') {
    title =
      'La suscripción terminó';

    description =
      'La suscripción del Artista fue cancelada. Es necesario contratar nuevamente un plan para continuar usando las herramientas operativas.';
  }

  if (status === 'unpaid') {
    title =
      'La factura continúa sin pagar';

    description =
      'Stripe agotó los intentos de cobro configurados. Actualiza el método de pago y completa la factura pendiente.';
  }

  if (status === 'paused') {
    title =
      'La suscripción está pausada';

    description =
      'La facturación y el acceso operativo están pausados. Revisa la suscripción para reanudar el servicio.';
  }

  if (
    status === 'past_due'
  ) {
    title =
      'El período de gracia terminó';

    description =
      'El pago sigue pendiente y el período temporal de acceso finalizó. Actualiza el método de pago para recuperar el acceso.';
  }

  if (!esArtista) {
    title =
      'El acceso del Artista está restringido';

    description =
      'Tu cuenta de Gestor continúa siendo gratuita, pero el workspace depende del plan del Artista. El Artista debe regularizar su suscripción para restablecer el acceso.';
  }

  return (
    <main className="billing-gate-page">
      <section className="billing-gate-card">
        <div className="billing-gate-icon">
          !
        </div>

        <span className="billing-gate-eyebrow">
          Facturación de MiBooking
        </span>

        <h1>{title}</h1>

        <p>{description}</p>

        <div className="billing-gate-summary">
          <div>
            <small>Proyecto</small>
            <strong>
              {
                workspace
                  ?.workspace_name
              }
            </strong>
          </div>

          <div>
            <small>Plan</small>
            <strong>{planLabel}</strong>
          </div>

          <div>
            <small>Estado</small>
            <strong>{statusLabel}</strong>
          </div>
        </div>

        {error && (
          <div className="billing-gate-error">
            {error}
          </div>
        )}

        <div className="billing-gate-actions">
          {esArtista && (
            <>
              <button
                type="button"
                className="primary"
                onClick={onSubscription}
              >
                Suscripción y facturación
              </button>

              <button
                type="button"
                onClick={onProfile}
              >
                Abrir Perfil
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onReload}
          >
            Revisar estado
          </button>

          <button
            type="button"
            className="logout"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
