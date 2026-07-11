const NBSP = '\u00a0';

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRESENTACIÓN ARTÍSTICA

Entre, de una parte, {{nombre_legal_artista}}, portador(a) de la identificación {{identificacion_artista}}, con domicilio en {{direccion_artista}}, quien actúa en nombre y representación de {{nombre_artista}}, y quien en lo adelante se denominará EL ARTISTA; y, de la otra parte, {{nombre_contratante}}, portador(a) de la identificación o RNC {{identificacion_contratante}}, con domicilio en {{direccion_contratante}}, quien actúa {{calidad_contratante}}. Cuando corresponda, la empresa o entidad contratante es {{empresa_contratante}}. En lo adelante se denominará EL CONTRATANTE.

Ambas partes, libre y voluntariamente, acuerdan las cláusulas siguientes:

PRIMERA: OBJETO DEL CONTRATO.
EL ARTISTA se obliga a realizar una presentación artística para {{nombre_evento}}, de tipo {{tipo_evento}}, el día {{fecha_evento}}, en {{venue}}, ubicado en {{direccion_evento}}, {{zona_evento}}. La presentación se realizará en el formato {{formato}}, integrado por {{cantidad_musicos}} músico(s) y un equipo total estimado de {{cantidad_personal}} persona(s).

SEGUNDA: HORARIO, MONTAJE Y DURACIÓN.
El montaje está previsto para las {{hora_montaje}}, la prueba de sonido para las {{hora_prueba_sonido}}, el inicio de la presentación para las {{hora_inicio}} y su finalización para las {{hora_fin}}. La actuación comprenderá {{cantidad_sets}} set(s) de aproximadamente {{duracion_set}} minutos cada uno, con un receso aproximado de {{duracion_receso}} minutos, salvo acuerdo escrito distinto. EL CONTRATANTE facilitará el acceso oportuno al lugar y procurará que la presentación pueda comenzar con puntualidad.

TERCERA: HONORARIOS Y FORMA DE PAGO.
EL CONTRATANTE pagará la suma total de {{monto_total}} ({{monto_total_letras}}), neta según lo pactado en la cotización {{numero_cotizacion}}. Para reservar la fecha deberá pagar un anticipo de {{porcentaje_adelanto}}%, equivalente a {{monto_anticipo}}, a más tardar el {{fecha_limite_anticipo}}. El balance de {{monto_saldo}} deberá completarse a más tardar el {{fecha_limite_saldo}}. Los pagos se realizarán mediante {{instrucciones_pago}}.

CUARTA: RESERVA E INCUMPLIMIENTO DE PAGO.
La fecha solo se considerará reservada cuando se haya recibido el anticipo acordado. El incumplimiento de cualquiera de los pagos dentro de los plazos establecidos facultará a EL ARTISTA a considerar cancelada la contratación, liberar la fecha y retener las sumas recibidas para compensar los compromisos, gastos y oportunidades comerciales asumidos, sin perjuicio de cualquier acuerdo escrito más favorable para las partes.

QUINTA: PRODUCCIÓN, SONIDO Y REQUERIMIENTOS TÉCNICOS.
Sonido: {{condicion_sonido}}. Los servicios incluidos son: {{servicios_incluidos}}. No están incluidos: {{servicios_excluidos}}. Cuando el sonido, tarima, luces, energía eléctrica, backline o personal técnico sean responsabilidad de EL CONTRATANTE, deberán cumplir el rider y las especificaciones suministradas por EL ARTISTA. El montaje técnico deberá estar terminado antes de la llegada del equipo artístico y mantenerse operativo durante toda la actividad.

SEXTA: LOGÍSTICA, HOSPITALIDAD Y SEGURIDAD.
EL CONTRATANTE proporcionará condiciones razonables de seguridad, acceso, estacionamiento, carga y descarga, así como un área privada y segura para el descanso y preparación del equipo. Hospitalidad acordada: {{hospitalidad}}. Transporte, alojamiento y otras condiciones logísticas: {{transporte_hospedaje}}. EL CONTRATANTE garantizará agua potable y las facilidades sanitarias necesarias para el personal de EL ARTISTA.

SÉPTIMA: PUBLICIDAD, NOMBRE E IMAGEN.
Todo arte, anuncio, promoción, fotografía, video o material publicitario que utilice el nombre o imagen de EL ARTISTA deberá respetar la información suministrada y podrá ser sometido a aprobación previa. EL CONTRATANTE será responsable de sus campañas, boletería, permisos, puntos de venta y demás actividades promocionales, salvo pacto escrito en contrario.

OCTAVA: GRABACIÓN, TRANSMISIÓN Y EXPLOTACIÓN.
La grabación profesional, transmisión en vivo, retransmisión, comercialización o explotación audiovisual de la presentación requerirá autorización previa y escrita de EL ARTISTA. Las grabaciones incidentales realizadas por asistentes para uso personal no otorgan derechos de explotación comercial.

