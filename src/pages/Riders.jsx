import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getCotizacionById } from '../lib/cotizacionesService';
import { getFormatoById } from '../lib/formatosService';
import { getMyBusinessProfile } from '../lib/profileService';
import {
  createRider,
  deleteRider,
  downloadStoredRider,
  getEligibleRiderQuotes,
  getWorkspaceRiders,
  sendRiderByEmail,
  updateRider,
  uploadRiderPdf,
} from '../lib/ridersService';
import { generateRiderPdfBlob } from '../lib/riderPdf';
import './Riders.css';

const DELETE_WORDS = [
  'AUDIO',
  'CANAL',
  'EQUIPO',
  'MONITOR',
  'RIDER',
  'SONIDO',
  'TARIMA',
  'TECNICO',
];

const EMPTY_FORM = {
  cotizacion_id: '',
  hora_prueba_sonido: '',
  sound_provider: '',
  contacto_tecnico_nombre: '',
  contacto_tecnico_telefono: '',
  contacto_tecnico_email: '',
  restrictions: '',
  additional_notes: '',
  destinatario_email: '',
};

function randomDeleteWord() {
  if (
    typeof window !== 'undefined' &&
    window.crypto?.getRandomValues
  ) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return DELETE_WORDS[values[0] % DELETE_WORDS.length];
  }

  return DELETE_WORDS[
    Math.floor(Math.random() * DELETE_WORDS.length)
  ];
}

function hasRiderConfig(formato) {
  return Boolean(
    formato?.rider_config &&
      Array.isArray(formato.rider_config.integrantes) &&
      formato.rider_config.integrantes.length > 0
  );
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

function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || '').trim()
  );
}

