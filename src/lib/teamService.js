import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

function firstRow(data) {
  return Array.isArray(data)
    ? data[0] || null
    : data || null;
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;

  if (!data) return [];

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizePercentage(value) {
  const parsed = Number(value || 0);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    throw new Error(
      'La comisión debe estar entre 0 y 100.'
    );
  }

  return parsed;
}

async function getFunctionErrorMessage(error) {
  let message =
    error?.message ||
    'No se pudo enviar el correo de invitación.';

  try {
    const context = error?.context;

    if (
      context &&
      typeof context.json === 'function'
    ) {
      const detail = await context.json();

      message =
        detail?.error ||
        detail?.message ||
        message;
    }
  } catch {
    // Conserva el mensaje principal.
  }

  return message;
}

export async function getWorkspaceManagers(
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { data, error } =
    await supabase.rpc(
      'get_workspace_managers',
      {
        p_workspace_id:
          currentWorkspaceId,
      }
    );

  if (error) throw error;

  return Array.isArray(data)
    ? data
    : [];
}

export async function getWorkspacePendingInvitations(
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { data, error } =
    await supabase.rpc(
      'get_workspace_pending_invitations_with_email',
      {
        p_workspace_id:
          currentWorkspaceId,
      }
    );

  if (error) throw error;

  return normalizeArray(data);
}

export async function sendWorkspaceInvitationEmail(
  invitationId
) {
  const cleanInvitationId =
    Number(invitationId);

  if (
    !Number.isInteger(cleanInvitationId) ||
    cleanInvitationId <= 0
  ) {
    throw new Error(
      'La invitación no es válida.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'enviar-invitacion-gestor',
      {
        body: {
          invitation_id:
            cleanInvitationId,
        },
      }
    );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(error)
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.error ||
        'No se pudo enviar el correo de invitación.'
    );
  }

  return data;
}

export async function createWorkspaceInvitation(
  {
    email,
    commissionPercentage = 0,
  },
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const cleanEmail =
    String(email || '')
      .trim()
      .toLowerCase();

  if (!cleanEmail) {
    throw new Error(
      'El correo del Gestor es obligatorio.'
    );
  }

  const { data, error } =
    await supabase.rpc(
      'create_workspace_invitation',
      {
        p_workspace_id:
          currentWorkspaceId,

        p_email:
          cleanEmail,

        p_commission_percentage:
          normalizePercentage(
            commissionPercentage
          ),
      }
    );

  if (error) throw error;

  const invitation = firstRow(data);

  if (!invitation?.invitation_id) {
    throw new Error(
      'La invitación se creó sin un identificador válido.'
    );
  }

  try {
    const emailResult =
      await sendWorkspaceInvitationEmail(
        invitation.invitation_id
      );

    return {
      ...invitation,
      email_sent: true,
      email_message_id:
        emailResult?.message_id || '',
    };
  } catch (emailError) {
    const wrappedError = new Error(
      'La invitación quedó creada, pero el correo no pudo enviarse: ' +
        (
          emailError?.message ||
          'error desconocido'
        )
    );

    wrappedError.invitationCreated = true;
    wrappedError.invitation = invitation;

    throw wrappedError;
  }
}

export async function resendWorkspaceInvitationEmail(
  invitationId
) {
  return sendWorkspaceInvitationEmail(
    invitationId
  );
}

export async function revokeWorkspaceInvitation(
  invitationId,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { error } =
    await supabase.rpc(
      'revoke_workspace_invitation',
      {
        p_workspace_id:
          currentWorkspaceId,

        p_invitation_id:
          Number(invitationId),
      }
    );

  if (error) throw error;

  return true;
}

export async function updateWorkspaceManagerCommission(
  membershipId,
  commissionPercentage,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { error } =
    await supabase.rpc(
      'update_workspace_manager_commission',
      {
        p_workspace_id:
          currentWorkspaceId,

        p_membership_id:
          Number(membershipId),

        p_commission_percentage:
          normalizePercentage(
            commissionPercentage
          ),
      }
    );

  if (error) throw error;

  return true;
}

export async function removeWorkspaceManager(
  membershipId,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { error } =
    await supabase.rpc(
      'remove_workspace_manager',
      {
        p_workspace_id:
          currentWorkspaceId,

        p_membership_id:
          Number(membershipId),
      }
    );

  if (error) throw error;

  return true;
}

export async function getMyPendingInvitations() {
  const { data, error } =
    await supabase.rpc(
      'get_my_pending_invitations'
    );

  if (error) throw error;

  return Array.isArray(data)
    ? data
    : [];
}

export async function acceptWorkspaceInvitation(
  invitationId
) {
  const { data, error } =
    await supabase.rpc(
      'accept_workspace_invitation',
      {
        p_invitation_id:
          Number(invitationId),
      }
    );

  if (error) throw error;

  return firstRow(data);
}

export async function rejectWorkspaceInvitation(
  invitationId
) {
  const { error } =
    await supabase.rpc(
      'reject_workspace_invitation',
      {
        p_invitation_id:
          Number(invitationId),
      }
    );

  if (error) throw error;

  return true;
}

export async function getWorkspaceInvitationByToken(
  token
) {
  const cleanToken =
    String(token || '').trim();

  const { data, error } =
    await supabase.rpc(
      'get_workspace_invitation_by_token',
      {
        p_token: cleanToken,
      }
    );

  if (error) throw error;

  return data || {
    found: false,
  };
}

export async function acceptWorkspaceInvitationByToken(
  token
) {
  const cleanToken =
    String(token || '').trim();

  const { data, error } =
    await supabase.rpc(
      'accept_workspace_invitation_by_token',
      {
        p_token: cleanToken,
      }
    );

  if (error) throw error;

  return data;
}
