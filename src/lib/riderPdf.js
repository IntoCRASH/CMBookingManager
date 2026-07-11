import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const TOP_Y = 18;
const BOTTOM_Y = 278;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function safe(value, fallback = 'No especificado') {
  const clean = String(value ?? '').trim();
  return clean || fallback;
}

function formatDate(value) {
  if (!value) return 'No especificada';

  return new Date(`${String(value).slice(0, 10)}T00:00:00`)
    .toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
}

function formatTime(value) {
  if (!value) return 'No especificada';

  const [hour, minute] = String(value).slice(0, 5).split(':');
  const date = new Date();
  date.setHours(Number(hour || 0), Number(minute || 0), 0, 0);

  return date.toLocaleTimeString('es-DO', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function imageToDataUrl(url) {
  if (!url) return '';

  try {
    const response = await fetch(url);

    if (!response.ok) return '';

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('No se pudo cargar una imagen para el rider:', error);
    return '';
  }
}

function splitRequirementLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStageCoordinates(position) {
  const positions = {
    'Fondo izquierda': [0, 0],
    'Fondo centro': [1, 0],
    'Fondo derecha': [2, 0],
    'Centro izquierda': [0, 1],
    Centro: [1, 1],
    'Centro derecha': [2, 1],
    'Frente izquierda': [0, 2],
    'Frente centro': [1, 2],
    'Frente derecha': [2, 2],
  };

  return positions[position] || [1, 1];
}

export async function generateRiderPdfBlob({
  rider,
  appLogoUrl = '/mibooking-icon.png',
}) {
  const snapshot = rider?.datos_snapshot || {};
  const artist = snapshot.artist || {};
  const client = snapshot.client || {};
  const event = snapshot.event || {};
  const format = snapshot.format || {};
  const config = format.rider_config || {};
  const integrantes = Array.isArray(config.integrantes)
    ? config.integrantes
    : [];
  const requirements = Array.isArray(
    config.requerimientos_generales
  )
    ? config.requerimientos_generales
    : [];
  const system = config.sistema || {};
  const stage = config.tarima || {};
  const timings = config.tiempos || {};
  const technicalContact =
    snapshot.event_specific?.contacto_tecnico ||
    config.contacto_tecnico ||
    {};

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const [logoData, artistLogoData] = await Promise.all([
    imageToDataUrl(appLogoUrl),
    imageToDataUrl(artist.logo_url || ''),
  ]);

  let y = TOP_Y;
  let pageNumber = 1;

  function addFooter() {
    doc.setDrawColor(219, 228, 240);
    doc.line(MARGIN_X, 282, PAGE_WIDTH - MARGIN_X, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `MiBooking · Rider ${safe(rider?.numero, '')}`,
      MARGIN_X,
      288
    );
    doc.text(
      `Página ${pageNumber}`,
      PAGE_WIDTH - MARGIN_X,
      288,
      { align: 'right' }
    );
  }

  function addPage() {
    addFooter();
    doc.addPage();
    pageNumber += 1;
    y = TOP_Y;
  }

  function ensureSpace(height) {
    if (y + height > BOTTOM_Y) {
      addPage();
    }
  }

  function sectionTitle(title) {
    ensureSpace(13);
    doc.setFillColor(233, 239, 246);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 9, 2.2, 2.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(title).toUpperCase(), MARGIN_X + 3.2, y + 6.1);
    y += 12;
  }

  function paragraph(value, options = {}) {
    const text = safe(value, '');
    if (!text) return;

    const size = Number(options.size || 9.2);
    const lineHeight = Number(options.lineHeight || 4.7);
    const spacing = Number(options.spacing ?? 3.2);
    const width = Number(options.width || CONTENT_WIDTH);
    const x = Number(options.x || MARGIN_X);
    const lines = doc.splitTextToSize(text, width);
    const height = Math.max(lineHeight, lines.length * lineHeight);

    ensureSpace(height + spacing);
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
    doc.text(text, x, y, {
      align: options.align || 'justify',
      maxWidth: width,
      lineHeightFactor: Math.max(1.12, lineHeight / (size * 0.352778)),
    });
    doc.setCharSpace?.(0);
    y += height + spacing;
  }

  function keyValueRows(rows) {
    const labelWidth = 42;

    rows.forEach(([label, value], index) => {
      const cleanValue = safe(value);
      const valueLines = doc.splitTextToSize(
        cleanValue,
        CONTENT_WIDTH - labelWidth - 8
      );
      const rowHeight = Math.max(8, valueLines.length * 4.2 + 3);

      ensureSpace(rowHeight);

      doc.setFillColor(index % 2 === 0 ? 248 : 243, 246, 250);
      doc.roundedRect(
        MARGIN_X,
        y,
        CONTENT_WIDTH,
        rowHeight - 1,
        1.3,
        1.3,
        'F'
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(label.toUpperCase(), MARGIN_X + 3, y + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(15, 23, 42);
      doc.text(valueLines, MARGIN_X + labelWidth, y + 5.2, {
        lineHeightFactor: 1.15,
      });

      y += rowHeight;
    });

    y += 3;
  }

  function table(headers, rows, widths) {
    const headerHeight = 8;
    const padding = 2.2;

    function drawHeader() {
      doc.setFillColor(30, 64, 110);
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, headerHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let x = MARGIN_X;
      headers.forEach((header, index) => {
        doc.text(header, x + padding, y + 5.3, {
          maxWidth: widths[index] - padding * 2,
        });
        x += widths[index];
      });

      y += headerHeight;
    }

    ensureSpace(headerHeight + 10);
    drawHeader();

    rows.forEach((row, rowIndex) => {
      const cellLines = row.map((cell, index) =>
        doc.splitTextToSize(
          safe(cell, '-'),
          widths[index] - padding * 2
        )
      );
      const maxLines = Math.max(
        1,
        ...cellLines.map((lines) => lines.length)
      );
      const rowHeight = Math.max(8, maxLines * 3.7 + 3.2);

      if (y + rowHeight > BOTTOM_Y) {
        addPage();
        drawHeader();
      }

      doc.setFillColor(
        rowIndex % 2 === 0 ? 248 : 241,
        rowIndex % 2 === 0 ? 250 : 245,
        rowIndex % 2 === 0 ? 252 : 249
      );
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);

      let x = MARGIN_X;
      row.forEach((_, index) => {
        doc.rect(x, y, widths[index], rowHeight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(15, 23, 42);
        doc.text(cellLines[index], x + padding, y + 4.7, {
          lineHeightFactor: 1.12,
        });
        x += widths[index];
      });

      y += rowHeight;
    });

    y += 4;
  }

  function drawStagePlot() {
    ensureSpace(78);

    const plotX = MARGIN_X + 7;
    const plotY = y + 3;
    const plotWidth = CONTENT_WIDTH - 14;
    const plotHeight = 58;
    const cellWidth = plotWidth / 3;
    const cellHeight = plotHeight / 3;

    doc.setDrawColor(100, 116, 139);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(plotX, plotY, plotWidth, plotHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('FONDO DE TARIMA', PAGE_WIDTH / 2, plotY - 2, {
      align: 'center',
    });
    doc.text('FRENTE / PÚBLICO', PAGE_WIDTH / 2, plotY + plotHeight + 5, {
      align: 'center',
    });

    doc.setDrawColor(226, 232, 240);
    for (let column = 1; column < 3; column += 1) {
      doc.line(
        plotX + cellWidth * column,
        plotY,
        plotX + cellWidth * column,
        plotY + plotHeight
      );
    }
    for (let row = 1; row < 3; row += 1) {
      doc.line(
        plotX,
        plotY + cellHeight * row,
        plotX + plotWidth,
        plotY + cellHeight * row
      );
    }

    const grouped = new Map();
    integrantes.forEach((item) => {
      const key = safe(item.posicion, 'Centro');
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });

    grouped.forEach((items, position) => {
      const [column, row] = getStageCoordinates(position);
      const boxX = plotX + column * cellWidth + 3;
      const boxY = plotY + row * cellHeight + 3;
      const boxWidth = cellWidth - 6;
      const boxHeight = cellHeight - 6;
      const label = items
        .map(
          (item) =>
            `${safe(item.funcion, '')}\n${safe(item.monitor, '')}`
        )
        .join('\n');
      const lines = doc.splitTextToSize(label, boxWidth - 4);

      doc.setFillColor(227, 238, 252);
      doc.setDrawColor(147, 197, 253);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 64, 110);
      doc.text(lines, boxX + boxWidth / 2, boxY + 4.5, {
        align: 'center',
        maxWidth: boxWidth - 4,
        lineHeightFactor: 1.08,
      });
    });

    y = plotY + plotHeight + 10;
  }

  // ----------------------------------------------------------
  // PORTADA / RESUMEN
  // ----------------------------------------------------------

  if (logoData) {
    doc.addImage(logoData, 'PNG', MARGIN_X, y - 3, 15, 15);
  }

  if (artistLogoData) {
    doc.addImage(
      artistLogoData,
      'PNG',
      PAGE_WIDTH - MARGIN_X - 32,
      y - 3,
      32,
      15,
      undefined,
      'FAST'
    );
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text('RIDER TÉCNICO Y DE PRODUCCIÓN', MARGIN_X + 19, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'MiBooking · Música · Eventos · Negocio',
    MARGIN_X + 19,
    y + 9
  );

  y += 22;

  keyValueRows([
    ['Artista', artist.artistic_name],
    ['Formato', format.name],
    ['Cotización', snapshot.quote?.number],
    ['Rider', rider?.numero],
    ['Evento', event.name || event.type],
    ['Fecha', formatDate(event.date)],
    ['Lugar', [event.venue, event.address, event.zone].filter(Boolean).join(' · ')],
    ['Montaje', formatTime(event.setup_time)],
    ['Prueba de sonido', formatTime(event.soundcheck_time)],
    ['Presentación', formatTime(event.start_time)],
    ['Sonido', snapshot.event_specific?.sound_provider],
  ]);

  paragraph(
    'Este documento establece los requerimientos mínimos para la presentación contratada. Cualquier sustitución, reducción o modificación deberá ser comunicada y aprobada previamente por el Artista o su representante técnico.',
    { size: 8.8 }
  );

  sectionTitle('1. Formación artística');
  table(
    ['#', 'Función', 'Instrumento / Fuente', 'Coros', 'Posición'],
    integrantes.map((item, index) => [
      index + 1,
      item.funcion,
      item.instrumento,
      item.hace_coros ? 'Sí' : 'No',
      item.posicion,
    ]),
    [10, 42, 55, 18, 49]
  );

  const totalChannels = integrantes.reduce(
    (total, item) => total + Number(item.canales || 0),
    0
  );

  paragraph(
    `Total estimado en tarima: ${integrantes.length} persona(s). Total mínimo de canales de entrada: ${totalChannels}.`,
    { bold: true, align: 'left' }
  );

  sectionTitle('2. Lista de canales');

  let channelNumber = 1;
  const channelRows = [];
  integrantes.forEach((item) => {
    const channels = Math.max(0, Number(item.canales || 0));

    for (let index = 0; index < channels; index += 1) {
      const stereoSuffix =
        channels === 2
          ? index === 0
            ? ' L'
            : ' R'
          : channels > 2
            ? ` ${index + 1}`
            : '';

      channelRows.push([
        channelNumber,
        `${safe(item.instrumento, item.funcion)}${stereoSuffix}`,
        item.conexion,
        splitRequirementLines(item.requerimientos).join(', ') || '-',
      ]);
      channelNumber += 1;
    }
  });

  table(
    ['Canal', 'Fuente', 'Captura / conexión', 'Accesorios y notas'],
    channelRows.length > 0
      ? channelRows
      : [['-', 'Sin canales configurados', '-', '-']],
    [18, 50, 42, 64]
  );

  sectionTitle('3. Consola y sistema principal');
  paragraph(
    `Se requiere una consola profesional con un mínimo de ${safe(
      system.entradas_minimas,
      totalChannels || 1
    )} entradas y ${safe(
      system.auxiliares_minimos,
      integrantes.length || 1
    )} mezclas auxiliares independientes, preferiblemente pre-fader. Debe disponer de ecualización, dinámica y procesamiento de efectos adecuados para la presentación.`
  );
  paragraph(system.pa);

  sectionTitle('4. Monitoreo');
  table(
    ['Mezcla', 'Destino', 'Prioridad'],
    integrantes.map((item) => [
      item.monitor || 'Por confirmar',
      item.funcion,
      item.prioridad_monitor || 'Mezcla general de banda',
    ]),
    [30, 52, 92]
  );

  sectionTitle('5. Distribución en tarima');
  drawStagePlot();

  sectionTitle('6. Tarima y espacio de trabajo');
  paragraph(
    `Para este Formato se recomienda una tarima mínima de ${safe(
      stage.ancho_metros,
      6
    )} metros de ancho por ${safe(
      stage.fondo_metros,
      4
    )} metros de profundidad. La superficie deberá estar firme, nivelada, protegida de la lluvia cuando el evento sea exterior y libre de obstáculos o cableado peligroso.`
  );

  sectionTitle('7. Backline y requerimientos');
  table(
    ['Elemento', 'Cantidad', 'Responsable', 'Notas'],
    requirements.length > 0
      ? requirements.map((item) => [
          item.elemento,
          item.cantidad,
          item.proveedor,
          item.notas || '-',
        ])
      : [['Por confirmar', '1', 'Por confirmar', '-']],
    [48, 22, 42, 62]
  );

  sectionTitle('8. Electricidad y seguridad');
  paragraph(system.electricidad);

  sectionTitle('9. Montaje y prueba de sonido');
  paragraph(
    `El sistema deberá estar instalado, encendido y probado antes de la llegada del Artista. Se requiere acceso al lugar con al menos ${safe(
      timings.acceso_minutos,
      90
    )} minutos de anticipación, aproximadamente ${safe(
      timings.line_check_minutos,
      20
    )} minutos para line check y ${safe(
      timings.prueba_sonido_minutos,
      60
    )} minutos para prueba de sonido. El técnico responsable deberá estar presente durante todo este proceso.`
  );

  sectionTitle('10. Hospitalidad y logística');
  paragraph(system.hospitalidad);

  sectionTitle('11. Observaciones particulares del evento');
  keyValueRows([
    ['Proveedor de sonido', snapshot.event_specific?.sound_provider],
    ['Contacto técnico', technicalContact.nombre],
    ['Teléfono', technicalContact.telefono],
    ['Correo', technicalContact.email],
    ['Restricciones', snapshot.event_specific?.restrictions],
    ['Notas adicionales', snapshot.event_specific?.additional_notes],
  ]);
  paragraph(system.notas_generales);

  sectionTitle('12. Confirmación técnica');
  paragraph(
    'El Contratante o proveedor de sonido deberá revisar este rider y confirmar por escrito que dispone de los equipos, personal y condiciones solicitadas. Cualquier limitación deberá informarse con suficiente antelación para acordar una alternativa viable.'
  );

  ensureSpace(42);
  y += 5;
  doc.setDrawColor(100, 116, 139);
  doc.line(MARGIN_X, y + 16, MARGIN_X + 72, y + 16);
  doc.line(PAGE_WIDTH - MARGIN_X - 72, y + 16, PAGE_WIDTH - MARGIN_X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Responsable técnico del evento', MARGIN_X, y + 22);
  doc.text(
    'Artista / Representante técnico',
    PAGE_WIDTH - MARGIN_X,
    y + 22,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    safe(client.name, 'Contratante'),
    MARGIN_X,
    y + 28
  );
  doc.text(
    safe(artist.artistic_name, 'Artista'),
    PAGE_WIDTH - MARGIN_X,
    y + 28,
    { align: 'right' }
  );

  addFooter();

  return doc.output('blob');
}
