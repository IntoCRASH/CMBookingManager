import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { saveFormatoRiderConfig } from '../lib/formatosService';
import {
  getStagePlotPdfSignedUrl,
  sendStagePlotByEmail,
  uploadStagePlotPdf,
} from '../lib/stagePlotPdfService';
import {
  STAGE_PLOT_ITEM_TYPES,
  createManualStagePlotItem,
  generateStagePlotFromRider,
  getStagePlotTypeMeta,
  normalizeStagePlot,
  sortStagePlotItems,
  syncStagePlotWithRider,
} from '../lib/stagePlot';
import PdfDocumentModal from '../components/PdfDocumentModal';
import PdfEmailModal from '../components/PdfEmailModal';
import './StagePlotEditor.css';

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 620;
const STAGE_TOP = 48;
const STAGE_HEIGHT = 520;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function itemColor(type) {
  const colors = {
    vocal: ['#1d4ed8', '#dbeafe'],
    drums: ['#7c3aed', '#ede9fe'],
    percussion: ['#a21caf', '#fae8ff'],
    keyboard: ['#0f766e', '#ccfbf1'],
    guitar: ['#b45309', '#fef3c7'],
    bass: ['#c2410c', '#ffedd5'],
    brass: ['#ca8a04', '#fef9c3'],
    sax: ['#a16207', '#fef3c7'],
    strings: ['#be123c', '#ffe4e6'],
    dj: ['#4338ca', '#e0e7ff'],
    performer: ['#334155', '#e2e8f0'],
    microphone: ['#475569', '#f8fafc'],
    monitor: ['#0369a1', '#e0f2fe'],
    di: ['#047857', '#d1fae5'],
    amp: ['#374151', '#f3f4f6'],
    power: ['#be123c', '#ffe4e6'],
    riser: ['#64748b', '#f1f5f9'],
    custom: ['#6d28d9', '#ede9fe'],
  };

  return colors[type] || colors.custom;
}

function pxX(percent) {
  return (Number(percent || 0) / 100) * VIEWBOX_WIDTH;
}

function pxY(percent) {
  return STAGE_TOP + (Number(percent || 0) / 100) * STAGE_HEIGHT;
}

function pxWidth(percent) {
  return (Number(percent || 0) / 100) * VIEWBOX_WIDTH;
}

function pxHeight(percent) {
  return (Number(percent || 0) / 100) * STAGE_HEIGHT;
}

