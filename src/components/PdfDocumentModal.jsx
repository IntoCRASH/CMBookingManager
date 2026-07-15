import { useEffect, useRef, useState } from 'react';
import './PdfDocumentModal.css';

export default function PdfDocumentModal({
  document: pdfDocument,
  onClose,
}) {
  const iframeRef = useRef(null);
  const [viewerUrl, setViewerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const autoPrintDone = useRef(false);

  useEffect(() => {
    if (!pdfDocument?.url) {
      setViewerUrl('');
      return undefined;
    }

    let active = true;
    let objectUrl = '';

    async function preparePdf() {
      try {
        setLoading(true);
        setLoaded(false);
        setError('');
        autoPrintDone.current = false;

        const response = await fetch(pdfDocument.url);

        if (!response.ok) {
          throw new Error('No se pudo abrir el PDF guardado.');
        }

        const blob = await response.blob();

        if (!active) return;

        objectUrl = URL.createObjectURL(
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' })
        );

        setViewerUrl(objectUrl);
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            err.message || 'No se pudo preparar la vista del PDF.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    preparePdf();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfDocument?.url]);

  useEffect(() => {
    if (!pdfDocument) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [pdfDocument, onClose]);

  function printPdf() {
    const frameWindow = iframeRef.current?.contentWindow;

    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
      return;
    }

    if (pdfDocument?.url) {
      window.open(pdfDocument.url, '_blank', 'noopener,noreferrer');
    }
  }

  function handleLoaded() {
    setLoaded(true);

    if (pdfDocument?.autoPrint && !autoPrintDone.current) {
      autoPrintDone.current = true;
      window.setTimeout(printPdf, 250);
    }
  }

  if (!pdfDocument) return null;

  return (
    <div
      className="pdf-document-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="pdf-document-modal"
        role="dialog"
        aria-modal="true"
        aria-label={pdfDocument.title || 'Documento PDF'}
      >
        <header className="pdf-document-header">
          <div>
            <span>Documento guardado</span>
            <h2>{pdfDocument.title || 'Documento PDF'}</h2>
          </div>

          <div className="pdf-document-header-actions">
            <button
              type="button"
              onClick={printPdf}
              disabled={!loaded || Boolean(error)}
            >
              Imprimir
            </button>
            <button type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="pdf-document-viewer">
          {loading && (
            <div className="pdf-document-status">
              Preparando PDF...
            </div>
          )}

          {error && (
            <div className="pdf-document-status error">
              <strong>No se pudo mostrar el PDF.</strong>
              <span>{error}</span>
            </div>
          )}

          {viewerUrl && !error && (
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              title={pdfDocument.title || 'Documento PDF'}
              onLoad={handleLoaded}
            />
          )}
        </div>
      </section>
    </div>
  );
}
