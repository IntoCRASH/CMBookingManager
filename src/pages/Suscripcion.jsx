import {
  useEffect,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import {
  changeSubscriptionPlan,
  createCustomerPortalSession,
  formatSubscriptionDate,
  getBillingCycleLabel,
  getDiscountDescription,
  getPlanLabel,
  getPlanPrice,
  getSubscriptionStatusLabel,
  getWorkspaceSubscription,
  normalizeBillingCycle,
} from '../lib/subscriptionService';
import './Suscripcion.css';

const PLAN_OPTIONS = [
  {
    code: 'essential',
    title: 'Esencial',
    description:
      'Para Artistas que trabajan solos o con un colaborador de confianza.',
    managerLimit:
      'Hasta 1 Gestor autorizado',
  },
  {
    code: 'professional',
    title: 'Profesional',
    description:
      'Para Artistas con equipos de booking, representantes o varios colaboradores.',
    managerLimit:
      'Gestores ilimitados',
  },
];

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

  const [changingOption, setChangingOption] =
    useState('');

  const [
    selectedBillingCycle,
    setSelectedBillingCycle,
  ] = useState('monthly');

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

      setSelectedBillingCycle(
        normalizeBillingCycle(
          result?.billing_cycle
        ) || 'monthly'
      );
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

  async function cambiarSuscripcion(
    targetPlan,
    targetBillingCycle
  ) {
    const currentPlan =
      subscription?.plan_code || '';

    const currentBillingCycle =
      normalizeBillingCycle(
        subscription?.billing_cycle
      ) || 'monthly';

    if (
      !targetPlan ||
      !targetBillingCycle ||
      (
        targetPlan === currentPlan &&
        targetBillingCycle ===
          currentBillingCycle
      )
    ) {
      return;
    }

    const targetLabel =
      getPlanLabel(targetPlan);

    const targetCycleLabel =
      getBillingCycleLabel(
        targetBillingCycle
      );

    const cycleChanged =
      targetBillingCycle !==
      currentBillingCycle;

    const trialing =
      subscription?.status ===
      'trialing';

    let confirmationMessage = '';

    if (trialing) {
      confirmationMessage =
        `Cambiarás al plan ${targetLabel} con facturación ${targetCycleLabel.toLowerCase()}. ` +
        'El cambio conservará la fecha de finalización de tu prueba gratis. ¿Deseas continuar?';
    } else if (cycleChanged) {
      confirmationMessage =
        `Cambiarás al plan ${targetLabel} con facturación ${targetCycleLabel.toLowerCase()}. ` +
        'Stripe reiniciará el ciclo de facturación y calculará los créditos o cargos proporcionales correspondientes. ¿Deseas continuar?';
    } else if (
      targetPlan ===
      'professional'
    ) {
      confirmationMessage =
        'El plan Profesional admite Gestores ilimitados. Stripe cobrará inmediatamente el ajuste proporcional del período actual. ¿Deseas continuar?';
    } else {
      confirmationMessage =
        'El plan Esencial admite un solo Gestor. Stripe aplicará el cambio y cualquier ajuste proporcional correspondiente. ¿Deseas continuar?';
    }

    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }

    const optionKey =
      `${targetPlan}-${targetBillingCycle}`;

    try {
      setChangingOption(
        optionKey
      );
      setError('');

      const result =
        await changeSubscriptionPlan({
          workspaceId,
          targetPlan,
          targetBillingCycle,
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
          `Cambio a ${targetLabel} ${targetCycleLabel.toLowerCase()} enviado correctamente.`,
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

        const refreshedCycle =
          normalizeBillingCycle(
            refreshed?.billing_cycle
          ) || 'monthly';

        if (
          refreshed?.plan_code ===
            targetPlan &&
          refreshedCycle ===
            targetBillingCycle
        ) {
          break;
        }
      }

      const updatedCycle =
        normalizeBillingCycle(
          updatedSubscription
            ?.billing_cycle
        ) || 'monthly';

      if (
        updatedSubscription
          ?.plan_code === targetPlan &&
        updatedCycle ===
          targetBillingCycle
      ) {
        setSelectedBillingCycle(
          targetBillingCycle
        );

        toast.success(
          `Tu plan ${targetLabel} ${targetCycleLabel.toLowerCase()} ya está activo.`,
          {
            id:
              `subscription-active-${optionKey}`,
            duration: 7000,
          }
        );
      } else if (
        !result?.pendingUpdate
      ) {
        toast(
          'Stripe está procesando el cambio. La suscripción se actualizará automáticamente cuando llegue la confirmación.',
          {
            duration: 9000,
          }
        );
      }
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo cambiar la suscripción.';

      setError(mensaje);

      toast.error(
        mensaje,
        {
          duration: 9000,
        }
      );
    } finally {
      setChangingOption('');
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

  const currentBillingCycle =
    normalizeBillingCycle(
      subscription?.billing_cycle
    ) || 'monthly';

  const isTrialing =
    subscription?.status ===
    'trialing';

  const activeDiscount =
    Number(
      subscription?.discount_percent
    ) > 0;

  const renewalDate =
    isTrialing
      ? subscription?.trial_ends_at ||
        subscription?.current_period_end
      : subscription?.current_period_end;

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
            , la modalidad de pago, los
            métodos de pago y las facturas
            de MiBooking.
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
                  currentPlan,
                  currentBillingCycle
                )}
                {' · '}
                {getBillingCycleLabel(
                  currentBillingCycle
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
                {isTrialing
                  ? 'No se realizará ningún cobro hasta que termine la prueba.'
                  : subscription
                      ?.cancel_at_period_end
                    ? 'La renovación automática está cancelada.'
                    : 'Renovación automática activa.'}
              </small>
            </article>

            <article>
              <span>
                {isTrialing
                  ? 'Fin de la prueba'
                  : subscription
                      ?.cancel_at_period_end
                    ? 'Acceso disponible hasta'
                    : 'Próxima renovación'}
              </span>

              <strong>
                {formatSubscriptionDate(
                  renewalDate
                ) || 'Por confirmar'}
              </strong>

              <small>
                Los cambios se sincronizan
                mediante Stripe.
              </small>
            </article>
          </section>

          {activeDiscount && (
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

          <section className="subscription-change">
            <div className="subscription-change-heading">
              <div>
                <span>
                  Plan y modalidad
                </span>

                <h2>
                  Elige cómo quieres continuar
                </h2>

                <p>
                  Puedes cambiar de plan o pasar
                  de facturación mensual a anual
                  desde esta misma página.
                </p>
              </div>

              <div
                className="subscription-cycle-switch"
                role="group"
                aria-label="Modalidad de facturación"
              >
                <button
                  type="button"
                  className={
                    selectedBillingCycle ===
                    'monthly'
                      ? 'active'
                      : ''
                  }
                  aria-pressed={
                    selectedBillingCycle ===
                    'monthly'
                  }
                  onClick={() =>
                    setSelectedBillingCycle(
                      'monthly'
                    )
                  }
                >
                  Mensual
                </button>

                <button
                  type="button"
                  className={
                    selectedBillingCycle ===
                    'annual'
                      ? 'active'
                      : ''
                  }
                  aria-pressed={
                    selectedBillingCycle ===
                    'annual'
                  }
                  onClick={() =>
                    setSelectedBillingCycle(
                      'annual'
                    )
                  }
                  disabled={
                    activeDiscount
                  }
                  title={
                    activeDiscount
                      ? 'La promoción activa corresponde a una suscripción mensual.'
                      : ''
                  }
                >
                  Anual
                  <small>
                    Ahorra hasta 42%
                  </small>
                </button>
              </div>
            </div>

            {activeDiscount && (
              <p className="subscription-promotion-cycle-note">
                Tu beneficio promocional está
                vinculado a la modalidad mensual.
                Podrás seleccionar la modalidad
                anual cuando termine la promoción.
              </p>
            )}

            <div className="subscription-plan-grid">
              {PLAN_OPTIONS.map(
                (planOption) => {
                  const optionKey =
                    `${planOption.code}-${selectedBillingCycle}`;

                  const isCurrent =
                    planOption.code ===
                      currentPlan &&
                    selectedBillingCycle ===
                      currentBillingCycle;

                  const isChanging =
                    changingOption ===
                      optionKey;

                  return (
                    <article
                      key={planOption.code}
                      className={[
                        'subscription-plan-card',
                        planOption.code ===
                        'professional'
                          ? 'featured'
                          : '',
                        isCurrent
                          ? 'current'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {isCurrent && (
                        <span className="subscription-current-badge">
                          Plan actual
                        </span>
                      )}

                      <div>
                        <span className="subscription-plan-name">
                          {planOption.title}
                        </span>

                        <h3>
                          {getPlanPrice(
                            planOption.code,
                            selectedBillingCycle
                          )}
                        </h3>

                        <p>
                          {
                            planOption.description
                          }
                        </p>
                      </div>

                      <strong className="subscription-manager-limit">
                        {
                          planOption.managerLimit
                        }
                      </strong>

                      <button
                        type="button"
                        className={
                          planOption.code ===
                          'professional'
                            ? 'subscription-primary'
                            : 'subscription-secondary-light'
                        }
                        onClick={() =>
                          cambiarSuscripcion(
                            planOption.code,
                            selectedBillingCycle
                          )
                        }
                        disabled={
                          isCurrent ||
                          Boolean(
                            changingOption
                          ) ||
                          portalLoading ||
                          subscription
                            ?.cancel_at_period_end ||
                          (
                            activeDiscount &&
                            selectedBillingCycle ===
                              'annual'
                          )
                        }
                      >
                        {isChanging
                          ? 'Procesando cambio...'
                          : isCurrent
                            ? 'Selección actual'
                            : `Cambiar a ${planOption.title}`}
                      </button>
                    </article>
                  );
                }
              )}
            </div>

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
