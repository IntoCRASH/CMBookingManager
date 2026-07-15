import { jsPDF } from 'jspdf';
import {
  renderBusinessPolicies,
  renderBusinessPolicyTemplate,
} from './profileService';

// Mantiene en el PDF persistente el diseño clásico que ya utilizaba
// VerCotizacion: página carta, composición blanco/negro, encabezado con línea,
// tabla oscura, totales a la derecha, firma y políticas en flujo continuo.
const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN = 8.9; // 0.35 in, igual al @page original
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FLOW_BOTTOM = PAGE_HEIGHT - MARGIN - 8;

function clean(value, fallback = '') {
  const normalized = String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, ' ')
    .trim();

  return normalized || fallback;
}

function money(value) {
  return `RD$ ${Number(value || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function dateLong(value) {
  if (!value) return 'N/A';

  return new Date(`${String(value).slice(0, 10)}T00:00:00`)
    .toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
}

function dateTime(value) {
  if (!value) return '';

  return new Date(value).toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
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
    console.error('No se pudo cargar una imagen para el PDF:', error);
    return '';
  }
}

function imageFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}

async function getImageRatio(dataUrl) {
  if (!dataUrl || typeof Image === 'undefined') return 1;

  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 1);
      const height = Number(image.naturalHeight || image.height || 1);
      resolve(width / Math.max(height, 1));
    };
    image.onerror = () => resolve(1);
    image.src = dataUrl;
  });
}

async function addContainedImage(doc, dataUrl, x, y, maxWidth, maxHeight) {
  if (!dataUrl) return;

  try {
    const ratio = await getImageRatio(dataUrl);
    let width = maxWidth;
    let height = width / Math.max(ratio, 0.01);

    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    const imageX = x + (maxWidth - width) / 2;
    const imageY = y + (maxHeight - height) / 2;

    doc.addImage(
      dataUrl,
      imageFormat(dataUrl),
      imageX,
      imageY,
      width,
      height,
      undefined,
      'FAST'
    );
  } catch (error) {
    console.error('No se pudo insertar una imagen en el PDF:', error);
  }
}

function setBlack(doc) {
  doc.setTextColor(17, 17, 17);
  doc.setDrawColor(17, 17, 17);
}

function drawLabelValue(doc, label, value, x, y, maxWidth) {
  const safeLabel = clean(label);
  const safeValue = clean(value, 'N/A');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 17, 17);
  doc.text(`${safeLabel}:`, x, y);

  const labelWidth = doc.getTextWidth(`${safeLabel}: `);
  const available = Math.max(18, maxWidth - labelWidth);
  const valueLines = doc.splitTextToSize(safeValue, available);

  doc.setFont('helvetica', 'normal');
  doc.text(valueLines, x + labelWidth, y, {
    lineHeightFactor: 1.15,
  });

  return Math.max(4.7, valueLines.length * 4.1);
}

function createFlow(doc) {
  let y = MARGIN;

  function addPage() {
    doc.addPage('letter', 'portrait');
    y = MARGIN;
  }

  function ensureSpace(height) {
    if (y + height > FLOW_BOTTOM) addPage();
  }

  function getY() {
    return y;
  }

  function setY(value) {
    y = value;
  }

  function advance(value) {
    y += value;
  }

  return {
    addPage,
    ensureSpace,
    getY,
    setY,
    advance,
  };
}

function drawInfoColumn(doc, title, rows, x, y, width) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(17, 17, 17);
  doc.text(clean(title).toUpperCase(), x, y);

  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.25);
  doc.line(x, y + 2.2, x + width, y + 2.2);

  let cursor = y + 7;

  rows.forEach(([label, value]) => {
    cursor += drawLabelValue(doc, label, value, x, cursor, width);
  });

  return cursor;
}

function splitParagraphs(value) {
  const normalized = clean(value);
  if (!normalized) return [];

  return normalized
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

function measurePoliciesHeight(
  doc,
  paragraphs,
  width,
  fontSize,
  lineHeight,
  paragraphGap
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  return paragraphs.reduce((height, paragraph, index) => {
    const lines = doc.splitTextToSize(paragraph, width);
    const gap = index < paragraphs.length - 1 ? paragraphGap : 0;
    return height + lines.length * lineHeight + gap;
  }, 0);
}

function drawJustifiedParagraph(
  doc,
  paragraph,
  x,
  y,
  width,
  lineHeight
) {
  const lines = doc.splitTextToSize(paragraph, width);

  lines.forEach((line, index) => {
    const isLastLine = index === lines.length - 1;

    doc.text(line, x, y, {
      align: isLastLine ? 'left' : 'justify',
      maxWidth: width,
    });

    y += lineHeight;
  });

  return y;
}

function drawPoliciesColumn(
  doc,
  {
    policies,
    x,
    y,
    width,
    bottom,
  }
) {
  const paragraphs = splitParagraphs(policies);
  if (!paragraphs.length) return y;

  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.65);
  doc.line(x, y, x + width, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 17, 17);
  doc.text('POLÍTICAS Y CONDICIONES', x, y);
  y += 5.2;

  const availableHeight = Math.max(28, bottom - y);
  const textWidth = width;
  const paragraphGap = 1.8;
  let fontSize = 7.2;
  let lineHeight = 3.15;

  while (fontSize > 5.8) {
    const requiredHeight = measurePoliciesHeight(
      doc,
      paragraphs,
      textWidth,
      fontSize,
      lineHeight,
      paragraphGap
    );

    if (requiredHeight <= availableHeight) break;

    fontSize -= 0.2;
    lineHeight -= 0.08;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(45, 45, 45);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    y = drawJustifiedParagraph(
      doc,
      paragraph,
      x,
      y,
      textWidth,
      lineHeight
    );

    if (paragraphIndex < paragraphs.length - 1) {
      y += paragraphGap;
    }
  });

  return y;
}

function drawFooter(doc, flow, artistName) {
  flow.ensureSpace(13);
  let y = flow.getY();

  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);
  doc.text(`${artistName} Booking Department`, PAGE_WIDTH / 2, y, {
    align: 'center',
  });

  flow.setY(y + 4);
}

export async function generateCotizacionPdf({ cotizacion }) {
  const quote = cotizacion || {};
  const client = quote.clientes || {};
  const zone = quote.provincias || {};
  const business = quote.perfil_negocio_snapshot || {};
  const isInvoice = quote.documento_tipo === 'factura';
  const documentLabel = isInvoice ? 'FACTURA' : 'COTIZACIÓN';
  const number = clean(quote.numero, `#${quote.id || ''}`);
  const artistName = clean(
    quote.artista_nombre_snapshot ||
      quote.artista_snapshot?.nombre ||
      business.nombre_artistico ||
      business.nombre_completo,
    'Artista'
  );
  const legalName = clean(business.nombre_completo, artistName);
  const venue = clean(quote.venue, 'lugar del evento');
  const sound = Number(quote.sonido || 0);
  const subtotalClient =
    Number(quote.subtotal || 0) +
    Number(quote.manager_artistico_monto || 0) +
    Number(quote.comision || 0);
  const musicalPresentation = Math.max(0, subtotalClient - sound);
  const discountPercent = Number(quote.descuento || 0);
  const discountAmount = Number(quote.monto_descuento || 0);
  const taxPercent = Number(quote.impuesto_porcentaje || 0);
  const taxAmount = Number(quote.impuesto_monto || 0);
  const includesTax = Boolean(quote.incluye_impuesto && taxAmount > 0);
  const storedPolicies = String(
    quote.politicas_condiciones || ''
  ).trim();

  const policies = clean(
    storedPolicies
      ? renderBusinessPolicyTemplate(
          storedPolicies,
          business
        )
      : renderBusinessPolicies(
          business.condiciones_pago,
          business
        )
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true,
    putOnlyUsedFonts: true,
  });

  doc.setProperties({
    title: `${documentLabel} ${number}`,
    subject: `${documentLabel} de presentación artística`,
    author: artistName,
    creator: 'MiBooking',
    keywords: 'cotización, factura, artista, evento, MiBooking',
  });

  const [logoData, signatureData] = await Promise.all([
    imageToDataUrl(business.logo_url || ''),
    imageToDataUrl(
      business.firma_url ||
        (artistName.toLowerCase() === 'cruzmonty'
          ? '/firma-cruzmonty.png'
          : '')
    ),
  ]);

  const flow = createFlow(doc);
  const headerY = MARGIN;
  const boxWidth = 45;
  const boxHeight = isInvoice ? 29 : 23;
  const boxX = PAGE_WIDTH - MARGIN - boxWidth;

  if (logoData) {
    await addContainedImage(doc, logoData, MARGIN, headerY, 58, 22);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17.5);
    doc.setTextColor(17, 17, 17);
    doc.text(`${artistName.toUpperCase()} BOOKING`, MARGIN, headerY + 8);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 17, 17);
  doc.text('Departamento de contratación artística', MARGIN, headerY + 18.5);

  setBlack(doc);
  doc.setLineWidth(0.65);
  doc.rect(boxX, headerY, boxWidth, boxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text(documentLabel, boxX + boxWidth / 2, headerY + 7, {
    align: 'center',
  });

  doc.setFontSize(13.5);
  doc.text(number, boxX + boxWidth / 2, headerY + 14.5, {
    align: 'center',
    maxWidth: boxWidth - 5,
  });

  let boxTextY = headerY + 20;
  doc.setFontSize(7.3);

  if (isInvoice && quote.incluye_ncf && quote.ncf) {
    doc.text(`NCF: ${clean(quote.ncf)}`, boxX + boxWidth / 2, boxTextY, {
      align: 'center',
      maxWidth: boxWidth - 4,
    });
    boxTextY += 4;
  }

  if (isInvoice && quote.factura_emitida_at) {
    doc.text(
      `Emitida: ${dateTime(quote.factura_emitida_at)}`,
      boxX + boxWidth / 2,
      boxTextY,
      {
        align: 'center',
        maxWidth: boxWidth - 4,
      }
    );
  }

  const headerBottom = Math.max(headerY + 24, headerY + boxHeight);
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.65);
  doc.line(MARGIN, headerBottom + 3, PAGE_WIDTH - MARGIN, headerBottom + 3);

  let y = headerBottom + 12;
  const columnGap = 12;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const leftEnd = drawInfoColumn(
    doc,
    'Datos del cliente',
    [
      ['Nombre', client.nombre],
      ['Empresa', client.empresa],
      ['Teléfono', client.telefono],
      ['Email', client.email],
    ],
    MARGIN,
    y,
    columnWidth
  );

  const rightEnd = drawInfoColumn(
    doc,
    'Datos del evento',
    [
      ['Fecha', dateLong(quote.fecha_evento)],
      ['Evento', quote.nombre_evento || quote.tipo_evento],
      ['Venue', venue],
      ['Zona', zone.nombre || quote.zona_nombre_snapshot],
      ['Sonido', quote.incluye_sonido ? 'Incluido' : 'No incluido'],
    ],
    MARGIN + columnWidth + columnGap,
    y,
    columnWidth
  );

  y = Math.max(leftEnd, rightEnd) + 5;

  // Tabla de servicios: misma jerarquía visual de la cotización original.
  const amountColumnWidth = 43;
  const descriptionWidth = CONTENT_WIDTH - amountColumnWidth;
  const tableHeaderHeight = 8.5;

  doc.setFillColor(17, 17, 17);
  doc.rect(MARGIN, y, CONTENT_WIDTH, tableHeaderHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);
  doc.setTextColor(255, 255, 255);
  doc.text('Descripción', MARGIN + 3, y + 5.6);
  doc.text('Monto', PAGE_WIDTH - MARGIN - 3, y + 5.6, {
    align: 'right',
  });
  y += tableHeaderHeight;

  const presentationLines = [
    `Presentación musical de ${artistName}`,
    quote.nombre_evento
      ? `Evento: ${clean(quote.nombre_evento)}`
      : '',
    `Lugar: ${venue}`,
    `Zona: ${clean(zone.nombre || quote.zona_nombre_snapshot, 'N/A')}`,
    `Fecha: ${dateLong(quote.fecha_evento)}`,
  ].filter(Boolean);

  const presentationHeight = Math.max(27, presentationLines.length * 4.6 + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.9);
  doc.setTextColor(17, 17, 17);
  doc.text(presentationLines, MARGIN + 3, y + 5, {
    lineHeightFactor: 1.25,
    maxWidth: descriptionWidth - 7,
  });

  doc.setFont('helvetica', 'bold');
  doc.text(money(musicalPresentation), PAGE_WIDTH - MARGIN - 3, y + 5, {
    align: 'right',
  });

  doc.setDrawColor(221, 221, 221);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y + presentationHeight, PAGE_WIDTH - MARGIN, y + presentationHeight);
  y += presentationHeight;

  if (quote.incluye_sonido && sound > 0) {
    const soundHeight = 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.9);
    doc.setTextColor(17, 17, 17);
    doc.text('Equipos de sonido y personal técnico.', MARGIN + 3, y + 7.2);
    doc.setFont('helvetica', 'bold');
    doc.text(money(sound), PAGE_WIDTH - MARGIN - 3, y + 7.2, {
      align: 'right',
    });
    doc.setDrawColor(221, 221, 221);
    doc.line(MARGIN, y + soundHeight, PAGE_WIDTH - MARGIN, y + soundHeight);
    y += soundHeight;
  }

  y += 7;

  // La parte inferior se divide en dos columnas:
  // políticas a la izquierda; totales y firma a la derecha.
  const lowerSectionTop = y;
  const totalsWidth = 74;
  const totalsX = PAGE_WIDTH - MARGIN - totalsWidth;
  const lowerGap = 6;
  const policiesX = MARGIN + 1;
  const policiesWidth = totalsX - policiesX - lowerGap;
  const policiesBottom = FLOW_BOTTOM - 13;

  const policyEndY = drawPoliciesColumn(doc, {
    policies:
      policies ||
      'Las condiciones de pago, reserva, presentación y cancelación serán las acordadas entre el Artista y el cliente.',
    x: policiesX,
    y: lowerSectionTop,
    width: policiesWidth,
    bottom: policiesBottom,
  });

  let rightY = lowerSectionTop;
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.65);
  doc.line(totalsX, rightY, PAGE_WIDTH - MARGIN, rightY);
  rightY += 6;

  function drawTotalRow(label, amount, options = {}) {
    const { final = false } = options;
    doc.setFont('helvetica', final ? 'bold' : 'normal');
    doc.setFontSize(final ? 13.5 : 9.2);
    doc.setTextColor(17, 17, 17);
    doc.text(label, totalsX, rightY);
    doc.text(amount, PAGE_WIDTH - MARGIN, rightY, { align: 'right' });

    const rowBottom = rightY + (final ? 5 : 4.5);
    doc.setDrawColor(final ? 17 : 221, final ? 17 : 221, final ? 17 : 221);
    doc.setLineWidth(final ? 0.8 : 0.25);
    doc.line(totalsX, rowBottom, PAGE_WIDTH - MARGIN, rowBottom);
    rightY += final ? 9.5 : 8;
  }

  drawTotalRow('Subtotal', money(subtotalClient));

  if (discountPercent > 0) {
    drawTotalRow(
      `Descuento ${discountPercent}%`,
      `- ${money(discountAmount)}`
    );
  }

  if (includesTax) {
    drawTotalRow(`Impuesto ${taxPercent}%`, money(taxAmount));
  }

  drawTotalRow('Total', money(quote.total), { final: true });
  rightY += 5;

  // Firma alineada debajo de los totales en la columna derecha.
  const signatureWidth = 69;
  const signatureX = PAGE_WIDTH - MARGIN - signatureWidth;

  if (signatureData) {
    await addContainedImage(
      doc,
      signatureData,
      signatureX + 8,
      rightY,
      53,
      18
    );
    rightY += 18;
  }

  doc.setDrawColor(34, 34, 34);
  doc.setLineWidth(0.3);
  doc.line(signatureX, rightY + 1, PAGE_WIDTH - MARGIN, rightY + 1);
  rightY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 17, 17);
  doc.text(legalName, signatureX + signatureWidth / 2, rightY, {
    align: 'center',
  });
  rightY += 4;

  doc.setFontSize(8);
  doc.text(artistName, signatureX + signatureWidth / 2, rightY, {
    align: 'center',
  });
  rightY += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(85, 85, 85);
  doc.text(
    'Artista / Representante autorizado',
    signatureX + signatureWidth / 2,
    rightY,
    { align: 'center' }
  );
  rightY += 7;

  flow.setY(Math.max(policyEndY, rightY) + 4);
  drawFooter(doc, flow, artistName);
  return doc;
}

export async function generateCotizacionPdfBlob(options) {
  const doc = await generateCotizacionPdf(options);
  return doc.output('blob');
}