NOVENA: CONDUCTA PROFESIONAL Y COOPERACIÓN.
EL ARTISTA y su equipo se comprometen a actuar con puntualidad, integridad y profesionalismo. EL CONTRATANTE mantendrá una coordinación efectiva y designará como contacto operativo a {{contacto_evento}}, teléfono {{telefono_contacto}}. Cualquier situación que afecte el montaje, la seguridad o el cumplimiento del horario deberá comunicarse inmediatamente.

DÉCIMA: TIEMPO ADICIONAL.
Toda extensión de la presentación o permanencia artística fuera del horario contratado estará sujeta a disponibilidad y autorización de EL ARTISTA. La tarifa de referencia para tiempo adicional será de {{tarifa_hora_extra}} por hora o fracción acordada, pagadera antes de iniciar dicho tiempo adicional.

DÉCIMA PRIMERA: CANCELACIÓN POR EL CONTRATANTE.
Si EL CONTRATANTE cancela por causas no imputables a EL ARTISTA, el anticipo no será reembolsable. Cuando la cancelación ocurra dentro de los {{dias_cancelacion}} días previos al evento, EL CONTRATANTE deberá pagar además cualquier balance, gasto no recuperable o porcentaje de cancelación expresamente indicado en las condiciones especiales. La aceptación de una reprogramación no será automática y dependerá de la disponibilidad de EL ARTISTA.

DÉCIMA SEGUNDA: FUERZA MAYOR Y REPROGRAMACIÓN.
Ninguna parte será responsable por el incumplimiento causado por hechos imprevisibles o inevitables fuera de su control razonable, tales como fenómenos naturales, restricciones oficiales, epidemias, disturbios, huelgas, duelo nacional, enfermedad debidamente justificada, destrucción o cierre del lugar. Las partes procurarán reprogramar el evento de común acuerdo. Las sumas ya pagadas podrán aplicarse a la nueva fecha, descontando gastos no recuperables debidamente sustentados.

DÉCIMA TERCERA: INCUMPLIMIENTO DEL ARTISTA.
Si la presentación no pudiera realizarse por una causa exclusivamente imputable a EL ARTISTA y no existiera una sustitución o reprogramación aceptada por EL CONTRATANTE, EL ARTISTA devolverá las sumas recibidas por el servicio no prestado, sin que ello implique responsabilidad por daños indirectos, lucro cesante o compromisos asumidos por EL CONTRATANTE con terceros, salvo disposición legal imperativa.

DÉCIMA CUARTA: NATURALEZA DE LA RELACIÓN Y CESIÓN.
EL ARTISTA actúa como prestador independiente. Este contrato no crea relación laboral, sociedad, mandato general ni exclusividad distinta a la necesaria para cumplir el evento. Ninguna parte podrá ceder sus derechos u obligaciones esenciales sin consentimiento escrito de la otra.

DÉCIMA QUINTA: MODIFICACIONES, INTEGRIDAD Y COMUNICACIONES.
La cotización, el rider técnico y los anexos identificados forman parte de este contrato. Toda modificación deberá constar por escrito y ser aceptada por ambas partes, incluso mediante mensajes electrónicos verificables. La nulidad de una disposición no afectará las demás. Este documento sustituye cualquier conversación previa sobre el mismo objeto que resulte incompatible con su contenido.

DÉCIMA SEXTA: LEY APLICABLE Y JURISDICCIÓN.
Para lo no previsto, las partes se someten a las leyes de la República Dominicana y a los tribunales competentes de {{jurisdiccion}}, sin perjuicio de que puedan intentar primero una solución amistosa.

CONDICIONES ESPECIALES.
{{condiciones_especiales}}

ANEXOS.
{{anexos}}

