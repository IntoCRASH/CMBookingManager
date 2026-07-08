import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let paso = 'inicio';

  try {
    paso = 'leyendo env';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      return json({ error: 'Falta SUPABASE_URL', paso }, 400);
    }

    if (!serviceRoleKey) {
      return json({ error: 'Falta SERVICE_ROLE_KEY', paso }, 400);
    }

    paso = 'creando cliente admin';

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    paso = 'leyendo authorization';

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return json({ error: 'No autorizado', paso }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    paso = 'validando usuario actual';

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return json(
        {
          error: 'Usuario inválido',
          paso,
          detalle: userError?.message || null,
        },
        401
      );
    }

    paso = 'validando perfil admin';

    const { data: perfil, error: perfilError } = await admin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfilError) {
      return json(
        {
          error: 'No se pudo leer el perfil',
          paso,
          detalle: perfilError.message,
        },
        400
      );
    }

    if (perfil?.rol !== 'admin') {
      return json({ error: 'Solo admin puede administrar usuarios', paso }, 403);
    }

    paso = 'leyendo body';

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      paso = 'creando usuario auth';

      const {
        nombre,
        email,
        password,
        rol = 'vendedor',
        comision_porcentaje = 10,
        activo = true,
      } = body;

      if (!nombre || !email || !password) {
        return json({ error: 'Faltan campos obligatorios', paso }, 400);
      }

      const { data: nuevoAuth, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        return json(
          {
            error: 'No se pudo crear el usuario en Auth',
            paso,
            detalle: createError.message,
          },
          400
        );
      }

      paso = 'creando profile';

      const { error: profileError } = await admin.from('profiles').upsert({
        id: nuevoAuth.user.id,
        nombre,
        email,
        rol,
        comision_porcentaje: Number(comision_porcentaje || 0),
        activo,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        return json(
          {
            error: 'No se pudo crear el profile',
            paso,
            detalle: profileError.message,
          },
          400
        );
      }

      return json({ success: true });
    }

    if (action === 'delete') {
      paso = 'borrando usuario';

      const { id } = body;

      if (!id) {
        return json({ error: 'Falta el id del usuario', paso }, 400);
      }

      if (id === user.id) {
        return json({ error: 'No puedes borrar tu propio usuario', paso }, 400);
      }

      await admin.from('profiles').delete().eq('id', id);

      const { error: deleteError } = await admin.auth.admin.deleteUser(id);

      if (deleteError) {
        return json(
          {
            error: 'No se pudo borrar el usuario de Auth',
            paso,
            detalle: deleteError.message,
          },
          400
        );
      }

      return json({ success: true });
    }

    return json({ error: 'Acción no válida', paso }, 400);
  } catch (error) {
    return json(
      {
        error: 'ADMIN_USERS_FAILED',
        paso,
        detalle: error instanceof Error ? error.message : String(error),
        raw: String(error),
      },
      400
    );
  }
});