import { supabase } from './supabaseClient';

function clean(value) {
  return String(value || '').trim();
}

function normalizePlanCode(value) {
  const plan =
    clean(value).toLowerCase();

  return [
    'essential',
    'professional',
  ].includes(plan)
    ? plan
    : '';
}

export function buildAuthRedirectUrl(
  invitationToken = '',
  planCode = ''
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

  const plan =
    normalizePlanCode(planCode);

  if (plan) {
    url.searchParams.set('plan', plan);
  }

  return url.toString();
}

export function buildPasswordResetRedirectUrl() {
  const url = new URL(
    window.location.href
  );

  url.search = '';
  url.hash = '';
  url.searchParams.set(
    'reset_password',
    '1'
  );

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
  planCode = '',
}) {
  const type =
    accountType === 'artista'
      ? 'artista'
      : 'gestor';

  const { data, error } =
    await supabase.auth.signUp({
      email:
        clean(email).toLowerCase(),

      password,

      options: {
        emailRedirectTo:
          buildAuthRedirectUrl(
            invitationToken,
            planCode
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

          mibooking_plan_code:
            type === 'artista'
              ? normalizePlanCode(planCode) || null
              : null,
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

export async function requestPasswordReset(
  email
) {
  const cleanEmail =
    clean(email).toLowerCase();

  if (!cleanEmail) {
    throw new Error(
      'El correo es obligatorio.'
    );
  }

  const { data, error } =
    await supabase.auth
      .resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo:
            buildPasswordResetRedirectUrl(),
        }
      );

  if (error) throw error;

  return data;
}

export async function updateCurrentPassword(
  newPassword
) {
  const password =
    String(newPassword || '');

  if (password.length < 8) {
    throw new Error(
      'La contraseña debe tener al menos 8 caracteres.'
    );
  }

  const { data, error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) throw error;

  return data;
}