export default function Riders({
  workspaceId,
  workspace,
  esArtista,
  goBack,
  goContracts,
  initialMode = 'lista',
}) {
  const [quotes, setQuotes] = useState([]);
  const [riders, setRiders] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [quote, setQuote] = useState(null);
  const [formato, setFormato] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const [riderToEmail, setRiderToEmail] = useState(null);
  const [emailForm, setEmailForm] = useState({
    destinatario: '',
    asunto: '',
    mensaje: '',
  });

  const [riderToDelete, setRiderToDelete] = useState(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    loadAll();
  }, [workspaceId]);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      setQuote(null);
      setFormato(null);
      setForm(EMPTY_FORM);

      const [quotesData, ridersData, profileData] =
        await Promise.all([
          getEligibleRiderQuotes(workspaceId),
          getWorkspaceRiders(workspaceId),
          getMyBusinessProfile(workspaceId),
        ]);

      setQuotes(quotesData);
      setRiders(ridersData);
      setBusinessProfile(profileData);
    } catch (err) {
      console.error(err);

      const message =
        err.message || 'No se pudieron cargar los riders.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function change(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
  }

  async function selectQuote(event) {
    const quoteId = event.target.value;

    setForm((current) => ({
      ...current,
      cotizacion_id: quoteId,
    }));
    setQuote(null);
    setFormato(null);
    setError('');

    if (!quoteId) return;

    try {
      setLoadingQuote(true);

      const quoteData = await getCotizacionById(
        quoteId,
        workspaceId
      );

      if (!quoteData.formato_id) {
        throw new Error(
          'La cotización no tiene un Formato asociado.'
        );
      }

      const formatData = await getFormatoById(
        quoteData.formato_id,
        workspaceId
      );

      if (!hasRiderConfig(formatData)) {
        throw new Error(
          `El Formato "${formatData.nombre}" todavía no tiene un rider configurado. Ábrelo en Formatos → Configurar rider.`
        );
      }

      const config = formatData.rider_config || {};
      const contact = config.contacto_tecnico || {};
      const client = quoteData.clientes || {};

      setQuote(quoteData);
      setFormato(formatData);
      setForm({
        ...EMPTY_FORM,
        cotizacion_id: String(quoteData.id),
        hora_prueba_sonido: '',
        sound_provider: quoteData.incluye_sonido
          ? 'Incluido por el Artista según la cotización'
          : 'Suministrado por el Contratante o su proveedor de sonido',
        contacto_tecnico_nombre: contact.nombre || '',
        contacto_tecnico_telefono: contact.telefono || '',
        contacto_tecnico_email: contact.email || '',
        restrictions: '',
        additional_notes: quoteData.observaciones || '',
        destinatario_email: client.email || '',
      });
    } catch (err) {
      console.error(err);

      const message =
        err.message || 'No se pudo cargar la cotización.';

      setError(message);
      toast.error(message);
    } finally {
      setLoadingQuote(false);
    }
  }

  const preview = useMemo(() => {
    if (!quote || !formato || !hasRiderConfig(formato)) {
      return null;
    }

    const client = quote.clientes || {};
    const zone = quote.provincias || {};
    const quoteProfile = quote.perfil_negocio_snapshot || {};
    const profile = businessProfile || quoteProfile || {};
    const config = formato.rider_config || {};
    const integrantes = Array.isArray(config.integrantes)
      ? config.integrantes
      : [];
    const totalChannels = integrantes.reduce(
      (total, item) => total + Number(item.canales || 0),
      0
    );

    const artistName =
      quote.artista_nombre_snapshot ||
      quote.artista_snapshot?.nombre ||
      workspace?.workspace_name ||
      'Artista';

    const snapshot = {
      captured_at: new Date().toISOString(),
      quote: {
        id: quote.id,
        number: quote.numero || `#${quote.id}`,
        status: quote.estado,
      },
      artist: {
        workspace_id: workspaceId,
        artistic_name: artistName,
        legal_name:
          quoteProfile.nombre_completo ||
          profile.nombre_completo ||
          artistName,
        phone:
          quoteProfile.telefono || profile.telefono || '',
        email:
          quote.artista_email_snapshot ||
          workspace?.email_contacto ||
          '',
        logo_path:
          quoteProfile.logo_path || profile.logo_path || '',
        logo_url:
          quoteProfile.logo_url || profile.logo_url || '',
      },
      client: {
        id: client.id || quote.cliente_id,
        name: client.nombre || '',
        company: client.empresa || '',
        phone: client.telefono || '',
        email: form.destinatario_email || client.email || '',
      },
      event: {
        name:
          quote.nombre_evento || quote.tipo_evento || 'Evento',
        type: quote.tipo_evento || '',
        date: quote.fecha_evento || '',
        venue: quote.venue || '',
        address: quote.direccion_evento || '',
        zone:
          zone.nombre || quote.zona_nombre_snapshot || '',
        setup_time: quote.hora_montaje || '',
        soundcheck_time: form.hora_prueba_sonido || '',
        start_time: quote.hora_inicio || '',
        end_time: quote.hora_fin || '',
        guests: quote.invitados || null,
        contact: quote.contacto_evento || '',
        contact_phone: quote.telefono_contacto || '',
        includes_sound: Boolean(quote.incluye_sonido),
      },
      format: {
        id: formato.id,
        name:
          quote.formato_nombre_snapshot ||
          quote.formato_snapshot?.nombre ||
          formato.nombre,
        supporting_musicians: Number(
          formato.cantidad_musicos || 1
        ),
        performers: integrantes.length,
        channels: totalChannels,
        rider_config: config,
      },
      event_specific: {
        sound_provider: form.sound_provider,
        contacto_tecnico: {
          nombre: form.contacto_tecnico_nombre,
          telefono: form.contacto_tecnico_telefono,
          email: form.contacto_tecnico_email,
        },
        restrictions: form.restrictions,
        additional_notes: form.additional_notes,
      },
    };

    return {
      snapshot,
      integrantes,
      totalChannels,
    };
  }, [
    quote,
    formato,
    form,
    businessProfile,
    workspace,
    workspaceId,
  ]);

  function validateRider() {
    if (!quote || !formato || !preview) {
      toast.error(
        'Selecciona una cotización con un Formato configurado.'
      );
      return false;
    }

    if (!['Confirmada', 'Aprobada'].includes(quote.estado)) {
      toast.error(
        'La cotización debe estar Confirmada o Aprobada.'
      );
      return false;
    }

    if (!form.sound_provider.trim()) {
      toast.error('Indica quién suministrará el sonido.');
      return false;
    }

    return true;
  }

  async function generateAndDownload() {
    setError('');

    if (!validateRider()) return;

    try {
      setGenerating(true);

      let savedRider = await createRider(
        {
          cotizacion_id: quote.id,
          formato_id: formato.id,
          estado: 'Generado',
          datos_snapshot: preview.snapshot,
          destinatario_email: form.destinatario_email,
        },
        workspaceId
      );

      const snapshotWithNumber = {
        ...preview.snapshot,
        rider: {
          id: savedRider.id,
          number: savedRider.numero,
          version: savedRider.version,
          status: 'Generado',
        },
      };

      savedRider = await updateRider(
        savedRider.id,
        {
          datos_snapshot: snapshotWithNumber,
        },
        workspaceId
      );

      const pdfBlob = await generateRiderPdfBlob({
        rider: savedRider,
        appLogoUrl: '/mibooking-icon.png',
      });

      const pdfPath = await uploadRiderPdf(
        pdfBlob,
        savedRider,
        workspaceId
      );

      savedRider = await updateRider(
        savedRider.id,
        {
          pdf_path: pdfPath,
          datos_snapshot: snapshotWithNumber,
        },
        workspaceId
      );

      downloadBlob(
        pdfBlob,
        `Rider-${savedRider.numero}.pdf`
      );

      setRiders(await getWorkspaceRiders(workspaceId));
      setMode('lista');
      setQuote(null);
      setFormato(null);
      setForm(EMPTY_FORM);

      toast.success(
        'Rider técnico generado y descargado correctamente.'
      );
    } catch (err) {
      console.error(err);

      const message =
        err.message || 'No se pudo generar el rider.';

      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function downloadRider(rider) {
    try {
      setDownloadingId(rider.id);
      await downloadStoredRider(rider);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo descargar el rider.'
      );
    } finally {
      setDownloadingId(null);
    }
  }

  function prepareEmail(rider) {
    const snapshot = rider.datos_snapshot || {};
    const artist = snapshot.artist || {};
    const client = snapshot.client || {};
    const event = snapshot.event || {};

    setRiderToEmail(rider);
    setEmailForm({
      destinatario:
        rider.destinatario_email || client.email || '',
      asunto:
        `Rider técnico ${rider.numero} - ` +
        `${artist.artistic_name || workspace?.workspace_name || 'Artista'}`,
      mensaje:
        `Hola ${client.name || ''},\n\n` +
        `Adjuntamos el rider técnico correspondiente al evento ` +
        `${event.name || event.type || ''}, programado para el ` +
        `${formatDate(event.date)}.\n\n` +
        `Por favor, compártelo con la compañía de sonido o responsable técnico y confírmanos cualquier limitación con suficiente antelación.\n\n` +
        `Atentamente,\n${artist.artistic_name || workspace?.workspace_name || 'MiBooking'}`,
    });
  }

  async function sendEmail(event) {
    event.preventDefault();

    if (!riderToEmail) return;

    if (!isValidEmail(emailForm.destinatario)) {
      toast.error('Escribe un correo válido.');
      return;
    }

    try {
      setSendingId(riderToEmail.id);

      await sendRiderByEmail({
        riderId: riderToEmail.id,
        workspaceId,
        recipient: emailForm.destinatario,
        subject: emailForm.asunto,
        message: emailForm.mensaje,
      });

      setRiders(await getWorkspaceRiders(workspaceId));
      setRiderToEmail(null);
      toast.success('Rider enviado por correo correctamente.');
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo enviar el rider.'
      );
    } finally {
      setSendingId(null);
    }
  }

  function prepareDelete(rider) {
    if (!esArtista) {
      toast.error(
        'Solo el Artista puede borrar riders permanentemente.'
      );
      return;
    }

    setRiderToDelete(rider);
    setDeleteWord(randomDeleteWord());
    setDeleteInput('');
  }

  async function confirmDelete(event) {
    event.preventDefault();

    if (!riderToDelete || !esArtista) return;

    if (
      deleteInput.trim().toUpperCase() !== deleteWord
    ) {
      toast.error('La palabra de confirmación no coincide.');
      return;
    }

    try {
      setDeletingId(riderToDelete.id);
      await deleteRider(riderToDelete, workspaceId);
      setRiders((current) =>
        current.filter((item) => item.id !== riderToDelete.id)
      );
      setRiderToDelete(null);
      setDeleteWord('');
      setDeleteInput('');
      toast.success('Rider eliminado permanentemente.');
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo eliminar el rider.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="dashboard riders-page">
        Cargando riders técnicos...
      </div>
    );
  }

  return (
    <div className="dashboard riders-page">
      <div className="top-bar">
        <div>
          <h1>Documentos</h1>
          <p>
            Riders técnicos de{' '}
            {workspace?.workspace_name || 'Artista'}
            {' · '}
            {esArtista ? 'Cuenta de Artista' : 'Cuenta de Gestor'}
          </p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <div className="riders-document-tabs">
        <button type="button" onClick={goContracts}>
          Contratos
        </button>
        <button type="button" className="active">
          Riders técnicos
        </button>
      </div>

      <div className="riders-toolbar">
        <button
          type="button"
          className={mode === 'lista' ? 'active' : ''}
          onClick={() => setMode('lista')}
        >
          Riders generados
        </button>

        <button
          type="button"
          className={mode === 'generar' ? 'active' : ''}
          onClick={() => {
            setMode('generar');
            setQuote(null);
            setFormato(null);
            setForm(EMPTY_FORM);
          }}
        >
          + Generar rider técnico
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mode === 'lista' ? (
        <section className="riders-list">
          {riders.length === 0 ? (
            <div className="riders-empty">
              <h2>No hay riders generados</h2>
              <p>
                Configura primero un Formato y genera el rider
                desde una cotización Confirmada o Aprobada.
              </p>
              <button
                type="button"
                onClick={() => setMode('generar')}
              >
                Generar rider técnico
              </button>
            </div>
          ) : (
            riders.map((rider) => {
              const snapshot = rider.datos_snapshot || {};
              const event = snapshot.event || {};
              const formatSnapshot = snapshot.format || {};
              const client = snapshot.client || {};

              return (
                <article className="rider-card" key={rider.id}>
                  <div className="rider-card-main">
                    <div className="rider-number">
                      <span>Rider técnico</span>
                      <strong>{rider.numero}</strong>
                    </div>

                    <div className="rider-identity">
                      <strong>{client.name || 'Cliente'}</strong>
                      <span>
                        {event.name || event.type || 'Evento'}
                      </span>
                      <small>
                        {formatDate(event.date)} ·{' '}
                        {event.venue || 'Lugar pendiente'}
                      </small>
                    </div>

                    <div>
                      <span>Formato</span>
                      <strong>
                        {formatSnapshot.name ||
                          rider.formatos?.nombre ||
                          'N/A'}
                      </strong>
                    </div>

                    <div>
                      <span>Canales</span>
                      <strong>
                        {formatSnapshot.channels || 0}
                      </strong>
                    </div>

                    <span
                      className={
                        `rider-status status-${statusClass(
                          rider.estado
                        )}`
                      }
                    >
                      {rider.estado}
                    </span>
                  </div>

                  <div className="rider-card-actions">
                    <button
                      type="button"
                      disabled={
                        downloadingId === rider.id ||
                        !rider.pdf_path
                      }
                      onClick={() => downloadRider(rider)}
                    >
                      {downloadingId === rider.id
                        ? 'Preparando...'
                        : 'Descargar PDF'}
                    </button>

                    <button
                      type="button"
                      disabled={!rider.pdf_path}
                      onClick={() => prepareEmail(rider)}
                    >
                      Enviar por correo
                    </button>

                    {esArtista && (
                      <button
                        type="button"
                        className="rider-delete-button"
                        disabled={deletingId === rider.id}
                        onClick={() => prepareDelete(rider)}
                      >
                        {deletingId === rider.id
                          ? 'Eliminando...'
                          : 'Borrar rider'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : (
        <div className="rider-generator-grid">
          <form
            className="form-cotizacion rider-generator-form"
            onSubmit={(event) => {
              event.preventDefault();
              generateAndDownload();
            }}
          >
            <section className="form-section form-full">
              <h2>Cotización de referencia</h2>

              <label htmlFor="rider-quote">
                Cotización confirmada o aprobada *
              </label>
              <select
                id="rider-quote"
                name="cotizacion_id"
                value={form.cotizacion_id}
                onChange={selectQuote}
              >
                <option value="">Seleccionar cotización</option>

                {quotes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.numero || `#${item.id}`} ·{' '}
                    {item.clientes?.nombre || 'Cliente'} ·{' '}
                    {item.nombre_evento ||
                      item.tipo_evento ||
                      'Evento'}{' '}
                    · {formatDate(item.fecha_evento)}
                  </option>
                ))}
              </select>

              {loadingQuote && (
                <p>Cargando Formato y configuración técnica...</p>
              )}

              {quotes.length === 0 && (
                <p>
                  No existen cotizaciones Confirmadas o Aprobadas
                  con Formato asociado.
                </p>
              )}
            </section>

            {quote && formato && (
              <>
                <section className="form-section">
                  <h2>Producción del evento</h2>

                  <label>Proveedor de sonido *</label>
                  <input
                    name="sound_provider"
                    value={form.sound_provider}
                    onChange={change}
                  />

                  <label>Hora de prueba de sonido</label>
                  <input
                    type="time"
                    name="hora_prueba_sonido"
                    value={form.hora_prueba_sonido}
                    onChange={change}
                  />

                  <label>Restricciones del lugar</label>
                  <textarea
                    rows="5"
                    name="restrictions"
                    value={form.restrictions}
                    onChange={change}
                    placeholder="Ej: límite de volumen, acceso, horario de carga..."
                  />
                </section>

                <section className="form-section">
                  <h2>Contacto técnico</h2>

                  <label>Nombre</label>
                  <input
                    name="contacto_tecnico_nombre"
                    value={form.contacto_tecnico_nombre}
                    onChange={change}
                  />

                  <label>Teléfono</label>
                  <input
                    name="contacto_tecnico_telefono"
                    value={form.contacto_tecnico_telefono}
                    onChange={change}
                  />

                  <label>Correo técnico</label>
                  <input
                    type="email"
                    name="contacto_tecnico_email"
                    value={form.contacto_tecnico_email}
                    onChange={change}
                  />

                  <label>Correo para enviar el rider</label>
                  <input
                    type="email"
                    name="destinatario_email"
                    value={form.destinatario_email}
                    onChange={change}
                  />
                </section>

                <section className="form-section form-full">
                  <h2>Notas particulares</h2>
                  <textarea
                    rows="7"
                    name="additional_notes"
                    value={form.additional_notes}
                    onChange={change}
                    placeholder="Información técnica específica de este evento."
                  />
                </section>

                <div className="form-actions rider-form-actions">
                  <button type="submit" disabled={generating}>
                    {generating
                      ? 'Generando rider...'
                      : 'Generar y descargar PDF'}
                  </button>
                </div>
              </>
            )}
          </form>

          <aside className="rider-preview-panel">
            <div className="rider-preview-paper">
              <header>
                <img src="/mibooking-icon.png" alt="MiBooking" />
                <div>
                  <strong>Rider técnico</strong>
                  <span>MiBooking</span>
                </div>
              </header>

              {!preview ? (
                <div className="rider-preview-empty">
                  Selecciona una cotización cuyo Formato tenga
                  una configuración técnica guardada.
                </div>
              ) : (
                <>
                  <h2>{preview.snapshot.artist.artistic_name}</h2>

                  <div className="rider-preview-summary">
                    <p>
                      <strong>Formato:</strong>{' '}
                      {preview.snapshot.format.name}
                    </p>
                    <p>
                      <strong>Evento:</strong>{' '}
                      {preview.snapshot.event.name}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{' '}
                      {formatDate(preview.snapshot.event.date)}
                    </p>
                    <p>
                      <strong>Montaje:</strong>{' '}
                      {formatTime(
                        preview.snapshot.event.setup_time
                      )}
                    </p>
                    <p>
                      <strong>Personas en tarima:</strong>{' '}
                      {preview.integrantes.length}
                    </p>
                    <p>
                      <strong>Canales:</strong>{' '}
                      {preview.totalChannels}
                    </p>
                  </div>

                  <h3>Formación</h3>
                  <div className="rider-preview-members">
                    {preview.integrantes.map((item, index) => (
                      <div key={item.id || index}>
                        <strong>{item.funcion}</strong>
                        <span>
                          {item.instrumento} · {item.canales} canal(es)
                        </span>
                        <small>
                          {item.posicion} · {item.monitor}
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {riderToEmail && (
        <div className="rider-modal-backdrop">
          <form className="rider-modal" onSubmit={sendEmail}>
            <h2>Enviar rider por correo</h2>
            <p>{riderToEmail.numero}</p>

            <label>Destinatario</label>
            <input
              type="email"
              value={emailForm.destinatario}
              onChange={(event) =>
                setEmailForm((current) => ({
                  ...current,
                  destinatario: event.target.value,
                }))
              }
            />

            <label>Asunto</label>
            <input
              value={emailForm.asunto}
              onChange={(event) =>
                setEmailForm((current) => ({
                  ...current,
                  asunto: event.target.value,
                }))
              }
            />

            <label>Mensaje</label>
            <textarea
              rows="9"
              value={emailForm.mensaje}
              onChange={(event) =>
                setEmailForm((current) => ({
                  ...current,
                  mensaje: event.target.value,
                }))
              }
            />

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setRiderToEmail(null)}
                disabled={sendingId === riderToEmail.id}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sendingId === riderToEmail.id}
              >
                {sendingId === riderToEmail.id
                  ? 'Enviando...'
                  : 'Enviar PDF'}
              </button>
            </div>
          </form>
        </div>
      )}

      {riderToDelete && (
        <div className="rider-modal-backdrop">
          <form className="rider-modal" onSubmit={confirmDelete}>
            <h2>Borrar rider permanentemente</h2>
            <p>
              Se eliminarán el registro y el PDF almacenado. Las
              copias ya enviadas por correo no pueden retirarse.
            </p>

            <div className="rider-delete-word">
              Escribe <strong>{deleteWord}</strong> para confirmar.
            </div>

            <input
              value={deleteInput}
              onChange={(event) =>
                setDeleteInput(event.target.value)
              }
              autoComplete="off"
              autoFocus
            />

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setRiderToDelete(null)}
                disabled={deletingId === riderToDelete.id}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rider-delete-confirm"
                disabled={
                  deletingId === riderToDelete.id ||
                  deleteInput.trim().toUpperCase() !== deleteWord
                }
              >
                {deletingId === riderToDelete.id
                  ? 'Eliminando...'
                  : 'Borrar definitivamente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
