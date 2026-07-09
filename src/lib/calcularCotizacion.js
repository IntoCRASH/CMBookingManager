const COMISION_PORCENTAJE_DEFAULT = 0.10;
const ROAD_MANAGER_MENOS_4 = 3500;
const MINIMO_CUARTETO = 4;
const REDONDEO_A = 100;
const MINIMO_MUSICOS_SONIDO_GRANDE = 8;

function redondearMonto(valor) {
  return Math.ceil(Number(valor || 0) / REDONDEO_A) * REDONDEO_A;
}

export function calcularCotizacion({
  provincia,
  cantidadMusicos,
  incluyeSonido,
  descuento,
  tipoEventoConfig = null,
  aplicarComision = true,
  comisionPorcentaje = COMISION_PORCENTAJE_DEFAULT,
}) {
  const musicos = Number(cantidadMusicos || 0);
  const descuentoPorcentaje = Number(descuento || 0);

  const multiplicadorHonorarios = Number(
    tipoEventoConfig?.multiplicador_honorarios || 1
  );

  const multiplicadorMusicos = Number(
    tipoEventoConfig?.multiplicador_musicos || 1
  );

  const multiplicadorSonido = Number(
    tipoEventoConfig?.multiplicador_sonido || 1
  );

  const ensayoExtra = Number(tipoEventoConfig?.ensayo_extra || 0);
  const produccionExtra = Number(tipoEventoConfig?.produccion_extra || 0);

  const honorariosBase = Number(provincia.honorarios || 0);
  const tarifaMusico = Number(provincia.tarifa_musico || 0);
  const dietaMusico = Number(provincia.dieta_musico || 0);
  const transporte = Number(provincia.transporte || 0);
  const sonidoBase = Number(provincia.sonido || 0);

  const honorarios = honorariosBase * multiplicadorHonorarios;

  const nomina =
    tarifaMusico *
    musicos *
    multiplicadorMusicos;

  const dieta = dietaMusico * musicos;

  const aplicaMultiplicadorSonido =
    incluyeSonido &&
    musicos >= MINIMO_MUSICOS_SONIDO_GRANDE;

  const sonido = incluyeSonido
    ? sonidoBase * (aplicaMultiplicadorSonido ? multiplicadorSonido : 1)
    : 0;

  const roadManager =
    musicos < MINIMO_CUARTETO ? ROAD_MANAGER_MENOS_4 : tarifaMusico;

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

    ensayo_extra: ensayoExtra,
    produccion_extra: produccionExtra,

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
    comision: redondearMonto(comision),
    total_sin_redondear: totalSinRedondear,
    total,
  };
}