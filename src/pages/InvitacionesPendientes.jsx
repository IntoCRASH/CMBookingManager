import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  acceptWorkspaceInvitation,
  getMyPendingInvitations,
  rejectWorkspaceInvitation,
} from '../lib/teamService';

export default function InvitacionesPendientes({
  compact = false,
  goBack,
  onInvitationAccepted,
  onLogout,
}) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    try {
      setLoading(true);
      const data = await getMyPendingInvitations();
      setInvitations(data);
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudieron cargar las invitaciones.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function accept(invitation) {
    try {
      setProcessingId(invitation.invitation_id);

      const accepted = await acceptWorkspaceInvitation(
        invitation.invitation_id
      );

      toast.success(
        `Ya puedes gestionar a ${accepted.workspace_name}.`
      );

      await loadInvitations();

      if (typeof onInvitationAccepted === 'function') {
        await onInvitationAccepted(accepted.workspace_id);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudo aceptar la invitación.'
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function reject(invitation) {
    if (
      !window.confirm(
        `¿Rechazar la invitación de ${invitation.workspace_name}?`
      )
    ) {
      return;
    }

    try {
      setProcessingId(invitation.invitation_id);
      await rejectWorkspaceInvitation(invitation.invitation_id);
      toast.success('Invitación rechazada.');
      await loadInvitations();
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudo rechazar la invitación.'
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatDate(value) {
    if (!value) return 'Sin fecha límite';

    return new Date(value).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const content = (
    <>
      <div className="team-page-heading">
        <div>
          <span className="team-eyebrow">Accesos recibidos</span>
          <h1>Invitaciones</h1>
          <p>
            Acepta una invitación para comenzar a gestionar ese
            Artista desde tu propia cuenta.
          </p>
        </div>

        <div className="team-heading-actions">
          {typeof goBack === 'function' && (
            <button type="button" onClick={goBack}>
              ← Atrás
            </button>
          )}

          {typeof onLogout === 'function' && (
            <button type="button" onClick={onLogout}>
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="team-empty-state">
          Cargando invitaciones...
        </div>
      ) : invitations.length === 0 ? (
        <div className="team-empty-state">
          <strong>No tienes invitaciones pendientes.</strong>
          <span>
            El Artista debe enviarla al mismo correo con el que
            registraste esta cuenta.
          </span>
        </div>
      ) : (
        <div className="invitation-received-list">
          {invitations.map((invitation) => (
            <article
              className="invitation-received-card"
              key={invitation.invitation_id}
            >
              <div className="invitation-artist-avatar">
                {String(invitation.workspace_name || 'A')
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="invitation-received-info">
                <span>Invitación para gestionar</span>
                <h2>{invitation.workspace_name}</h2>
                <p>
                  Enviada por{' '}
                  <strong>{invitation.artist_name}</strong>
                </p>
                <small>
                  Comisión acordada:{' '}
                  <strong>
                    {Number(
                      invitation.commission_percentage || 0
                    )}
                    %
                  </strong>
                  {' · '}
                  Expira: {formatDate(invitation.expires_at)}
                </small>
              </div>

              <div className="invitation-received-actions">
                <button
                  type="button"
                  className="team-primary-button"
                  disabled={
                    processingId === invitation.invitation_id
                  }
                  onClick={() => accept(invitation)}
                >
                  {processingId === invitation.invitation_id
                    ? 'Procesando...'
                    : 'Aceptar'}
                </button>

                <button
                  type="button"
                  disabled={
                    processingId === invitation.invitation_id
                  }
                  onClick={() => reject(invitation)}
                >
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <section className="team-incoming-section">
        {content}
      </section>
    );
  }

  return <div className="dashboard team-page">{content}</div>;
}
