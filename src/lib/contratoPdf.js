import { jsPDF } from 'jspdf';
import {
  formatDateLong,
  formatMoney,
  text,
} from './contratoTemplate';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const TOP_Y = 18;
const BOTTOM_Y = 278;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function normalizePdfText(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .trim();
}

async function urlToDataUrl(url) {
  if (!url) return '';

  try {
    const response = await fetch(url);

    if (!response.ok) return '';

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('No se pudo cargar una imagen para el contrato:', error);
    return '';
  }
}

function getImageFormat(dataUrl) {
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}

function createWriter(doc, options = {}) {
  let y = Number(options.startY || TOP_Y);

  function addPage() {
    doc.addPage();
    y = TOP_Y;
  }

  function ensureSpace(height) {
    if (y + height > BOTTOM_Y) {
      addPage();
    }
  }

  function line(
    value,
    {
      size = 9.4,
      style = 'normal',
      align = 'left',
      indent = 0,
      spacingAfter = 2.8,
      lineHeight = 4.7,
      uppercase = false,
    } = {}
  ) {
    const clean = normalizePdfText(value);
    if (!clean) return;

    const finalText = uppercase ? clean.toUpperCase() : clean;
    const availableWidth = CONTENT_WIDTH - indent;
    const lines = doc.splitTextToSize(finalText, availableWidth);
    const height = Math.max(lineHeight, lines.length * lineHeight);

    ensureSpace(height + spacingAfter);

    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(33, 39, 54);

    const x =
      align === 'center'
        ? PAGE_WIDTH / 2
        : align === 'right'
          ? PAGE_WIDTH - MARGIN_X
          : MARGIN_X + indent;

    const lineHeightFactor = Math.max(
      1.15,
      lineHeight / (size * 0.352778)
    );

    /*
     * Para los párrafos justificados enviamos el texto completo
     * junto con maxWidth. De esta forma jsPDF distribuye los
     * espacios entre ambos márgenes y conserva la última línea
     * alineada a la izquierda.
     */
    if (align === 'justify') {
      if (typeof doc.setCharSpace === 'function') {
        doc.setCharSpace(0);
      }

      doc.text(finalText, x, y, {
        align: 'justify',
        maxWidth: availableWidth,
        lineHeightFactor,
      });

      /*
       * Evita que el espaciado aplicado al texto justificado
       * afecte títulos u otros textos dibujados después.
       */
      if (typeof doc.setCharSpace === 'function') {
        doc.setCharSpace(0);
      }
    } else {
      doc.text(lines, x, y, {
        align,
        lineHeightFactor,
      });
    }

    y += height + spacingAfter;
  }

  function paragraph(value) {
    line(value, {
      size: 9.2,
      lineHeight: 4.8,
      spacingAfter: 4.2,
      align: 'justify',
    });
  }

  function heading(value) {
    ensureSpace(11);
    doc.setFillColor(238, 242, 248);
    doc.roundedRect(
      MARGIN_X,
      y - 4.2,
      CONTENT_WIDTH,
      8.2,
      1.8,
      1.8,
      'F'
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.4);
    doc.setTextColor(15, 23, 42);
    doc.text(
      normalizePdfText(value).toUpperCase(),
      MARGIN_X + 3,
      y + 0.7
    );

    y += 8.8;
  }

  function rule(spacing = 4) {
    ensureSpace(spacing + 2);
    doc.setDrawColor(205, 213, 224);
    doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y += spacing;
  }

  function infoGrid(rows) {
    const filtered = rows.filter(
      ([label, value]) => normalizePdfText(value)
    );

    if (!filtered.length) return;

    const labelWidth = 37;
    const valueWidth = CONTENT_WIDTH - labelWidth - 4;

    filtered.forEach(([label, value]) => {
      const valueLines = doc.splitTextToSize(
        normalizePdfText(value),
        valueWidth
      );
      const rowHeight = Math.max(6.5, valueLines.length * 4.5 + 2);

      ensureSpace(rowHeight + 1);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(
        MARGIN_X,
        y - 4,
        CONTENT_WIDTH,
        rowHeight,
        1.2,
        1.2,
        'F'
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      doc.setTextColor(71, 85, 105);
      doc.text(
        normalizePdfText(label).toUpperCase(),
        MARGIN_X + 2.5,
        y
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(30, 41, 59);
      doc.text(
        valueLines,
        MARGIN_X + labelWidth,
        y,
        { lineHeightFactor: 1.15 }
      );

      y += rowHeight + 1.3;
    });

    y += 2;
  }

  function signatureBlock({
    artistName,
    legalName,
    clientName,
    representative,
    signatureDataUrl,
  }) {
    const blockHeight = 48;

    if (y + blockHeight > BOTTOM_Y) {
      addPage();
    }

    const leftX = MARGIN_X;
    const rightX = PAGE_WIDTH / 2 + 5;
    const columnWidth = CONTENT_WIDTH / 2 - 7;

    if (signatureDataUrl) {
      try {
        doc.addImage(
          signatureDataUrl,
          getImageFormat(signatureDataUrl),
          leftX + 17,
          y,
          45,
          18,
          undefined,
          'FAST'
        );
      } catch (error) {
        console.error('No se pudo insertar la firma:', error);
      }
    }

    const lineY = y + 23;

    doc.setDrawColor(90, 101, 119);
    doc.line(leftX, lineY, leftX + columnWidth, lineY);
    doc.line(rightX, lineY, rightX + columnWidth, lineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    doc.text(
      normalizePdfText(legalName || artistName),
      leftX + columnWidth / 2,
      lineY + 5,
      { align: 'center', maxWidth: columnWidth }
    );

    doc.text(
      normalizePdfText(representative || clientName),
      rightX + columnWidth / 2,
      lineY + 5,
      { align: 'center', maxWidth: columnWidth }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);

    doc.text(
      `EL ARTISTA - ${normalizePdfText(artistName)}`,
      leftX + columnWidth / 2,
      lineY + 10,
      { align: 'center', maxWidth: columnWidth }
    );

    doc.text(
      'EL CONTRATANTE',
      rightX + columnWidth / 2,
      lineY + 10,
      { align: 'center', maxWidth: columnWidth }
    );

    doc.text(
      'Fecha: ____________________',
      leftX + columnWidth / 2,
      lineY + 16,
      { align: 'center' }
    );

    doc.text(
      'Fecha: ____________________',
      rightX + columnWidth / 2,
      lineY + 16,
      { align: 'center' }
    );

    y += blockHeight;
  }

  return {
    getY: () => y,
    setY: (value) => {
      y = value;
    },
    addPage,
    ensureSpace,
    line,
    paragraph,
    heading,
    rule,
    infoGrid,
    signatureBlock,
  };
}

function parseContractBody(writer, clauses) {
  const paragraphs = normalizePdfText(clauses)
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph) => {
    const firstLine = paragraph.split('\n')[0].trim();
    const isHeading =
      /^[A-ZÁÉÍÓÚÑÜ0-9 .:()-]{4,}$/.test(firstLine) &&
      firstLine.length < 110;

    if (isHeading && paragraph === firstLine) {
      writer.heading(firstLine);
      return;
    }

    const clauseMatch = paragraph.match(
      /^((?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA(?:\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA))?):[^.\n]*\.)\s*(.*)$/is
    );

    if (clauseMatch) {
      writer.heading(clauseMatch[1]);

      if (clauseMatch[2]) {
        writer.paragraph(clauseMatch[2]);
      }

      return;
    }

    writer.paragraph(paragraph.replace(/\n/g, ' '));
  });
}