Hecho y aceptado en {{lugar_firma}}, el {{fecha_contrato}}.`;

export const CONTRACT_VARIABLES = [
  '{{nombre_legal_artista}}',
  '{{identificacion_artista}}',
  '{{direccion_artista}}',
  '{{nombre_artista}}',
  '{{nombre_contratante}}',
  '{{identificacion_contratante}}',
  '{{calidad_contratante}}',
  '{{empresa_contratante}}',
  '{{direccion_contratante}}',
  '{{numero_cotizacion}}',
  '{{nombre_evento}}',
  '{{tipo_evento}}',
  '{{fecha_evento}}',
  '{{venue}}',
  '{{direccion_evento}}',
  '{{zona_evento}}',
  '{{formato}}',
  '{{cantidad_musicos}}',
  '{{cantidad_personal}}',
  '{{hora_montaje}}',
  '{{hora_prueba_sonido}}',
  '{{hora_inicio}}',
  '{{hora_fin}}',
  '{{cantidad_sets}}',
  '{{duracion_set}}',
  '{{duracion_receso}}',
  '{{monto_total}}',
  '{{monto_total_letras}}',
  '{{porcentaje_adelanto}}',
  '{{monto_anticipo}}',
  '{{monto_saldo}}',
  '{{fecha_limite_anticipo}}',
  '{{fecha_limite_saldo}}',
  '{{instrucciones_pago}}',
  '{{condicion_sonido}}',
  '{{servicios_incluidos}}',
  '{{servicios_excluidos}}',
  '{{hospitalidad}}',
  '{{transporte_hospedaje}}',
  '{{contacto_evento}}',
  '{{telefono_contacto}}',
  '{{tarifa_hora_extra}}',
  '{{dias_cancelacion}}',
  '{{jurisdiccion}}',
  '{{condiciones_especiales}}',
  '{{anexos}}',
  '{{lugar_firma}}',
  '{{fecha_contrato}}',
];

export function text(value, fallback = 'No especificado') {
  const clean = String(value ?? '').trim();
  return clean || fallback;
}

export function formatMoney(value) {
  return `RD$ ${Number(value || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateLong(value) {
  if (!value) return 'No especificada';

  const raw = String(value).slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);

  if (Number.isNaN(date.getTime())) return text(value);

  return date.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(value) {
  if (!value) return 'No especificada';

  const [hoursRaw, minutesRaw] = String(value).split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw || 0);

  if (!Number.isFinite(hours)) return text(value);

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(
    'es-DO',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

function underHundred(value) {
  const units = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
  ];

  const specials = {
    10: 'diez',
    11: 'once',
    12: 'doce',
    13: 'trece',
    14: 'catorce',
    15: 'quince',
    16: 'dieciséis',
    17: 'diecisiete',
    18: 'dieciocho',
    19: 'diecinueve',
    20: 'veinte',
    21: 'veintiún',
    22: 'veintidós',
    23: 'veintitrés',
    24: 'veinticuatro',
    25: 'veinticinco',
    26: 'veintiséis',
    27: 'veintisiete',
    28: 'veintiocho',
    29: 'veintinueve',
  };

  if (value < 10) return units[value];
  if (specials[value]) return specials[value];

  const tensNames = {
    3: 'treinta',
    4: 'cuarenta',
    5: 'cincuenta',
    6: 'sesenta',
    7: 'setenta',
    8: 'ochenta',
    9: 'noventa',
  };

  const tens = Math.floor(value / 10);
  const unit = value % 10;

  return unit
    ? `${tensNames[tens]} y ${units[unit]}`
    : tensNames[tens];
}

function underThousand(value) {
  if (value < 100) return underHundred(value);
  if (value === 100) return 'cien';

  const hundredsNames = {
    1: 'ciento',
    2: 'doscientos',
    3: 'trescientos',
    4: 'cuatrocientos',
    5: 'quinientos',
    6: 'seiscientos',
    7: 'setecientos',
    8: 'ochocientos',
    9: 'novecientos',
  };

  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  return rest
    ? `${hundredsNames[hundreds]} ${underHundred(rest)}`
    : hundredsNames[hundreds];
}

function integerToWords(value) {
  const integer = Math.max(0, Math.floor(Number(value || 0)));

  if (integer === 0) return 'cero';
  if (integer < 1000) return underThousand(integer);

  if (integer < 1_000_000) {
    const thousands = Math.floor(integer / 1000);
    const rest = integer % 1000;

    const prefix =
      thousands === 1
        ? 'mil'
        : `${underThousand(thousands)} mil`;

    return rest
      ? `${prefix} ${underThousand(rest)}`
      : prefix;
  }

  if (integer < 1_000_000_000) {
    const millions = Math.floor(integer / 1_000_000);
    const rest = integer % 1_000_000;

    const prefix =
      millions === 1
        ? 'un millón'
        : `${integerToWords(millions)} millones`;

    return rest
      ? `${prefix} ${integerToWords(rest)}`
      : prefix;
  }

  return integer.toLocaleString('es-DO');
}

export function moneyToWords(value) {
  const number = Number(value || 0);
  const integer = Math.floor(number);
  const cents = Math.round((number - integer) * 100);

  return `${integerToWords(integer)} pesos dominicanos con ${String(
    cents
  ).padStart(2, '0')}/100`;
}

export function renderContractTemplate(template, variables) {
  let result = String(template || DEFAULT_CONTRACT_TEMPLATE);

  for (const variable of CONTRACT_VARIABLES) {
    const key = variable.slice(2, -2);
    const replacement = text(variables?.[key]);

    result = result.split(variable).join(replacement);
  }

  return result
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replaceAll(NBSP, ' ')
    .trim();
}

export function subtractDays(dateValue, days) {
  if (!dateValue) return '';

  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return '';

  date.setDate(date.getDate() - Number(days || 0));

  return date.toISOString().slice(0, 10);
}
