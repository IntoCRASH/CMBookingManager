import { jsPDF } from 'jspdf';
import {
  getStagePlotTypeMeta,
  normalizeStagePlot,
  sortStagePlotItems,
} from './stagePlot';

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
    const stagePlot = normalizeStagePlot(config.stage_plot, config);
    const plotItems = sortStagePlotItems(stagePlot.items || []);
    const plotHeight = 104;

    ensureSpace(plotHeight + 27);

    const plotX = MARGIN_X;
    const plotY = y + 7;
    const plotWidth = CONTENT_WIDTH;
    const innerX = plotX + 4;
    const innerY = plotY + 6;
    const innerWidth = plotWidth - 8;
    const innerHeight = plotHeight - 13;

    function itemPalette(type) {
      const palettes = {
        vocal: [[29, 78, 216], [239, 246, 255]],
        drums: [[124, 58, 237], [245, 243, 255]],
        percussion: [[162, 28, 175], [253, 244, 255]],
        keyboard: [[15, 118, 110], [240, 253, 250]],
        guitar: [[180, 83, 9], [255, 251, 235]],
        bass: [[194, 65, 12], [255, 247, 237]],
        brass: [[202, 138, 4], [254, 252, 232]],
        sax: [[161, 98, 7], [255, 251, 235]],
        strings: [[190, 18, 60], [255, 241, 242]],
        dj: [[67, 56, 202], [238, 242, 255]],
        performer: [[51, 65, 85], [248, 250, 252]],
        microphone: [[71, 85, 105], [248, 250, 252]],
        monitor: [[3, 105, 161], [240, 249, 255]],
        di: [[4, 120, 87], [236, 253, 245]],
        amp: [[55, 65, 81], [249, 250, 251]],
        power: [[190, 18, 60], [255, 241, 242]],
        riser: [[100, 116, 139], [248, 250, 252]],
        custom: [[109, 40, 217], [245, 243, 255]],
      };

      return palettes[type] || palettes.custom;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `FONDO / BACKSTAGE · TARIMA ${safe(stagePlot.width_m, 6)} m × ${safe(stagePlot.depth_m, 4)} m`,
      PAGE_WIDTH / 2,
      plotY + 2,
      { align: 'center' }
    );

    doc.setFillColor(13, 20, 34);
    doc.setDrawColor(71, 85, 105);
    doc.roundedRect(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      2.5,
      2.5,
      'FD'
    );

    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.18);

    for (let column = 1; column < 10; column += 1) {
      doc.line(
        innerX + (innerWidth / 10) * column,
        innerY,
        innerX + (innerWidth / 10) * column,
        innerY + innerHeight
      );
    }

    for (let row = 1; row < 6; row += 1) {
      doc.line(
        innerX,
        innerY + (innerHeight / 6) * row,
        innerX + innerWidth,
        innerY + (innerHeight / 6) * row
      );
    }

    plotItems.forEach((item) => {
      const x = innerX + (Number(item.x || 50) / 100) * innerWidth;
      const itemY = innerY + (Number(item.y || 50) / 100) * innerHeight;
      const width = Math.max(
        6,
        (Number(item.width || 12) / 100) * innerWidth
      );
      const height = Math.max(
        5,
        (Number(item.height || 8) / 100) * innerHeight
      );
      const left = x - width / 2;
      const top = itemY - height / 2;
      const [fill, textColor] = itemPalette(item.type);
      const meta = getStagePlotTypeMeta(item.type);

      doc.setFillColor(...fill);
      doc.setDrawColor(
        ...(item.orphaned ? [245, 158, 11] : [226, 232, 240])
      );
      doc.setLineWidth(item.orphaned ? 0.7 : 0.28);

      if (item.type === 'riser') {
        doc.setLineDashPattern([1.8, 1.2], 0);
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(left, top, width, height, 1.5, 1.5, 'FD');
        doc.setLineDashPattern([], 0);
      } else if (item.type === 'monitor') {
        doc.triangle(
          left + width * 0.18,
          top,
          left + width * 0.82,
          top,
          left + width,
          top + height,
          'F'
        );
        doc.triangle(
          left + width * 0.18,
          top,
          left,
          top + height,
          left + width,
          top + height,
          'F'
        );
      } else if (item.type === 'microphone') {
        doc.circle(x, top + 1.8, 1.7, 'F');
        doc.setDrawColor(...fill);
        doc.setLineWidth(0.9);
        doc.line(x, top + 3.4, x, top + height - 1.2);
        doc.line(x, top + height - 1.2, x + 2.2, top + height);
      } else {
        doc.roundedRect(left, top, width, height, 1.4, 1.4, 'FD');

        if (item.type === 'amp') {
          doc.setFillColor(15, 23, 42);
          doc.circle(left + width * 0.32, itemY, Math.min(width, height) * 0.15, 'F');
          doc.circle(left + width * 0.68, itemY, Math.min(width, height) * 0.15, 'F');
        }
      }

      if (item.type === 'microphone') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.6);
        doc.setTextColor(226, 232, 240);
        doc.text(
          safe(item.label, 'MIC'),
          x,
          top + height + 2.8,
          { align: 'center', maxWidth: width + 5 }
        );
        return;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(4.2, Math.min(6.1, width / 2.8)));
      doc.setTextColor(...textColor);
      doc.text(meta.code, x, itemY - (item.detail ? 1.1 : 0), {
        align: 'center',
      });

      const label = safe(item.label, meta.label);
      const labelLines = doc.splitTextToSize(label, Math.max(7, width - 2));
      doc.setFontSize(Math.max(3.7, Math.min(5.1, width / 3.7)));
      doc.text(
        labelLines.slice(0, 2),
        x,
        itemY + 2.7,
        {
          align: 'center',
          lineHeightFactor: 1.02,
        }
      );
    });

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(
      PAGE_WIDTH / 2 - 28,
      innerY + innerHeight + 4,
      PAGE_WIDTH / 2 + 28,
      innerY + innerHeight + 4
    );
    doc.line(
      PAGE_WIDTH / 2 + 28,
      innerY + innerHeight + 4,
      PAGE_WIDTH / 2 + 24,
      innerY + innerHeight + 2
    );
    doc.line(
      PAGE_WIDTH / 2 + 28,
      innerY + innerHeight + 4,
      PAGE_WIDTH / 2 + 24,
      innerY + innerHeight + 6
    );
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(30, 64, 110);
    doc.text(
      'FRENTE / PÚBLICO',
      PAGE_WIDTH / 2,
      innerY + innerHeight + 10,
      { align: 'center' }
    );

    y = plotY + plotHeight + 16;

    if (stagePlot.notes) {
      paragraph(stagePlot.notes, {
        size: 7.6,
        lineHeight: 3.8,
        spacing: 2,
        align: 'left',
      });
    }
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

  ensureSpace(145);
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