function addPageNumbers(doc, contractNumber) {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_X, 284, PAGE_WIDTH - MARGIN_X, 284);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);

    doc.text(
      `MiBooking - Contrato ${normalizePdfText(contractNumber)}`,
      MARGIN_X,
      289
    );

    doc.text(
      `Página ${page} de ${pageCount}`,
      PAGE_WIDTH - MARGIN_X,
      289,
      { align: 'right' }
    );
  }
}

export async function generateContractPdf({
  contract,
  appLogoUrl = '/mibooking-icon.png',
}) {
  const snapshot = contract?.datos_snapshot || {};
  const artist = snapshot.artist || {};
  const client = snapshot.client || {};
  const event = snapshot.event || {};
  const financial = snapshot.financial || {};
  const quote = snapshot.quote || {};

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });

  doc.setProperties({
    title: `Contrato ${contract?.numero || ''}`,
    subject: `Presentación artística de ${artist.artistic_name || 'Artista'}`,
    author: 'MiBooking',
    creator: 'MiBooking',
    keywords: 'contrato, evento, artista, MiBooking',
  });

  const [appLogoDataUrl, signatureDataUrl] = await Promise.all([
    urlToDataUrl(appLogoUrl),
    urlToDataUrl(artist.signature_url),
  ]);

  if (appLogoDataUrl) {
    try {
      doc.addImage(
        appLogoDataUrl,
        getImageFormat(appLogoDataUrl),
        MARGIN_X,
        14,
        16,
        16,
        undefined,
        'FAST'
      );
    } catch (error) {
      console.error('No se pudo insertar el logo de MiBooking:', error);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('MiBooking', appLogoDataUrl ? MARGIN_X + 20 : MARGIN_X, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Música · Eventos · Negocio',
    appLogoDataUrl ? MARGIN_X + 20 : MARGIN_X,
    26
  );

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(140, 14, 52, 17, 2.2, 2.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('CONTRATO', 166, 20, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    normalizePdfText(contract?.numero || 'SIN NÚMERO'),
    166,
    26,
    { align: 'center', maxWidth: 47 }
  );

  const writer = createWriter(doc, { startY: 41 });

  writer.line('CONTRATO DE PRESENTACIÓN ARTÍSTICA', {
    size: 14,
    style: 'bold',
    align: 'center',
    spacingAfter: 3,
  });

  writer.line(
    `${text(artist.artistic_name, 'Artista')} · Cotización ${
      quote.number || quote.id || 'N/A'
    }`,
    {
      size: 9,
      style: 'bold',
      align: 'center',
      spacingAfter: 6,
    }
  );

  writer.heading('Resumen del evento');
  writer.infoGrid([
    ['Contratante', client.name],
    ['Empresa', client.company],
    ['Evento', event.name || event.type],
    ['Tipo', event.type],
    ['Fecha', formatDateLong(event.date)],
    ['Horario', `${text(event.start_time)} - ${text(event.end_time)}`],
    ['Lugar', event.venue],
    ['Dirección', event.address],
    ['Zona', event.zone],
    ['Formato', event.format],
    ['Músicos', String(event.musicians || '')],
    ['Sonido', event.sound_condition],
    ['Total contratado', formatMoney(financial.total)],
  ]);

  writer.rule(5);
  parseContractBody(writer, contract?.clausulas_snapshot || '');

  writer.ensureSpace(15);
  writer.heading('Aceptación y firmas');
  writer.paragraph(
    'Las partes declaran haber leído, comprendido y aceptado el contenido de este contrato y sus anexos.'
  );

  writer.signatureBlock({
    artistName: artist.artistic_name,
    legalName: artist.legal_name,
    clientName: client.name,
    representative: client.representative,
    signatureDataUrl,
  });

  addPageNumbers(doc, contract?.numero || '');

  return doc;
}

export async function generateContractPdfBlob(options) {
  const doc = await generateContractPdf(options);
  return doc.output('blob');
}

export async function downloadContractPdf({
  contract,
  filename,
  appLogoUrl,
}) {
  const doc = await generateContractPdf({
    contract,
    appLogoUrl,
  });

  doc.save(
    filename ||
      `Contrato-${contract?.numero || contract?.id || 'MiBooking'}.pdf`
  );
}
