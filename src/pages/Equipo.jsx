import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import {
  createWorkspaceInvitation,
  getWorkspaceManagers,
  getWorkspacePendingInvitations,
  removeWorkspaceManager,
  resendWorkspaceInvitationEmail,
  revokeWorkspaceInvitation,
  updateWorkspaceManagerCommission,
} from '../lib/teamService';
import {
  getPlanLabel,
  getWorkspaceSubscription,
} from '../lib/subscriptionService';
import InvitacionesPendientes from './InvitacionesPendientes';

const inviteInitial = {
  email: '',
  commissionPercentage: '0',
};

export default function Equipo({
  workspaceId,
  workspace,
  goBack,
  onInvitationAccepted,
}) {
  const [managers, setManagers] =
    useState([]);

  const [
    pendingInvitations,
    setPendingInvitations,
  ] = useState([]);

  const [subscription, setSubscription] =
    useState(null);

  const [inviteForm, setInviteForm] =
    useState(inviteInitial);

  const [loading, setLoading] =
    useState(true);

  const [
    savingInvitation,
    setSavingInvitation,
  ] = useState(false);

  const [
    sendingEmailId,
    setSendingEmailId,
  ] = useState(null);

  const [
    editingCommissionId,
    setEditingCommissionId,
  ] = useState(null);

  const [
    commissionDraft,
    setCommissionDraft,
  ] = useState('');

  useEffect(() => {
    loadTeam();
  }, [workspaceId]);

  const planIsUnlimited =
    subscription?.billing_mode ===
      'legacy' ||
    subscription?.plan_code ===
      'professional';

  const reservedSlots =
    managers.length +
    pendingInvitations.length;

  const essentialLimitReached =
    !planIsUnlimited &&
    subscription?.plan_code ===
      'essential' &&
    reservedSlots >= 1;

  const planLabel =
    subscription?.billing_mode ===
    'legacy'
      ? 'Acceso heredado'
      : getPlanLabel(
          subscription?.plan_code
        ) || 'Sin plan';

  const usageText = useMemo(() => {
    if (planIsUnlimited) {
      return `${managers.length} Gestor${
        managers.length === 1
          ? ''
          : 'es'
      } vinculado${
        managers.length === 1
          ? ''
          : 's'
      } · Sin límite`;
    }

    if (
      subscription?.plan_code ===
      'essential'
    ) {
      return `${reservedSlots} de 1 acceso reservado`;
    }

    return 'Suscripción pendiente';
  }, [
    managers.length,
    planIsUnlimited,
    reservedSlots,
    subscription?.plan_code,
  ]);

  async function loadTeam() {
    try {
      setLoading(true);

      const [
        managerData,
        invitationData,
        subscriptionData,
      ] = await Promise.all([
        getWorkspaceManagers(
          workspaceId
        ),

        getWorkspacePendingInvitations(
          workspaceId
        ),

        getWorkspaceSubscription(
          workspaceId
        ),
      ]);

      setManagers(
        Array.isArray(managerData)
          ? managerData
          : []
      );

      setPendingInvitations(
        Array.isArray(invitationData)
          ? invitationData
          : []
      );

      setSubscription(
        subscriptionData
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo cargar el equipo.'
      );
    } finally {
      setLoading(false);
    }
  }

  function changeInvite(event) {
    const { name, value } =
      event.target;

    setInviteForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submitInvitation(
    event
  ) {
    event.preventDefault();

    if (essentialLimitReached) {
      toast.error(
        'Tu plan Esencial admite un solo Gestor. Cancela la invitación pendiente, retira el acceso existente o cambia al plan Profesional.',
        {
          duration: 9000,
        }
      );
      return;
    }

    try {
      setSavingInvitation(true);

      const invitation =
        await createWorkspaceInvitation(
          {
            email:
              inviteForm.email,

            commissionPercentage:
              inviteForm
                .commissionPercentage,
          },
          workspaceId
        );

      setInviteForm(
        inviteInitial
      );

      toast.success(
        `Invitación enviada por email a ${invitation.email}.`
      );

      await loadTeam();
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo crear y enviar la invitación.',
        {
          duration: 9000,
        }
      );

      if (
        error?.invitationCreated
      ) {
        await loadTeam();
      }
    } finally {
      setSavingInvitation(false);
    }
  }

  function beginCommissionEdit(
    manager
  ) {
    setEditingCommissionId(
      manager.membership_id
    );

    setCommissionDraft(
      String(
        manager
          .commission_percentage ||
          0
      )
    );
  }

  async function saveCommission(
    manager
  ) {
    try {
      await updateWorkspaceManagerCommission(
        manager.membership_id,
        commissionDraft,
        workspaceId
      );

      toast.success(
        'Comisión actualizada.'
      );

      setEditingCommissionId(
        null
      );

      setCommissionDraft('');

      await loadTeam();
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo actualizar la comisión.'
      );
    }
  }

  async function removeManager(
    manager
  ) {
    if (
      !window.confirm(
        `¿Retirar el acceso de ${manager.full_name}?`
      )
    ) {
      return;
    }

    try {
      await removeWorkspaceManager(
        manager.membership_id,
        workspaceId
      );

      toast.success(
        'Acceso del Gestor retirado.'
      );

      await loadTeam();
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo retirar el acceso.'
      );
    }
  }

  async function revokeInvitation(
    invitation
  ) {
    if (
      !window.confirm(
        `¿Cancelar la invitación enviada a ${invitation.email}?`
      )
    ) {
      return;
    }

    try {
      await revokeWorkspaceInvitation(
        invitation.invitation_id,
        workspaceId
      );

      toast.success(
        'Invitación cancelada.'
      );

      await loadTeam();
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo cancelar la invitación.'
      );
    }
  }

  async function resendInvitation(
    invitation
  ) {
    try {
      setSendingEmailId(
        invitation.invitation_id
      );

      await resendWorkspaceInvitationEmail(
        invitation.invitation_id
      );

      toast.success(
        `Invitación reenviada a ${invitation.email}.`
      );

      await loadTeam();
    } catch (error) {
      console.error(error);

      toast.error(
        error.message ||
          'No se pudo reenviar la invitación.'
      );

      await loadTeam();
    } finally {
      setSendingEmailId(null);
    }
  }

  function formatDate(value) {
    if (!value) return '--';

    return new Date(
      value
    ).toLocaleDateString(
      'es-DO',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }

  return (
    <div
      className="dashboard team-page"
    >
      <div
        className="team-page-heading"
      >
        <div>
          <span
            className="team-eyebrow"
          >
            Administración del Artista
          </span>

          <h1>
            Equipo y Gestores
          </h1>

          <p>
            Controla quién puede
            trabajar con{' '}
            <strong>
              {
                workspace
                  ?.workspace_name
              }
            </strong>{' '}
            y qué comisión recibe.
          </p>
        </div>

        <button
          type="button"
          onClick={goBack}
        >
          ← Atrás
        </button>
      </div>

      <section
        style={{
          marginBottom: 18,
          padding: 17,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          gap: 16,
          flexWrap: 'wrap',
          borderRadius: 16,
          border:
            '1px solid rgba(99, 102, 241, 0.22)',
          background:
            'linear-gradient(135deg, rgba(45,157,245,.07), rgba(112,85,245,.09))',
        }}
      >
        <div>
          <small>
            Plan del Artista
          </small>

          <h3
            style={{
              margin:
                '5px 0 3px',
            }}
          >
            {planLabel}
          </h3>

          <span>
            {usageText}
          </span>
        </div>

        {essentialLimitReached && (
          <div
            style={{
              maxWidth: 480,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            El cupo del plan
            Esencial está ocupado.
            Cambia a Profesional
            desde Perfil para invitar
            Gestores adicionales.
          </div>
        )}
      </section>

      <section
        className="team-invite-panel"
      >
        <div>
          <span
            className="team-eyebrow"
          >
            Nuevo acceso
          </span>

          <h2>
            Invitar un Gestor
          </h2>

          <p>
            Las cuentas de Gestor no
            tienen costo. MiBooking
            enviará un correo con un
            enlace seguro y la cuenta
            solo podrá vincularse
            mediante la invitación del
            Artista.
          </p>
        </div>

        <form
          className="team-invite-form"
          onSubmit={
            submitInvitation
          }
        >
          <label>
            Correo del Gestor

            <input
              type="email"
              name="email"
              value={
                inviteForm.email
              }
              onChange={
                changeInvite
              }
              placeholder="gestor@correo.com"
              required
              disabled={
                essentialLimitReached
              }
            />
          </label>

          <label>
            Comisión con este
            Artista (%)

            <input
              type="number"
              name="commissionPercentage"
              min="0"
              max="100"
              step="0.01"
              value={
                inviteForm
                  .commissionPercentage
              }
              onChange={
                changeInvite
              }
              required
              disabled={
                essentialLimitReached
              }
            />
          </label>

          <button
            type="submit"
            className="team-primary-button"
            disabled={
              savingInvitation ||
              essentialLimitReached
            }
          >
            {savingInvitation
              ? 'Enviando invitación...'
              : essentialLimitReached
                ? 'Límite del plan alcanzado'
                : 'Enviar invitación'}
          </button>
        </form>
      </section>

      <section
        className="team-section"
      >
        <div
          className="team-section-title"
        >
          <div>
            <span
              className="team-eyebrow"
            >
              Acceso activo
            </span>

            <h2>
              Gestores de{' '}
              {
                workspace
                  ?.workspace_name
              }
            </h2>
          </div>

          <span
            className="team-count"
          >
            {managers.length}
          </span>
        </div>

        {loading ? (
          <div
            className="team-empty-state"
          >
            Cargando equipo...
          </div>
        ) : managers.length ===
          0 ? (
          <div
            className="team-empty-state"
          >
            <strong>
              Todavía no tienes
              Gestores activos.
            </strong>

            <span>
              Crea una invitación
              para vincular la
              primera cuenta.
            </span>
          </div>
        ) : (
          <div
            className="team-manager-list"
          >
            {managers.map(
              (manager) => (
                <article
                  className="team-manager-card"
                  key={
                    manager
                      .membership_id
                  }
                >
                  <div
                    className="team-avatar"
                  >
                    {String(
                      manager
                        .full_name ||
                        manager
                          .email ||
                        'G'
                    )
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div
                    className="team-manager-info"
                  >
                    <h3>
                      {
                        manager
                          .full_name
                      }
                    </h3>

                    <p>
                      {
                        manager
                          .email
                      }
                    </p>

                    <small>
                      Vinculado desde{' '}
                      {formatDate(
                        manager
                          .joined_at
                      )}
                    </small>
                  </div>

                  <div
                    className="team-manager-status"
                  >
                    <span
                      className={
                        manager
                          .status ===
                        'active'
                          ? 'active'
                          : 'suspended'
                      }
                    >
                      {manager
                        .status ===
                      'active'
                        ? 'Activo'
                        : 'Suspendido'}
                    </span>
                  </div>

                  <div
                    className="team-commission-control"
                  >
                    <span>
                      Comisión
                    </span>

                    {editingCommissionId ===
                    manager
                      .membership_id ? (
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            commissionDraft
                          }
                          onChange={(
                            event
                          ) =>
                            setCommissionDraft(
                              event
                                .target
                                .value
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            saveCommission(
                              manager
                            )
                          }
                        >
                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommissionId(
                              null
                            );

                            setCommissionDraft(
                              ''
                            );
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="team-commission-value"
                        onClick={() =>
                          beginCommissionEdit(
                            manager
                          )
                        }
                      >
                        {Number(
                          manager
                            .commission_percentage ||
                            0
                        )}
                        %

                        <small>
                          Editar
                        </small>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="team-danger-button"
                    onClick={() =>
                      removeManager(
                        manager
                      )
                    }
                  >
                    Retirar acceso
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section
        className="team-section"
      >
        <div
          className="team-section-title"
        >
          <div>
            <span
              className="team-eyebrow"
            >
              En espera
            </span>

            <h2>
              Invitaciones enviadas
            </h2>
          </div>

          <span
            className="team-count"
          >
            {
              pendingInvitations
                .length
            }
          </span>
        </div>

        {pendingInvitations
          .length === 0 ? (
          <div
            className="team-empty-state"
          >
            No hay invitaciones
            pendientes.
          </div>
        ) : (
          <div
            className="team-pending-list"
          >
            {pendingInvitations.map(
              (invitation) => (
                <article
                  className="team-pending-card"
                  key={
                    invitation
                      .invitation_id
                  }
                >
                  <div>
                    <strong>
                      {
                        invitation
                          .email
                      }
                    </strong>

                    <span>
                      Comisión:{' '}
                      {Number(
                        invitation
                          .commission_percentage ||
                          0
                      )}
                      %
                    </span>

                    <small>
                      Expira:{' '}
                      {formatDate(
                        invitation
                          .expires_at
                      )}
                    </small>

                    {invitation
                      .email_sent_at && (
                      <small>
                        Email enviado:{' '}
                        {formatDate(
                          invitation
                            .email_sent_at
                        )}
                      </small>
                    )}

                    {invitation
                      .email_error && (
                      <small
                        className="error"
                      >
                        Último envío
                        falló:{' '}
                        {
                          invitation
                            .email_error
                        }
                      </small>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={
                        sendingEmailId ===
                        invitation
                          .invitation_id
                      }
                      onClick={() =>
                        resendInvitation(
                          invitation
                        )
                      }
                    >
                      {sendingEmailId ===
                      invitation
                        .invitation_id
                        ? 'Enviando...'
                        : invitation
                              .email_sent_at
                          ? 'Reenviar email'
                          : 'Enviar email'}
                    </button>

                    <button
                      type="button"
                      className="team-danger-button"
                      onClick={() =>
                        revokeInvitation(
                          invitation
                        )
                      }
                    >
                      Cancelar
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <InvitacionesPendientes
        compact
        onInvitationAccepted={
          onInvitationAccepted
        }
      />
    </div>
  );
}