function StageItemShape({ item, selected }) {
  const [fill, textColor] = itemColor(item.type);
  const width = pxWidth(item.width);
  const height = pxHeight(item.height);
  const x = -width / 2;
  const y = -height / 2;
  const meta = getStagePlotTypeMeta(item.type);
  const code = meta.code;
  const label = item.label || meta.label;
  const detail = item.detail || item.monitor || '';

  if (item.type === 'monitor') {
    return (
      <>
        <polygon
          points={`${x},${y + height} ${x + width},${y + height} ${x + width * 0.82},${y} ${x + width * 0.18},${y}`}
          fill={fill}
          stroke={selected ? '#ffffff' : 'rgba(255,255,255,.6)'}
          strokeWidth={selected ? 5 : 2}
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          className="stage-plot-svg-code"
          fill={textColor}
        >
          {label || 'MON'}
        </text>
      </>
    );
  }

  if (item.type === 'microphone') {
    return (
      <>
        <circle
          cx="0"
          cy={y + 10}
          r="13"
          fill={fill}
          stroke={selected ? '#ffffff' : 'rgba(255,255,255,.65)'}
          strokeWidth={selected ? 5 : 2}
        />
        <line
          x1="0"
          y1={y + 23}
          x2="0"
          y2={y + height - 8}
          stroke={fill}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1={y + height - 9}
          x2={width * 0.22}
          y2={y + height}
          stroke={fill}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text
          x="0"
          y={y + height + 18}
          textAnchor="middle"
          className="stage-plot-svg-mini"
          fill="#e2e8f0"
        >
          {label || 'MIC'}
        </text>
      </>
    );
  }

  if (item.type === 'riser') {
    return (
      <>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="14"
          fill="rgba(100,116,139,.12)"
          stroke={selected ? '#ffffff' : '#64748b'}
          strokeWidth={selected ? 5 : 3}
          strokeDasharray="14 9"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          className="stage-plot-svg-code"
          fill="#cbd5e1"
        >
          {label || 'RISER'}
        </text>
      </>
    );
  }

  if (item.type === 'amp') {
    return (
      <>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="10"
          fill={fill}
          stroke={selected ? '#ffffff' : 'rgba(255,255,255,.55)'}
          strokeWidth={selected ? 5 : 2}
        />
        <circle cx={x + width * 0.3} cy="0" r={Math.min(width, height) * 0.18} fill="#0f172a" />
        <circle cx={x + width * 0.7} cy="0" r={Math.min(width, height) * 0.18} fill="#0f172a" />
        <text
          x="0"
          y={height / 2 + 17}
          textAnchor="middle"
          className="stage-plot-svg-mini"
          fill="#e2e8f0"
        >
          {label || 'AMP'}
        </text>
      </>
    );
  }

  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={item.type === 'power' || item.type === 'di' ? 9 : 15}
        fill={fill}
        stroke={
          item.orphaned
            ? '#f59e0b'
            : selected
              ? '#ffffff'
              : 'rgba(255,255,255,.58)'
        }
        strokeWidth={selected ? 5 : item.orphaned ? 4 : 2}
        strokeDasharray={item.orphaned ? '10 6' : undefined}
      />

      <text
        x="0"
        y={detail ? -4 : 5}
        textAnchor="middle"
        className="stage-plot-svg-code"
        fill={textColor}
      >
        {code}
      </text>

      <text
        x="0"
        y={detail ? 18 : 25}
        textAnchor="middle"
        className="stage-plot-svg-label"
        fill={textColor}
      >
        {label.length > 24 ? `${label.slice(0, 22)}…` : label}
      </text>

      {detail && (
        <text
          x="0"
          y="35"
          textAnchor="middle"
          className="stage-plot-svg-detail"
          fill={textColor}
        >
          {detail.length > 28 ? `${detail.slice(0, 26)}…` : detail}
        </text>
      )}
    </>
  );
}

function safeFileName(value, fallback = 'stage-plot') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function createStandaloneSvgBlob(svgNode) {
  if (!svgNode) return null;

  const clone = svgNode.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1600');
  clone.setAttribute('height', '992');

  const style = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'style'
  );
  style.textContent = `
    .stage-plot-svg-code { font-family: Arial, sans-serif; font-size: 18px; font-weight: 900; }
    .stage-plot-svg-label { font-family: Arial, sans-serif; font-size: 14px; font-weight: 800; }
    .stage-plot-svg-detail { font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; }
    .stage-plot-svg-mini { font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; }
  `;
  clone.insertBefore(style, clone.firstChild);

  return new Blob(
    [new XMLSerializer().serializeToString(clone)],
    { type: 'image/svg+xml;charset=utf-8' }
  );
}

function buildSvgDownload(svgNode, title) {
  const blob = createStandaloneSvgBlob(svgNode);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFileName(title)}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function loadSvgAsPngDataUrl(svgBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 2000;
        canvas.height = 1240;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('El navegador no pudo preparar el Stage Plot para PDF.');
        }

        context.fillStyle = '#050a13';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/png', 1));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo convertir el Stage Plot para PDF.'));
    };

    image.src = url;
  });
}

