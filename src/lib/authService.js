import { supabase } from './supabaseClient';

function clean(value) {
  return String(value || '').trim();
}

function normalizePlan(value) {
  if (value === 'professional') {
    return 'professional';
  }

  if (value === 'essential') {
    return 'essential';
  }

  return '';
}

function normalizeBillingCycle(value) {
  return value === 'annual'
    ? 'annual'
    : 'monthly';
}

export function buildAuthRedirectUrl(
  invitationToken = ''
) {
  const url = new URL(
    window.location.href
  );

  url.search = '';
  url.hash = '';

  if (clean(invitationToken)) {
    url.searchParams.set(
      'invitacion_gestor',
      clean(invitationToken)
    );

    url.searchParams.set(
      'decision',
      'accept'
    );
  }

  return url.toString();
}

export async function ensureMyAccountReady({
  accountType = null,
  name = null,
  artistName = null,
} = {}) {
  const { data, error } =
    await supabase.rpc(
      'complete_my_signup_onboarding',
      {
        p_tipo_registro:
          clean(accountType) || null,

        p_nombre:
          clean(name) || null,

        p_nombre_artistico:
          clean(artistName) || null,
      }
    );

  if (error) throw error;

  return data;
}

export async function signInAccount({
  email,
  password,
  accountType = null,
}) {
  const { data, error } =
    await supabase.auth
      .signInWithPassword({
        email: clean(email).toLowerCase(),
        password,
      });

  if (error) throw error;

  await ensureMyAccountReady({
    accountType,
  });

  return data;
}

export async function signUpAccount({
  name,
  artistName,
  email,
  password,
  accountType,
  invitationToken = '',
  selectedPlan = '',
  billingCycle = '',
}) {
  const type =
    accountType === 'artista'
      ? 'artista'
      : 'gestor';

  const plan =
    type === 'artista'
      ? normalizePlan(selectedPlan)
      : '';

  const cycle = plan
    ? normalizeBillingCycle(
        billingCycle
      )
    : '';

  const { data, error } =
    await supabase.auth.signUp({
      email:
        clean(email).toLowerCase(),

      password,

      options: {
        emailRedirectTo:
          buildAuthRedirectUrl(
            invitationToken
          ),

        data: {
          nombre: clean(name),
          full_name: clean(name),
          nombre_artistico:
            type === 'artista'
              ? clean(artistName) ||
                clean(name)
              : null,

          tipo_registro_inicial:
            type,

          selected_plan:
            plan || null,

          billing_cycle:
            cycle || null,
        },
      },
    });

  if (error) throw error;

  if (data?.session) {
    await ensureMyAccountReady({
      accountType: type,
      name,
      artistName,
    });
  }

  return data;
}

export async function updateCurrentPassword(
  passwordOrPayload,
  maybeNewPassword = ''
) {
  let newPassword = '';

  if (typeof maybeNewPassword === 'string' && maybeNewPassword) {
    newPassword = maybeNewPassword;
  } else if (typeof passwordOrPayload === 'string') {
    newPassword = passwordOrPayload;
  } else if (
    passwordOrPayload &&
    typeof passwordOrPayload === 'object'
  ) {
    newPassword =
      passwordOrPayload.newPassword ||
      passwordOrPayload.password ||
      passwordOrPayload.nuevaPassword ||
      passwordOrPayload.nuevaContrasena ||
      '';
  }

  newPassword = String(newPassword || '');

  if (newPassword.length < 8) {
    throw new Error(
      'La nueva contraseña debe tener al menos 8 caracteres.'
    );
  }

  const { data, error } =
    await supabase.auth.updateUser({
      password: newPassword,
    });

  if (error) throw error;

  return data;
}

