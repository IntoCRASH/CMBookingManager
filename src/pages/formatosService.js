import { supabase } from "./supabaseClient";
import { requireWorkspaceId } from "./workspaceService";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIPOS_TARIFA_MUSICO = ["estandar", "multiplicador", "fija"];

function requireFormatoId(value) {
  const parsed = String(value || "").trim();

  if (!UUID_PATTERN.test(parsed)) {
    throw new Error("El Formato seleccionado no es válido.");
  }

  return parsed;
}

function normalizarModoTarifa(value) {
  return value === "individual" ? "individual" : "uniforme";
}

function normalizarMusicosConfig(value) {
  if (!Array.isArray(value)) return [];

  return value.map((musico, index) => {
    const tipoTarifa = TIPOS_TARIFA_MUSICO.includes(musico?.tipo_tarifa)
      ? musico.tipo_tarifa
      : "estandar";

    const valorOriginal = Number(
      musico?.valor ?? (tipoTarifa === "multiplicador" ? 1 : 0),
    );

    const valor = Number.isFinite(valorOriginal)
      ? valorOriginal
      : tipoTarifa === "multiplicador"
        ? 1
        : 0;

    return {
      rol: String(musico?.rol || `Músico ${index + 1}`)
        .trim()
        .replace(/\s+/g, " "),

      nombre: String(musico?.nombre || "")
        .trim()
        .replace(/\s+/g, " "),

      tipo_tarifa: tipoTarifa,

      valor: tipoTarifa === "estandar" ? 1 : valor,
    };
  });
}

function validarMusicosConfig(config) {
  config.forEach((musico, index) => {
    if (!musico.rol) {
      throw new Error(`Escribe el rol o instrumento del músico ${index + 1}.`);
    }

    if (
      musico.tipo_tarifa === "multiplicador" &&
      (!Number.isFinite(musico.valor) || musico.valor <= 0)
    ) {
      throw new Error(
        `El multiplicador de ${musico.rol} debe ser mayor que cero.`,
      );
    }

    if (
      musico.tipo_tarifa === "fija" &&
      (!Number.isFinite(musico.valor) || musico.valor < 0)
    ) {
      throw new Error(`La tarifa fija de ${musico.rol} no puede ser negativa.`);
    }
  });
}

export async function getFormatos(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("formatos")
    .select("*")
    .eq("workspace_id", currentWorkspaceId)
    .order("cantidad_musicos", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getFormatosActivos(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("formatos")
    .select("*")
    .eq("workspace_id", currentWorkspaceId)
    .eq("activo", true)
    .order("cantidad_musicos", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getFormatoById(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(id);

  const { data, error } = await supabase
    .from("formatos")
    .select("*")
    .eq("id", currentFormatoId)
    .eq("workspace_id", currentWorkspaceId)
    .single();

  if (error) throw error;

  return data;
}

export async function saveFormato(formato, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const modoTarifaMusicos = normalizarModoTarifa(formato?.modo_tarifa_musicos);
  const musicosConfig = normalizarMusicosConfig(formato?.musicos_config);

  if (modoTarifaMusicos === "individual") {
    validarMusicosConfig(musicosConfig);
  }

  const cantidadMusicos =
    modoTarifaMusicos === "individual"
      ? musicosConfig.length
      : Number(formato?.cantidad_musicos ?? 1);

  const payload = {
    workspace_id: currentWorkspaceId,
    nombre: String(formato?.nombre || "").trim(),
    cantidad_musicos: cantidadMusicos,
    modo_tarifa_musicos: modoTarifaMusicos,
    musicos_config: modoTarifaMusicos === "individual" ? musicosConfig : [],
    activo: formato?.activo ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error("El nombre del Formato es obligatorio.");
  }

  if (
    !Number.isInteger(payload.cantidad_musicos) ||
    payload.cantidad_musicos < 0
  ) {
    throw new Error(
      "La cantidad de músicos debe ser un número entero igual o mayor que cero.",
    );
  }

  if (Object.prototype.hasOwnProperty.call(formato || {}, "rider_config")) {
    payload.rider_config = formato.rider_config || {};
  }

  if (formato?.id) {
    const currentFormatoId = requireFormatoId(formato.id);

    const { data, error } = await supabase
      .from("formatos")
      .update(payload)
      .eq("id", currentFormatoId)
      .eq("workspace_id", currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from("formatos")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function saveFormatoRiderConfig(
  formatoId,
  riderConfig,
  workspaceId,
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(formatoId);

  const config =
    riderConfig && typeof riderConfig === "object" ? riderConfig : {};

  const integrantes = Array.isArray(config.integrantes)
    ? config.integrantes
    : [];

  if (integrantes.length === 0) {
    throw new Error("Agrega por lo menos un integrante al rider del Formato.");
  }

  const { data, error } = await supabase
    .from("formatos")
    .update({
      rider_config: config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentFormatoId)
    .eq("workspace_id", currentWorkspaceId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteFormato(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(id);

  const { error } = await supabase
    .from("formatos")
    .delete()
    .eq("id", currentFormatoId)
    .eq("workspace_id", currentWorkspaceId);

  if (error) throw error;

  return true;
}