async function buildStagePlotPdfBlob({
  svgNode,
  title,
  formatName,
  widthM,
  depthM,
}) {
  const svgBlob = createStandaloneSvgBlob(svgNode);
  if (!svgBlob) {
    throw new Error('No se encontró el Stage Plot para exportar.');
  }

  const pngDataUrl = await loadSvgAsPngDataUrl(svgBlob);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = imageWidth * (620 / 1000);
  const imageY = 80;

  pdf.setProperties({
    title: `${title || 'Stage Plot'} - ${formatName || 'Formato'}`,
    subject: 'Stage Plot técnico generado por MiBooking',
    creator: 'MiBooking',
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text(title || 'Stage Plot', margin, 31);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `${formatName || 'Formato'} · Tarima ${widthM || 6} m × ${depthM || 4} m`,
    margin,
    49
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(
    margin - 1,
    imageY - 1,
    imageWidth + 2,
    imageHeight + 2,
    4,
    4
  );
  pdf.addImage(
    pngDataUrl,
    'PNG',
    margin,
    imageY,
    imageWidth,
    imageHeight,
    undefined,
    'FAST'
  );

  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'Distribución técnica sujeta a las dimensiones y condiciones reales del escenario.',
    margin,
    pageHeight - 20
  );
  pdf.text('Generado por MiBooking', pageWidth - margin, pageHeight - 20, {
    align: 'right',
  });

  return pdf.output('blob');
}

export default function StagePlotEditor({
  formato,
  workspaceId,
  readOnly = false,
  onSaved,
  onGenerateRider,
}) {
  const svgRef = useRef(null);
  const [plot, setPlot] = useState(() =>
    normalizeStagePlot(
      formato?.rider_config?.stage_plot,
      formato?.rider_config
    )
  );
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newType, setNewType] = useState('monitor');
  const [pdfViewer, setPdfViewer] = useState(null);
  const [emailDocument, setEmailDocument] = useState(null);
  const [sendingPdf, setSendingPdf] = useState(false);

  useEffect(() => {
    const nextPlot = normalizeStagePlot(
      formato?.rider_config?.stage_plot,
      formato?.rider_config
    );

    setPlot(nextPlot);
    setSelectedId(null);
    setDragging(null);
    setDirty(false);
  }, [formato?.id, formato?.rider_config]);

  const selectedItem = useMemo(
    () => plot.items.find((item) => item.id === selectedId) || null,
    [plot.items, selectedId]
  );

  const renderedItems = useMemo(
    () => sortStagePlotItems(plot.items),
    [plot.items]
  );

  function changePlot(field, value) {
    if (readOnly) return;

    setPlot((current) => ({
      ...current,
      [field]: value,
      updated_at: new Date().toISOString(),
    }));
    setDirty(true);
  }

  function updateItem(id, updates) {
    if (readOnly) return;

    setPlot((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
            }
          : item
      ),
    }));
    setDirty(true);
  }

  function pointerPosition(event) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [50, 50];

    return [
      clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      clamp(
        ((event.clientY - rect.top) / rect.height) * 100,
        0,
        100
      ),
    ];
  }

  function beginDrag(event, item) {
    if (readOnly) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);

    const [pointerX, pointerYRaw] = pointerPosition(event);
    const stageTopPercent = (STAGE_TOP / VIEWBOX_HEIGHT) * 100;
    const stageHeightPercent = (STAGE_HEIGHT / VIEWBOX_HEIGHT) * 100;
    const pointerY = clamp(
      ((pointerYRaw - stageTopPercent) / stageHeightPercent) * 100,
      0,
      100
    );

    setDragging({
      id: item.id,
      pointerId: event.pointerId,
      offsetX: pointerX - item.x,
      offsetY: pointerY - item.y,
    });

    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!dragging || readOnly) return;

    const [pointerX, pointerYRaw] = pointerPosition(event);
    const stageTopPercent = (STAGE_TOP / VIEWBOX_HEIGHT) * 100;
    const stageHeightPercent = (STAGE_HEIGHT / VIEWBOX_HEIGHT) * 100;
    const pointerY = clamp(
      ((pointerYRaw - stageTopPercent) / stageHeightPercent) * 100,
      0,
      100
    );

    updateItem(dragging.id, {
      x: clamp(pointerX - dragging.offsetX, 3, 97),
      y: clamp(pointerY - dragging.offsetY, 4, 94),
    });
  }

  function endDrag(event) {
    if (!dragging) return;

    svgRef.current?.releasePointerCapture?.(
      event?.pointerId ?? dragging.pointerId
    );
    setDragging(null);
  }

  function handleItemKey(event, item) {
    if (readOnly) return;

    const step = event.shiftKey ? 5 : 1;
    const updates = {};

    if (event.key === 'ArrowLeft') updates.x = clamp(item.x - step, 3, 97);
    if (event.key === 'ArrowRight') updates.x = clamp(item.x + step, 3, 97);
    if (event.key === 'ArrowUp') updates.y = clamp(item.y - step, 4, 94);
    if (event.key === 'ArrowDown') updates.y = clamp(item.y + step, 4, 94);

    if (Object.keys(updates).length > 0) {
      event.preventDefault();
      setSelectedId(item.id);
      updateItem(item.id, updates);
    }
  }

  function addItem() {
    if (readOnly) return;

    const item = createManualStagePlotItem(newType, {
      x: 50,
      y: 50,
    });

    setPlot((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      items: [...current.items, item],
    }));
    setSelectedId(item.id);
    setDirty(true);
  }

  function removeSelected() {
    if (!selectedItem || readOnly) return;

    setPlot((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      items: current.items.filter((item) => item.id !== selectedItem.id),
    }));
    setSelectedId(null);
    setDirty(true);
  }

  function duplicateSelected() {
    if (!selectedItem || readOnly) return;

    const duplicated = createManualStagePlotItem(selectedItem.type, {
      ...selectedItem,
      label: `${selectedItem.label} copia`,
      x: clamp(selectedItem.x + 4, 4, 96),
      y: clamp(selectedItem.y + 4, 5, 93),
    });

    setPlot((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      items: [...current.items, duplicated],
    }));
    setSelectedId(duplicated.id);
    setDirty(true);
  }

  function regenerate() {
    if (readOnly) return;

    if (
      dirty &&
      !window.confirm(
        'Esto reemplazará la distribución actual por una nueva basada en el rider. ¿Continuar?'
      )
    ) {
      return;
    }

    setPlot(generateStagePlotFromRider(formato?.rider_config || {}));
    setSelectedId(null);
    setDirty(true);
  }

  function synchronize() {
    if (readOnly) return;

    setPlot((current) =>
      syncStagePlotWithRider(
        current,
        formato?.rider_config || {}
      )
    );
    setSelectedId(null);
    setDirty(true);
    toast.success(
      'Stage Plot sincronizado. Se conservaron las posiciones y elementos manuales.'
    );
  }

  function normalizedPlotForSave(source = plot) {
    return {
      ...source,
      version: 1,
      width_m: Math.max(1, Number(source.width_m || 6)),
      depth_m: Math.max(1, Number(source.depth_m || 4)),
      title: String(source.title || 'Stage Plot principal').trim(),
      notes: String(source.notes || '').trim(),
      updated_at: new Date().toISOString(),
      items: source.items.map((item) => ({
        ...item,
        x: Number(item.x.toFixed(2)),
        y: Number(item.y.toFixed(2)),
        width: Number(item.width.toFixed(2)),
        height: Number(item.height.toFixed(2)),
        rotation: Number(item.rotation || 0),
      })),
    };
  }

  async function buildAndUploadStagePlotPdf() {
    const pdfBlob = await buildStagePlotPdfBlob({
      svgNode: svgRef.current,
      title: plot.title || 'Stage Plot principal',
      formatName: formato?.nombre || 'Formato',
      widthM: plot.width_m,
      depthM: plot.depth_m,
    });

    const path = await uploadStagePlotPdf(
      pdfBlob,
      formato.id,
      workspaceId
    );
    const url = await getStagePlotPdfSignedUrl(path);

    return { path, url };
  }

  async function save() {
    if (readOnly) return;

    try {
      setSaving(true);

      const stagePlot = normalizedPlotForSave();

      await saveFormatoRiderConfig(
        formato.id,
        {
          ...(formato.rider_config || {}),
          stage_plot: stagePlot,
        },
        workspaceId
      );

      const { path } = await buildAndUploadStagePlotPdf();
      const stagePlotWithPdf = {
        ...stagePlot,
        pdf_path: path,
        pdf_generado_at: new Date().toISOString(),
      };

      const saved = await saveFormatoRiderConfig(
        formato.id,
        {
          ...(formato.rider_config || {}),
          stage_plot: stagePlotWithPdf,
        },
        workspaceId
      );

      setPlot(stagePlotWithPdf);
      setDirty(false);
      onSaved?.(saved);
      toast.success('Stage Plot y PDF guardados correctamente.');
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudo guardar el Stage Plot y su PDF.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function ensureStoredStagePlotPdf() {
    if (dirty && !readOnly) {
      throw new Error(
        'Guarda primero los cambios del Stage Plot para actualizar el PDF.'
      );
    }

    if (plot.pdf_path) {
      const url = await getStagePlotPdfSignedUrl(plot.pdf_path);
      return { path: plot.pdf_path, url };
    }

    const result = await buildAndUploadStagePlotPdf();

    if (!readOnly) {
      const stagePlotWithPdf = {
        ...normalizedPlotForSave(),
        pdf_path: result.path,
        pdf_generado_at: new Date().toISOString(),
      };

      const saved = await saveFormatoRiderConfig(
        formato.id,
        {
          ...(formato.rider_config || {}),
          stage_plot: stagePlotWithPdf,
        },
        workspaceId
      );

      setPlot(stagePlotWithPdf);
      onSaved?.(saved);
    }

    return result;
  }

  async function openStagePlotPdf(autoPrint = false) {
    try {
      setExportingPdf(true);
      const result = await ensureStoredStagePlotPdf();

      setPdfViewer({
        title: `${plot.title || 'Stage Plot'} · ${formato?.nombre || 'Formato'}`,
        url: result.url,
        autoPrint,
      });
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudo preparar el Stage Plot PDF.'
      );
    } finally {
      setExportingPdf(false);
    }
  }

  function prepareStagePlotEmail() {
    setEmailDocument({
      title: `Enviar Stage Plot · ${formato?.nombre || 'Formato'}`,
      recipient: '',
      subject: `Stage Plot - ${formato?.nombre || 'Formato'}`,
      message:
        `Hola,\n\nAdjuntamos el Stage Plot técnico correspondiente al formato ` +
        `${formato?.nombre || 'contratado'}.\n\n` +
        `Por favor, compártelo con la compañía de sonido o responsable técnico.\n\n` +
        `Atentamente,\nMiBooking`,
    });
  }

  async function sendStagePlotEmail(form) {
    try {
      setSendingPdf(true);
      const result = await ensureStoredStagePlotPdf();

      await sendStagePlotByEmail({
        workspaceId,
        formatId: formato.id,
        path: result.path,
        recipient: form.recipient,
        subject: form.subject,
        message: form.message,
      });

      setEmailDocument(null);
      toast.success('Stage Plot enviado por correo.');
    } catch (error) {
      console.error(error);
      toast.error(
        error.message || 'No se pudo enviar el Stage Plot.'
      );
    } finally {
      setSendingPdf(false);
    }
  }

  function openRiderPdfGenerator() {
    if (dirty && !readOnly) {
      toast.error(
        'Guarda primero el Stage Plot para incluir esta versión en el Rider PDF.'
      );
      return;
    }

    onGenerateRider?.(formato);
  }

  return (
    <div className="stage-plot-editor">
      <header className="stage-plot-editor-header">
        <div>
          <span>Plano técnico del escenario</span>
          <h2>{plot.title || 'Stage Plot principal'}</h2>
          <p>
            {formato?.nombre || 'Formato'} · {plot.width_m} m ×{' '}
            {plot.depth_m} m · {plot.items.length} elementos
          </p>
        </div>

        <div className="stage-plot-editor-actions">
          {!readOnly && (
            <>
              <button type="button" onClick={regenerate}>
                Generar desde Rider
              </button>
              <button type="button" onClick={synchronize}>
                Sincronizar Rider
              </button>
              <button
                type="button"
                className="stage-plot-save-button"
                onClick={save}
                disabled={saving || !dirty}
              >
                {saving
                  ? 'Guardando...'
                  : dirty
                    ? 'Guardar Stage Plot'
                    : 'Guardado'}
              </button>
            </>
          )}

          {typeof onGenerateRider === 'function' && (
            <button
              type="button"
              className="stage-plot-rider-button"
              onClick={openRiderPdfGenerator}
            >
              Generar Rider PDF
            </button>
          )}

          <button
            type="button"
            className="stage-plot-pdf-button"
            onClick={() => openStagePlotPdf(false)}
            disabled={exportingPdf}
          >
            {exportingPdf ? 'Preparando PDF...' : 'Ver PDF'}
          </button>

          <button
            type="button"
            onClick={() => openStagePlotPdf(true)}
            disabled={exportingPdf}
          >
            Imprimir
          </button>

          <button
            type="button"
            onClick={prepareStagePlotEmail}
            disabled={exportingPdf}
          >
            Enviar por correo
          </button>

          <button
            type="button"
            onClick={() =>
              buildSvgDownload(
                svgRef.current,
                `${formato?.nombre || 'Formato'}-Stage-Plot`
              )
            }
          >
            Descargar SVG
          </button>
        </div>
      </header>

      <div className="stage-plot-editor-grid">
        <section className="stage-plot-canvas-panel">
          <div className="stage-plot-canvas-toolbar">
            <div>
              <strong>Fondo / Backstage</strong>
              <span>
                Arrastra cada símbolo para ubicarlo sobre la tarima.
              </span>
            </div>

            {!readOnly && (
              <div className="stage-plot-add-control">
                <select
                  value={newType}
                  onChange={(event) => setNewType(event.target.value)}
                  aria-label="Tipo de elemento para agregar"
                >
                  {STAGE_PLOT_ITEM_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addItem}>
                  + Agregar
                </button>
              </div>
            )}
          </div>

          <div className="stage-plot-svg-wrap">
            <svg
              ref={svgRef}
              className="stage-plot-svg"
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              role="img"
              aria-label={`Stage Plot del Formato ${formato?.nombre || ''}`}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={(event) => {
                if (dragging && event.buttons === 0) endDrag(event);
              }}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedId(null);
                }
              }}
            >
              <defs>
                <linearGradient id="stage-floor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#172033" />
                  <stop offset="100%" stopColor="#090f1c" />
                </linearGradient>
                <pattern
                  id="stage-grid"
                  width="50"
                  height="52"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 50 0 L 0 0 0 52"
                    fill="none"
                    stroke="rgba(148,163,184,.17)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#050a13" />

              <text
                x={VIEWBOX_WIDTH / 2}
                y="29"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="17"
                fontWeight="800"
                letterSpacing="3"
              >
                FONDO / BACKSTAGE
              </text>

              <rect
                x="8"
                y={STAGE_TOP}
                width={VIEWBOX_WIDTH - 16}
                height={STAGE_HEIGHT}
                rx="24"
                fill="url(#stage-floor)"
                stroke="#334155"
                strokeWidth="3"
              />
              <rect
                x="8"
                y={STAGE_TOP}
                width={VIEWBOX_WIDTH - 16}
                height={STAGE_HEIGHT}
                rx="24"
                fill="url(#stage-grid)"
              />

              <line
                x1="8"
                y1={STAGE_TOP + STAGE_HEIGHT / 3}
                x2={VIEWBOX_WIDTH - 8}
                y2={STAGE_TOP + STAGE_HEIGHT / 3}
                stroke="rgba(96,165,250,.2)"
                strokeWidth="2"
                strokeDasharray="14 12"
              />
              <line
                x1="8"
                y1={STAGE_TOP + (STAGE_HEIGHT * 2) / 3}
                x2={VIEWBOX_WIDTH - 8}
                y2={STAGE_TOP + (STAGE_HEIGHT * 2) / 3}
                stroke="rgba(96,165,250,.2)"
                strokeWidth="2"
                strokeDasharray="14 12"
              />

              {renderedItems.map((item) => (
                <g
                  key={item.id}
                  className={`stage-plot-item ${
                    selectedId === item.id ? 'selected' : ''
                  } ${item.orphaned ? 'orphaned' : ''}`}
                  transform={`translate(${pxX(item.x)} ${pxY(item.y)}) rotate(${item.rotation || 0})`}
                  onPointerDown={(event) => beginDrag(event, item)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(item.id);
                  }}
                  onKeyDown={(event) => handleItemKey(event, item)}
                  tabIndex={readOnly ? -1 : 0}
                  role="button"
                  aria-label={`${item.label}. Posición horizontal ${Math.round(
                    item.x
                  )} por ciento, vertical ${Math.round(item.y)} por ciento.`}
                >
                  <StageItemShape
                    item={item}
                    selected={selectedId === item.id}
                  />
                </g>
              ))}

              <path
                d={`M 330 ${STAGE_TOP + STAGE_HEIGHT + 22} L 670 ${STAGE_TOP + STAGE_HEIGHT + 22}`}
                stroke="#60a5fa"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d={`M 660 ${STAGE_TOP + STAGE_HEIGHT + 13} L 680 ${STAGE_TOP + STAGE_HEIGHT + 22} L 660 ${STAGE_TOP + STAGE_HEIGHT + 31}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={VIEWBOX_WIDTH / 2}
                y={STAGE_TOP + STAGE_HEIGHT + 45}
                textAnchor="middle"
                fill="#bfdbfe"
                fontSize="17"
                fontWeight="900"
                letterSpacing="2"
              >
                FRENTE / PÚBLICO
              </text>
            </svg>
          </div>

          <div className="stage-plot-legend">
            {STAGE_PLOT_ITEM_TYPES.filter((item) =>
              plot.items.some((plotItem) => plotItem.type === item.value)
            ).map((item) => (
              <span key={item.value}>
                <b>{item.code}</b> {item.label}
              </span>
            ))}
          </div>
        </section>

        <aside className="stage-plot-inspector">
          <section>
            <span className="stage-plot-inspector-eyebrow">
              Configuración de tarima
            </span>
            <h3>Dimensiones y notas</h3>

            <div className="stage-plot-two-fields">
              <label>
                Ancho (m)
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={plot.width_m}
                  disabled={readOnly}
                  onChange={(event) =>
                    changePlot('width_m', Number(event.target.value))
                  }
                />
              </label>

              <label>
                Fondo (m)
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={plot.depth_m}
                  disabled={readOnly}
                  onChange={(event) =>
                    changePlot('depth_m', Number(event.target.value))
                  }
                />
              </label>
            </div>

            <label>
              Nombre del plano
              <input
                value={plot.title}
                disabled={readOnly}
                onChange={(event) =>
                  changePlot('title', event.target.value)
                }
              />
            </label>

            <label>
              Notas generales
              <textarea
                rows="4"
                value={plot.notes}
                disabled={readOnly}
                onChange={(event) =>
                  changePlot('notes', event.target.value)
                }
              />
            </label>
          </section>

          <section>
            <span className="stage-plot-inspector-eyebrow">
              Elemento seleccionado
            </span>

            {!selectedItem ? (
              <div className="stage-plot-no-selection">
                Selecciona un elemento de la tarima para editar su
                etiqueta, tamaño, posición y rotación.
              </div>
            ) : (
              <>
                <h3>{selectedItem.label}</h3>

                {selectedItem.orphaned && (
                  <div className="stage-plot-orphan-warning">
                    Este elemento ya no aparece en el Rider. Puedes
                    conservarlo, editarlo o eliminarlo.
                  </div>
                )}

                <label>
                  Tipo
                  <select
                    value={selectedItem.type}
                    disabled={readOnly || selectedItem.linked}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        type: event.target.value,
                      })
                    }
                  >
                    {STAGE_PLOT_ITEM_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Etiqueta
                  <input
                    value={selectedItem.label}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        label: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Detalle
                  <input
                    value={selectedItem.detail}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        detail: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="stage-plot-two-fields">
                  <label>
                    X (%)
                    <input
                      type="number"
                      min="3"
                      max="97"
                      step="0.5"
                      value={selectedItem.x}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateItem(selectedItem.id, {
                          x: clamp(event.target.value, 3, 97),
                        })
                      }
                    />
                  </label>

                  <label>
                    Y (%)
                    <input
                      type="number"
                      min="4"
                      max="94"
                      step="0.5"
                      value={selectedItem.y}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateItem(selectedItem.id, {
                          y: clamp(event.target.value, 4, 94),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="stage-plot-two-fields">
                  <label>
                    Ancho (%)
                    <input
                      type="number"
                      min="4"
                      max="34"
                      step="0.5"
                      value={selectedItem.width}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateItem(selectedItem.id, {
                          width: clamp(event.target.value, 4, 34),
                        })
                      }
                    />
                  </label>

                  <label>
                    Alto (%)
                    <input
                      type="number"
                      min="4"
                      max="26"
                      step="0.5"
                      value={selectedItem.height}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateItem(selectedItem.id, {
                          height: clamp(event.target.value, 4, 26),
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Rotación ({Math.round(selectedItem.rotation)}°)
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={selectedItem.rotation}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateItem(selectedItem.id, {
                        rotation: Number(event.target.value),
                      })
                    }
                  />
                </label>

                {!readOnly && (
                  <div className="stage-plot-item-actions">
                    <button type="button" onClick={duplicateSelected}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={removeSelected}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="stage-plot-help">
            <strong>Sincronización segura</strong>
            <p>
              “Sincronizar Rider” agrega integrantes y equipos nuevos,
              actualiza las etiquetas vinculadas y conserva las posiciones
              que ya organizaste. Los elementos manuales no se eliminan.
            </p>
          </section>
        </aside>
      </div>
      <PdfDocumentModal
        document={pdfViewer}
        onClose={() => setPdfViewer(null)}
      />

      <PdfEmailModal
        document={emailDocument}
        sending={sendingPdf}
        onClose={() => setEmailDocument(null)}
        onSend={sendStagePlotEmail}
      />
    </div>
  );
}
