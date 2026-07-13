const COMISION_PORCENTAJE_DEFAULT = 0;
const ROAD_MANAGER_MENOS_4 = 3500;
const MINIMO_CUARTETO = 4;
const REDONDEO_A = 100;
const MINIMO_MUSICOS_SONIDO_GRANDE = 8;

function redondearMonto(valor) {
  return Math.ceil(Number(valor || 0) / REDONDEO_A) * REDONDEO_A;
}

function normalizarModoTarifa(value) {
  return value === "individual" ? "individual" : "uniforme";
}

function normalizarTipoTarifa(value) {
  return ["estandar", "multiplicador", "fija"].includes(value)
    ? value
    : "estandar";
}

function calcularNominaIndividual({
  musicosConfig,
  tarifaMusico,
  multiplicadorMusicos,
}) {
  const config = Array.isArray(musicosConfig) ? musicosConfig : [];

  const detalle = config.map((musico, index) => {
    const tipoTarifa = normalizarTipoTarifa(musico?.tipo_tarifa);

    const valorOriginal = Number(
      musico?.valor ?? (tipoTarifa === "multiplicador" ? 1 : 0),
    );

    const valorConfigurado = Number.isFinite(valorOriginal)
      ? valorOriginal
      : tipoTarifa === "multiplicador"
        ? 1
        : 0;

    let tarifaAntesEvento = tarifaMusico;

    if (tipoTarifa === "multiplicador") {
      tarifaAntesEvento = tarifaMusico * Math.max(0, valorConfigurado);
    }

    if (tipoTarifa === "fija") {
      tarifaAntesEvento = Math.max(0, valorConfigurado);
    }

    const monto = tarifaAntesEvento * multiplicadorMusicos;

    return {
      rol: String(musico?.rol || `Músico ${index + 1}`).trim(),
      nombre: String(musico?.nombre || "").trim(),
      tipo_tarifa: tipoTarifa,
      valor: tipoTarifa === "estandar" ? 1 : valorConfigurado,
      tarifa_base_zona: tarifaMusico,
      tarifa_antes_tipo_evento: tarifaAntesEvento,
      multiplicador_tipo_evento: multiplicadorMusicos,
      monto,
    };
  });

  return {
    detalle,
    nomina: detalle.reduce(
      (total, musico) => total + Number(musico.monto || 0),
      0,
    ),
  };
}

export function calcularCotizacion({
  provincia,
  cantidadMusicos,
  incluyeSonido,
  descuento,
  tipoEventoConfig = null,
  formato = null,
  aplicarComision = true,
  comisionPorcentaje = COMISION_PORCENTAJE_DEFAULT,
}) {
  const modoTarifaMusicos = normalizarModoTarifa(formato?.modo_tarifa_musicos);

  const musicosConfig = Array.isArray(formato?.musicos_config)
    ? formato.musicos_config
    : [];

  const musicos =
    modoTarifaMusicos === "individual"
      ? musicosConfig.length
      : Math.max(0, Number(cantidadMusicos || 0));

  const descuentoPorcentaje = Number(descuento || 0);

  const multiplicadorHonorarios = Number(
    tipoEventoConfig?.multiplicador_honorarios || 1,
  );

  const multiplicadorMusicos = Number(
    tipoEventoConfig?.multiplicador_musicos || 1,
  );

  const multiplicadorSonido = Number(
    tipoEventoConfig?.multiplicador_sonido || 1,
  );

  const multiplicadorRoadManager = Number(
    tipoEventoConfig?.multiplicador_road_manager || 1,
  );

  const ensayoExtra = Number(tipoEventoConfig?.ensayo_extra || 0);

  const produccionExtra = Number(tipoEventoConfig?.produccion_extra || 0);

  const honorariosBase = Number(provincia.honorarios || 0);
  const tarifaMusico = Number(provincia.tarifa_musico || 0);
  const dietaMusico = Number(provincia.dieta_musico || 0);
  const transporte = Number(provincia.transporte || 0);
  const sonidoBase = Number(provincia.sonido || 0);

  const honorarios = honorariosBase * multiplicadorHonorarios;

  const calculoIndividual =
    modoTarifaMusicos === "individual"
      ? calcularNominaIndividual({
          musicosConfig,
          tarifaMusico,
          multiplicadorMusicos,
        })
      : null;

  const nomina = calculoIndividual
    ? calculoIndividual.nomina
    : tarifaMusico * musicos * multiplicadorMusicos;

  const detalleMusicos = calculoIndividual ? calculoIndividual.detalle : [];

  const dieta = dietaMusico * musicos;

  const aplicaMultiplicadorSonido =
    incluyeSonido && musicos >= MINIMO_MUSICOS_SONIDO_GRANDE;

  const sonido = incluyeSonido
    ? sonidoBase * (aplicaMultiplicadorSonido ? multiplicadorSonido : 1)
    : 0;

  const roadManagerBase =
    musicos < MINIMO_CUARTETO ? ROAD_MANAGER_MENOS_4 : tarifaMusico;

  const roadManagerCalculado = roadManagerBase * multiplicadorRoadManager;

  const roadManager = Math.min(roadManagerCalculado, tarifaMusico);

  const subtotal =
    honorarios +
    nomina +
    dieta +
    transporte +
    sonido +
    roadManager +
    ensayoExtra +
    produccionExtra;

  const montoDescuento = subtotal * (descuentoPorcentaje / 100);

  const subtotalConDescuento = subtotal - montoDescuento;

  const porcentajeComision = Number(comisionPorcentaje || 0);

  const comision = aplicarComision
    ? subtotalConDescuento * porcentajeComision
    : 0;

  const totalSinRedondear = subtotalConDescuento + comision;

  const total = redondearMonto(totalSinRedondear);

  return {
    honorarios_base: honorariosBase,
    honorarios,
    multiplicador_honorarios: multiplicadorHonorarios,
    multiplicador_musicos: multiplicadorMusicos,
    multiplicador_sonido: multiplicadorSonido,
    multiplicador_road_manager: multiplicadorRoadManager,

    ensayo_extra: ensayoExtra,
    produccion_extra: produccionExtra,

    cantidad_musicos: musicos,
    modo_tarifa_musicos_snapshot: modoTarifaMusicos,
    detalle_musicos_snapshot: detalleMusicos,

    tarifa_musico: tarifaMusico,
    dieta_musico: dietaMusico,
    transporte,
    sonido,
    sonido_base: sonidoBase,
    nomina,
    dieta,
    road_manager: roadManager,

    descuento: descuentoPorcentaje,
    monto_descuento: redondearMonto(montoDescuento),
    subtotal: redondearMonto(subtotal),
    subtotal_con_descuento: redondearMonto(subtotalConDescuento),
    comision_porcentaje: porcentajeComision * 100,
    comision: redondearMonto(comision),
    total_sin_redondear: totalSinRedondear,
    total,
  };
}
