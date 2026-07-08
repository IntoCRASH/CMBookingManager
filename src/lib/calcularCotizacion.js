const COMISION_PORCENTAJE_DEFAULT = 0.10;
const ROAD_MANAGER_MENOS_4 = 3500;
const MINIMO_CUARTETO = 4;
const REDONDEO_A = 100;

function redondearMonto(valor) {
  return Math.ceil(Number(valor || 0) / REDONDEO_A) * REDONDEO_A;
}

export function calcularCotizacion({
  provincia,
  cantidadMusicos,
  incluyeSonido,
  descuento,
aplicarComision = true,
comisionPorcentaje = COMISION_PORCENTAJE_DEFAULT,
}) {
  const musicos = Number(cantidadMusicos || 0);
  const descuentoPorcentaje = Number(descuento || 0);

  const honorarios = Number(provincia.honorarios || 0);
  const tarifaMusico = Number(provincia.tarifa_musico || 0);
  const dietaMusico = Number(provincia.dieta_musico || 0);
  const transporte = Number(provincia.transporte || 0);
  const sonido = incluyeSonido ? Number(provincia.sonido || 0) : 0;

  const nomina = tarifaMusico * musicos;
  const dieta = dietaMusico * musicos;

  const roadManager =
    musicos < MINIMO_CUARTETO ? ROAD_MANAGER_MENOS_4 : tarifaMusico;

  const subtotal =
    honorarios +
    nomina +
    dieta +
    transporte +
    sonido +
    roadManager;

  const montoDescuento = subtotal * (descuentoPorcentaje / 100);
  const subtotalConDescuento = subtotal - montoDescuento;

  const porcentajeComision = Number(comisionPorcentaje || 0);

const comision = aplicarComision
  ? subtotalConDescuento * porcentajeComision
  : 0;

  const totalSinRedondear = subtotalConDescuento + comision;
  const total = redondearMonto(totalSinRedondear);

  return {
    honorarios,
    tarifa_musico: tarifaMusico,
    dieta_musico: dietaMusico,
    transporte,
    sonido,
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