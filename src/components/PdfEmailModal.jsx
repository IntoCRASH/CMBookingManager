import { useEffect, useState } from 'react';
import './PdfEmailModal.css';

export default function PdfEmailModal({
  document,
  sending = false,
  onClose,
  onSend,
}) {
  const [form, setForm] = useState({
    recipient: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    setForm({
      recipient: document?.recipient || '',
      subject: document?.subject || '',
      message: document?.message || '',
    });
  }, [document]);

  if (!document) return null;

  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSend?.(form);
  }

  return (
    <div
      className="pdf-email-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) {
          onClose?.();
        }
      }}
    >
      <form className="pdf-email-modal" onSubmit={submit}>
        <header>
          <span>Enviar documento</span>
          <h2>{document.title || 'Enviar PDF por correo'}</h2>
          <p>
            Se adjuntará la versión PDF que está guardada en MiBooking.
          </p>
        </header>

        <label htmlFor="pdf-email-recipient">Destinatario</label>
        <input
          id="pdf-email-recipient"
          type="email"
          value={form.recipient}
          onChange={(event) => change('recipient', event.target.value)}
          required
          autoFocus
        />

        <label htmlFor="pdf-email-subject">Asunto</label>
        <input
          id="pdf-email-subject"
          type="text"
          value={form.subject}
          onChange={(event) => change('subject', event.target.value)}
          required
        />

        <label htmlFor="pdf-email-message">Mensaje</label>
        <textarea
          id="pdf-email-message"
          rows="8"
          value={form.message}
          onChange={(event) => change('message', event.target.value)}
        />

        <div className="pdf-email-actions">
          <button type="button" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar PDF'}
          </button>
        </div>
      </form>
    </div>
  );
}
