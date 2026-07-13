import {
  getPlanLabel,
  getPlanPrice,
  normalizePlanCode,
} from '../lib/subscriptionService';
import './SubscriptionGate.css';

const plans = [
  {
    code: 'essential',
    name: 'Esencial',
    price: 'US$20',
    description:
      'Para Artistas que trabajan solos o con un colaborador de confianza.',
    managerLimit: 'Hasta 1 Gestor',
  },
  {
    code: 'professional',
    name: 'Profesional',
    price: 'US$35',
    description:
      'Para equipos de booking, representantes y varios colaboradores.',
    managerLimit: 'Gestores ilimitados',
  },
];

function statusMessage(status) {
  const messages = {
    pending_payment:
      'Tu proyecto está creado y espera la activación de un plan.',
    incomplete:
      'El pago anterior no se completó. Puedes intentarlo nuevamente.',
    incomplete_expired:
      'La sesión de pago anterior venció. Inicia una nueva.',
    unpaid:
      'La suscripción tiene un pago pendiente y necesita actualizarse.',
    canceled:
      'La suscripción terminó. Selecciona un plan para reactivar MiBooking.',
    paused:
      'La suscripción está pausada. Debe reactivarse para continuar.',
  };

  return (
    messages[status] ||
    'Selecciona un plan para activar MiBooking.'
  );
}

export default function SubscriptionGate({
  workspace,
  subscription,
  loading,
  error,
  esArtista,
  selectedPlan,
  checkoutResult,
  checkoutLoading,
  onChoosePlan,
  onCheckout,
  onReload,
  onLogout,
}) {
  const normalizedPlan =
    normalizePlanCode(selectedPlan);

  const selectedLabel =
    getPlanLabel(normalizedPlan);

  const selectedPrice =
    getPlanPrice(normalizedPlan);

  const hasPreviousCheckout =
    [
      'pending_payment',
      'incomplete',
      'trialing',
      'active',
    ].includes(
      String(
        subscription?.status || ''
      )
    ) ||
    Boolean(
      subscription
        ?.stripe_customer_id
    );

  if (loading) {
    return (
      <main className="subscription-gate-page">
        <section className="subscription-gate-card loading">
          <span className="subscription-gate-spinner" />
          <h1>Comprobando tu suscripción</h1>
          <p>
            Estamos consultando el estado de tu
            cuenta en MiBooking.
          </p>
        </section>
      </main>
    );
  }

  if (!esArtista) {
    return (
      <main className="subscription-gate-page">
        <section className="subscription-gate-card compact">
          <img
            src="/mibooking-icon.png"
            alt=""
            aria-hidden="true"
          />

          <span className="subscription-gate-eyebrow">
            Cuenta de Gestor
          </span>

          <h1>
            El Artista debe activar su suscripción
          </h1>

          <p>
            Tu cuenta de Gestor no tiene costo.
            El acceso a {workspace?.workspace_name || 'este Artista'}
            depende de la suscripción contratada por
            el propietario del proyecto.
          </p>

          {error && (
            <p className="subscription-gate-error">
              {error}
            </p>
          )}

          <div className="subscription-gate-actions">
            <button
              type="button"
              className="primary"
              onClick={onReload}
            >
              Revisar nuevamente
            </button>

            <button
              type="button"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="subscription-gate-page">
      <section className="subscription-gate-card">
        <header className="subscription-gate-header">
          <img
            src="/mibooking-logo.png"
            alt="MiBooking"
          />

          <span className="subscription-gate-eyebrow">
            Activación del Artista
          </span>

          <h1>
            Elige el plan para{' '}
            {workspace?.workspace_name || 'tu proyecto'}
          </h1>

          <p>
            {statusMessage(subscription?.status)}
          </p>
        </header>

        {checkoutResult === 'success' && (
          <div className="subscription-checkout-message success">
            <strong>
              Stripe recibió el pago de prueba.
            </strong>
            <span>
              Estamos esperando la confirmación del
              webhook para habilitar el proyecto.
            </span>
          </div>
        )}

        {checkoutResult === 'canceled' && (
          <div className="subscription-checkout-message">
            <strong>El pago fue cancelado.</strong>
            <span>
              No se realizó ningún cargo. Puedes
              volver a intentarlo cuando estés listo.
            </span>
          </div>
        )}

        {error && (
          <p className="subscription-gate-error">
            {error}
          </p>
        )}

        <div className="subscription-plan-grid">
          {plans.map((plan) => {
            const selected =
              normalizedPlan === plan.code;

            return (
              <button
                key={plan.code}
                type="button"
                className={`subscription-plan-card${
                  selected ? ' selected' : ''
                }`}
                onClick={() =>
                  onChoosePlan(plan.code)
                }
              >
                <span className="subscription-plan-radio">
                  {selected ? '✓' : ''}
                </span>

                <span className="subscription-plan-name">
                  {plan.name}
                </span>

                <strong>
                  {plan.price}
                  <small>/mes</small>
                </strong>

                <p>{plan.description}</p>

                <span className="subscription-plan-limit">
                  {plan.managerLimit}
                </span>
              </button>
            );
          })}
        </div>

        <div className="subscription-free-manager-note">
          <strong>
            Las cuentas de Gestor son gratuitas.
          </strong>
          <span>
            Solo pueden acceder mediante una
            invitación enviada por un Artista.
          </span>
        </div>

        <div className="subscription-selection-summary">
          {normalizedPlan ? (
            <>
              <span>Plan seleccionado</span>
              <strong>
                {selectedLabel} · {selectedPrice}
              </strong>
            </>
          ) : (
            <span>
              Selecciona uno de los dos planes para
              continuar.
            </span>
          )}
        </div>

        <button
          type="button"
          className="subscription-checkout-button"
          disabled={
            !normalizedPlan ||
            checkoutLoading
          }
          onClick={() =>
            onCheckout(normalizedPlan)
          }
        >
          {checkoutLoading
            ? hasPreviousCheckout
              ? 'Verificando Stripe...'
              : 'Abriendo Stripe...'
            : hasPreviousCheckout
              ? 'Recuperar suscripción existente'
              : 'Continuar al pago seguro'}
        </button>

        <p className="subscription-promotion-note">
          Los artistas que distribuyen su música a
          través de La Oreja Media pueden introducir
          su código de descuento en Stripe Checkout.
        </p>

        <div className="subscription-secondary-actions">
          <button
            type="button"
            onClick={onReload}
            disabled={
              loading ||
              checkoutLoading
            }
          >
            {subscription
              ?.status ===
              'pending_payment'
              ? 'Recuperar pago o trial'
              : 'Ya pagué, revisar estado'}
          </button>

          <button
            type="button"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
