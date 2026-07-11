import { supabase } from './supabaseClient';

const ACTIVE_WORKSPACE_KEY = 'mibooking.activeWorkspaceId';
const ACTIVE_WORKSPACE_USER_PREFIX = 'mibooking.activeWorkspaceId:';

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizeWorkspace(row) {
  if (!row) return null;

  return {
    workspace_id: Number(row.workspace_id),
    workspace_name: row.workspace_name || 'Artista',
    owner_user_id: row.owner_user_id || null,
    member_role: row.member_role || 'manager',
    member_status: row.member_status || 'active',
    commission_percentage: Number(row.commission_percentage || 0),
    can_edit_configuration: Boolean(row.can_edit_configuration),
    is_owner: Boolean(row.is_owner),
  };
}

function userStorageKey(userId) {
  return `${ACTIVE_WORKSPACE_USER_PREFIX}${userId || 'anonymous'}`;
}

export async function getMyWorkspaces() {
  const { data, error } = await supabase.rpc('get_my_workspaces');

  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeWorkspace)
    .filter((workspace) => Number.isFinite(workspace.workspace_id));
}

export function getStoredActiveWorkspaceId(userId) {
  if (!storageAvailable()) return null;

  const userValue = window.localStorage.getItem(userStorageKey(userId));
  const generalValue = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  const parsed = Number(userValue || generalValue);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function persistActiveWorkspace(workspaceId, userId) {
  const parsed = Number(workspaceId);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('El Artista seleccionado no es válido.');
  }

  if (storageAvailable()) {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(parsed));
    window.localStorage.setItem(userStorageKey(userId), String(parsed));
  }

  return parsed;
}

export function clearCurrentActiveWorkspace() {
  if (!storageAvailable()) return;

  window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}

export function getActiveWorkspaceId() {
  if (!storageAvailable()) {
    throw new Error('No se puede determinar el Artista activo.');
  }

  const parsed = Number(window.localStorage.getItem(ACTIVE_WORKSPACE_KEY));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Selecciona el Artista que deseas gestionar.');
  }

  return parsed;
}

export function requireWorkspaceId(workspaceId) {
  const parsed = Number(workspaceId || getActiveWorkspaceId());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Selecciona el Artista que deseas gestionar.');
  }

  return parsed;
}

export async function loadMyWorkspaceContext(userId) {
  const workspaces = await getMyWorkspaces();

  if (workspaces.length === 0) {
    clearCurrentActiveWorkspace();

    return {
      workspaces: [],
      activeWorkspace: null,
    };
  }

  const storedId = getStoredActiveWorkspaceId(userId);

  const activeWorkspace =
    workspaces.find(
      (workspace) => workspace.workspace_id === Number(storedId)
    ) || workspaces[0];

  persistActiveWorkspace(activeWorkspace.workspace_id, userId);

  return {
    workspaces,
    activeWorkspace,
  };
}

export function selectWorkspace(workspaces, workspaceId, userId) {
  const selected = (Array.isArray(workspaces) ? workspaces : []).find(
    (workspace) =>
      workspace.workspace_id === Number(workspaceId) &&
      workspace.member_status === 'active'
  );

  if (!selected) {
    throw new Error('No tienes acceso al Artista seleccionado.');
  }

  persistActiveWorkspace(selected.workspace_id, userId);

  return selected;
}

export function getWorkspaceRoleLabel(workspace) {
  return workspace?.member_role === 'owner' ? 'Artista' : 'Gestor';
}

export function canEditWorkspaceConfiguration(workspace) {
  return Boolean(
    workspace?.member_role === 'owner' ||
      workspace?.can_edit_configuration
  );
}
