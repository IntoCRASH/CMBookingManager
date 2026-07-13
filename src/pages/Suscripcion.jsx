import {
  useEffect,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import {
  changeSubscriptionPlan,
  createCustomerPortalSession,
  formatSubscriptionDate,
  getDiscountDescription,
  getPlanLabel,
  getPlanPrice,
  getSubscriptionStatusLabel,
  getWorkspaceSubscription,
} from '../lib/subscriptionService';
import './Suscripcion.css';

export default function Suscripcion({
  workspaceId,
  workspace,
  goBack,
}) {
  const [subscription, setSubscription] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [portalLoading, setPortalLoading] =
    useState(false);

  const [changingPlan, setChangingPlan] =
    useState('');

  useEffect(() => {
    cargarSuscripcion();
  }, [workspaceId]);

  async function cargarSuscripcion() {
    if (!workspaceId) {
      setError(
        'No se encontró el proyecto del Artista.'
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result =
        await getWorkspaceSubscription(
          workspaceId
        );

      setSubscription(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'No se pudo cargar la suscripción.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function abrirPortalFacturacion() {
    if (!workspaceId) {
      toast.error(
        'No se encontró el proyecto del Artista.'
      );
      return;
    }

    try {
      setPortalLoading(true);
      setError('');

      const result =
        await createCustomerPortalSession({
          workspaceId,
        });

      window.location.assign(
        result.portalUrl
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo abrir el portal de facturación.';

      setError(mensaje);
      toast.error(mensaje);
      setPortalLoading(false);
    }
  }

  async function cambiarPlan(
    targetPlan
  ) {
    const currentPlan =
      subscription?.plan_code || '';

    if (
      !targetPlan ||
      targetPlan === currentPlan
    ) {
      return;
    }

    const targetLabel =
      getPlanLabel(targetPlan);

    const confirmation =
      targetPlan === 'essential'
        ? window.confirm(
            'El plan Esencial admite un solo Gestor. Stripe aplicará el cambio y cualquier ajuste proporcional correspondiente. ¿Deseas continuar?'
          )
        : window.confirm(
            'El plan Profesional admite Gestores ilimitados. Stripe cobrará inmediatamente el ajuste proporcional del período actual. ¿Deseas continuar?'
          );

    if (!confirmation) {
      return;
    }

    try {
      setChangingPlan(targetPlan);
      setError('');

      const result =
        await changeSubscriptionPlan({
          workspaceId,
          targetPlan,
        });

      if (result?.pendingUpdate) {
        toast(
          'Stripe dejó el cambio pendiente de completar el cobro. Revisa Administrar suscripción.',
          {
            duration: 9000,
          }
        );
      } else {
        toast.success(
          `Cambio al plan ${targetLabel} enviado correctamente.`,
          {
            duration: 7000,
          }
        );
      }

      let updatedSubscription =
        null;

      for (
        let attempt = 0;
        attempt < 12;
        attempt += 1
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              attempt === 0
                ? 700
                : 1200
            )
        );

        const refreshed =
          await getWorkspaceSubscription(
            workspaceId
          );

        setSubscription(refreshed);
        updatedSubscription =
          refreshed;

        if (
          refreshed?.plan_code ===
          targetPlan
        ) {
          break;
        }
      }

      if (
        updatedSubscription
          ?.plan_code === targetPlan
      ) {
        toast.success(
          `Tu plan ${targetLabel} ya está activo.`,
          {
            id:
              `plan-active-${targetPlan}`,
            duration: 7000,
          }
        );
      } else if (
        !result?.pendingUpdate
      ) {
        toast(
          'Stripe está procesando el cambio. El plan se actualizará automáticamente cuando llegue la confirmación.',
          {
            duration: 9000,
          }
        );
      }
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo cambiar el plan.';

      setError(mensaje);

      toast.error(
        mensaje,
        {
          duration: 9000,
        }
      );
    } finally {
      setChangingPlan('');
    }
  }

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="subscription-loading">
          Cargando suscripción...
        </div>
      </div>
    );
  }

  const isLegacy =
    subscription?.billing_mode ===
    'legacy';

  const currentPlan =
    subscription?.plan_code || '';

  const targetPlan =
    currentPlan === 'essential'
      ? 'professional'
      : 'essential';

  return (
    <div className="subscription-page">
      <header className="subscription-heading">
        <div>
          <span className="subscription-eyebrow">
            Configuración
          </span>

          <h1>
            Suscripción y facturación
          </h1>

          <p>
            Administra el plan de{' '}
            <strong>
              {
                workspace
                  ?.workspace_name
              }
            </strong>
            , los métodos de pago y las
            facturas de MiBooking.
          </p>
        </div>

        <button
          type="button"
          className="subscription-back"
          onClick={goBack}
        >
          ← Atrás
        </button>
      </header>

      {error && (
        <div className="subscription-error">
          {error}
        </div>
      )}

      {isLegacy ? (
        <section className="subscription-legacy">
          <div className="subscription-legacy-icon">
            ✓
          </div>

          <div>
            <span>
              Acceso administrativo
            </span>

            <h2>
              Acceso heredado activo
            </h2>

            <p>
              Este proyecto conserva acceso
              anterior al sistema de
              suscripciones y todavía no tiene
              una facturación de Stripe
              vinculada.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="subscription-summary">
            <article>
              <span>
                Plan actual
              </span>

              <strong>
                {getPlanLabel(
                  currentPlan
                ) || 'Sin plan'}
              </strong>

              <small>
                {getPlanPrice(
                  currentPlan
                )}
              </small>
            </article>

            <article>
              <span>
                Estado
              </span>

              <strong>
                {getSubscriptionStatusLabel(
                  subscription?.status
                )}
              </strong>

              <small>
                {subscription
                  ?.cancel_at_period_end
                  ? 'La renovación automática está cancelada.'
                  : 'Renovación automática activa.'}
              </small>
            </article>

            <article>
              <span>
                {subscription
                  ?.cancel_at_period_end
                  ? 'Acceso disponible hasta'
                  : 'Próxima renovación'}
              </span>

              <strong>
                {formatSubscriptionDate(
                  subscription
                    ?.current_period_end
                ) || 'Por confirmar'}
              </strong>

              <small>
                Los cambios se sincronizan
                mediante Stripe.
              </small>
            </article>
          </section>

          {subscription
            ?.discount_percent > 0 && (
            <section className="subscription-discount">
              <div>
                <span>
                  Beneficio promocional
                </span>

                <h2>
                  {
                    subscription
                      .discount_percent
                  }
                  % de descuento activo
                </h2>

                <p>
                  {getDiscountDescription(
                    subscription
                  )}
                </p>
              </div>

              <strong>
                La Oreja Media
              </strong>
            </section>
          )}

          <section className="subscription-actions">
            <div className="subscription-action-copy">
              <span>
                Cambiar de plan
              </span>

              {currentPlan ===
              'essential' ? (
                <>
                  <h2>
                    Pasa a Profesional
                  </h2>

                  <p>
                    Trabaja con Gestores
                    ilimitados. Stripe cobrará
                    el ajuste proporcional del
                    período actual.
                  </p>
                </>
              ) : (
                <>
                  <h2>
                    Cambiar a Esencial
                  </h2>

                  <p>
                    Esencial admite un solo
                    Gestor. Debes conservar como
                    máximo un acceso entre
                    Gestores e invitaciones
                    pendientes.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              className="subscription-primary"
              onClick={() =>
                cambiarPlan(
                  targetPlan
                )
              }
              disabled={
                Boolean(changingPlan) ||
                portalLoading ||
                subscription
                  ?.cancel_at_period_end
              }
            >
              {changingPlan
                ? 'Procesando cambio...'
                : currentPlan ===
                    'essential'
                  ? 'Mejorar a Profesional'
                  : 'Cambiar a Esencial'}
            </button>

            {subscription
              ?.cancel_at_period_end && (
              <small className="subscription-cancel-note">
                Reactiva primero la
                renovación desde Administrar
                suscripción.
              </small>
            )}
          </section>

          <section className="subscription-portal">
            <div>
              <span>
                Portal seguro de Stripe
              </span>

              <h2>
                Pagos, facturas y renovación
              </h2>

              <p>
                Actualiza tu tarjeta, consulta
                facturas o cancela la renovación
                desde el portal seguro de
                Stripe.
              </p>
            </div>

            <button
              type="button"
              className="subscription-secondary"
              onClick={
                abrirPortalFacturacion
              }
              disabled={portalLoading}
            >
              {portalLoading
                ? 'Abriendo Stripe...'
                : 'Administrar suscripción'}
            </button>
          </section>
        </>
      )}

      <nav className="subscription-legal-links">
        <a href="/?legal=terms">
          Términos
        </a>

        <a href="/?legal=privacy">
          Privacidad
        </a>

        <a href="/?legal=refunds">
          Cancelaciones y reembolsos
        </a>
      </nav>
    </div>
  );
}
