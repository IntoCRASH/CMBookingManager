import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getCotizacionById } from '../lib/cotizacionesService';
import { getMyBusinessProfile } from '../lib/profileService';
import {
  createContract,
  deleteContract,
  downloadStoredContract,
  getEligibleContractQuotes,
  getWorkspaceContracts,
  sendContractByEmail,
  updateContract,
  uploadContractPdf,
} from '../lib/contratosService';
import {
  DEFAULT_CONTRACT_TEMPLATE,
  formatDateLong,
  formatMoney,
  formatTime,
  moneyToWords,
  renderContractTemplate,
  subtractDays,
  text,
} from '../lib/contratoTemplate';
import {
  generateContractPdfBlob,
} from '../lib/contratoPdf';
import Riders from './Riders';
import './Documentos.css';

const DELETE_CONFIRMATION_WORDS = [
  'ARCHIVO',
  'BORRAR',
  'CONTRATO',
  'DOCUMENTO',
  'ELIMINAR',
  'EVENTO',
  'FIRMA',
  'MUSICA',
  'RESERVA',
  'TARIFA',
];

function createDeleteConfirmationWord() {
  const words = DELETE_CONFIRMATION_WORDS;

  if (
    typeof window !== 'undefined' &&
    window.crypto?.getRandomValues
  ) {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    return words[random[0] % words.length];
  }

  return words[Math.floor(Math.random() * words.length)];
}

const EMPTY_FORM = {
  cotizacion_id: '',

  identificacion_contratante: '',
  direccion_contratante: '',
  representante_contratante: '',
  calidad_contratante: 'en nombre propio',

  hora_prueba_sonido: '',
  cantidad_sets: 2,
  duracion_set: 45,
  duracion_receso: 30,
  cantidad_personal: 1,

  servicios_incluidos: '',
  servicios_excluidos: '',
  hospitalidad: '',
  transporte_hospedaje: '',

  porcentaje_adelanto: 50,
  fecha_limite_anticipo: '',
  fecha_limite_saldo: '',
  tarifa_hora_extra: 0,
  dias_cancelacion: 14,

  condiciones_especiales: 'Ninguna.',
  anexos: 'Cotización aprobada y rider técnico, cuando aplique.',
  jurisdiccion: 'Santiago de los Caballeros',
  lugar_firma: 'Santiago de los Caballeros, República Dominicana',
  fecha_contrato: new Date().toISOString().slice(0, 10),

  destinatario_email: '',
};

function joinAddress(...parts) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
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

function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

export default function Documentos({
  workspaceId,
  workspace,
  esArtista,
  goBack,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modo, setModo] = useState('lista');
  const [documentSection, setDocumentSection] = useState('contratos');
  const [riderInitialMode, setRiderInitialMode] = useState('lista');
  const [cargando, setCargando] = useState(true);
  const [cargandoCotizacion, setCargandoCotizacion] =
    useState(false);
  const [generando, setGenerando] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);
  const [enviandoId, setEnviandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState('');

  const [contratoEnvio, setContratoEnvio] = useState(null);
  const [contratoEliminar, setContratoEliminar] = useState(null);
  const [palabraEliminar, setPalabraEliminar] = useState('');
  const [confirmacionEliminar, setConfirmacionEliminar] = useState('');
  const [emailForm, setEmailForm] = useState({
    destinatario: '',
    asunto: '',
    mensaje: '',
  });

  useEffect(() => {
    if (!workspaceId) {
      setCargando(false);
      return;
    }

    cargarTodo();
  }, [workspaceId]);

  async function cargarTodo() {
    try {
      setCargando(true);
      setError('');
      setCotizacion(null);
      setForm(EMPTY_FORM);
      setModo('lista');

      const [quotesData, contractsData, profileData] =
        await Promise.all([
          getEligibleContractQuotes(workspaceId),
          getWorkspaceContracts(workspaceId),
          getMyBusinessProfile(workspaceId),
        ]);

      setCotizaciones(quotesData);
      setContratos(contractsData);
      setBusinessProfile(profileData);
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo cargar el módulo de Documentos.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }

  function cambiar(event) {
    const { name, value } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));

    setError('');
  }

  async function seleccionarCotizacion(event) {
    const quoteId = event.target.value;

    setForm((actual) => ({
      ...actual,
      cotizacion_id: quoteId,
    }));

    setCotizacion(null);
    setError('');

    if (!quoteId) return;

    try {
      setCargandoCotizacion(true);

      const data = await getCotizacionById(
        quoteId,
        workspaceId
      );

      const cliente = data.clientes || {};
      const profile =
        businessProfile ||
        data.perfil_negocio_snapshot ||
        {};

      const eventDate = data.fecha_evento || '';

      const advanceDays = Number(
        profile.dias_anticipo_contrato ?? 30
      );

      const balanceDays = Number(
        profile.dias_saldo_contrato ?? 7
      );

      setCotizacion(data);

      setForm({
        ...EMPTY_FORM,
        cotizacion_id: String(data.id),

        identificacion_contratante:
          cliente.rnc || cliente.identificacion || '',

        direccion_contratante:
          cliente.direccion || '',

        representante_contratante:
          cliente.nombre || '',

        calidad_contratante:
          cliente.empresa
            ? `en representación de ${cliente.empresa}`
            : 'en nombre propio',

        hora_prueba_sonido:
          data.hora_montaje || '',

        cantidad_sets: Number(
          profile.cantidad_sets_contrato ?? 2
        ),

        duracion_set: Number(
          profile.duracion_set_contrato ?? 45
        ),

        duracion_receso: Number(
          profile.duracion_receso_contrato ?? 30
        ),

        cantidad_personal: Number(
          data.cantidad_musicos || 1
        ),

        servicios_incluidos:
          profile.servicios_incluidos_contrato ||
          [
            'Presentación artística',
            data.incluye_sonido
              ? 'equipos de sonido y personal técnico'
              : '',
          ]
            .filter(Boolean)
            .join(', '),

        servicios_excluidos:
          profile.servicios_excluidos_contrato ||
          (data.incluye_sonido
            ? 'DJ, luces, tarima y energía eléctrica, salvo que se indiquen expresamente.'
            : 'Equipos de sonido, luces, tarima, DJ y energía eléctrica.'),

        hospitalidad:
          profile.hospitalidad_contrato ||
          'Área privada y segura, agua potable, hielo, vasos, servilletas y alimentación para el equipo cuando corresponda por horario o traslado.',

        transporte_hospedaje:
          profile.transporte_hospedaje_contrato ||
          'Según lo incluido en la cotización y las coordinaciones escritas entre las partes.',

        porcentaje_adelanto: Number(
          profile.porcentaje_adelanto ?? 50
        ),

        fecha_limite_anticipo:
          subtractDays(eventDate, advanceDays),

        fecha_limite_saldo:
          subtractDays(eventDate, balanceDays),

        tarifa_hora_extra: Number(
          profile.tarifa_hora_extra_contrato ?? 0
        ),

        dias_cancelacion: Number(
          profile.dias_cancelacion_contrato ?? 14
        ),

        condiciones_especiales:
          data.observaciones ||
          'Ninguna.',

        anexos:
          profile.anexos_contrato ||
          'Cotización aprobada y rider técnico, cuando aplique.',

        jurisdiccion:
          profile.jurisdiccion_contrato ||
          profile.ciudad ||
          'Santiago de los Caballeros',

        lugar_firma:
          profile.lugar_firma_contrato ||
          joinAddress(
            profile.ciudad,
            profile.pais
          ) ||
          'Santiago de los Caballeros, República Dominicana',

        fecha_contrato:
          new Date().toISOString().slice(0, 10),

        destinatario_email:
          cliente.email || '',
      });
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo cargar la cotización seleccionada.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setCargandoCotizacion(false);
    }
  }

  const previewData = useMemo(() => {
    if (!cotizacion) return null;

    const cliente = cotizacion.clientes || {};
    const zona = cotizacion.provincias || {};
    const quoteProfile =
      cotizacion.perfil_negocio_snapshot || {};
    const profile = businessProfile || quoteProfile;

    const nombreArtista =
      cotizacion.artista_nombre_snapshot ||
      cotizacion.artista_snapshot?.nombre ||
      workspace?.workspace_name ||
      'Artista';

    const artistAddress = joinAddress(
      quoteProfile.direccion || profile.direccion,
      quoteProfile.ciudad || profile.ciudad,
      quoteProfile.pais || profile.pais,
      quoteProfile.codigo_postal || profile.codigo_postal
    );

    const total = Number(cotizacion.total || 0);
    const advancePercent = Number(
      form.porcentaje_adelanto || 0
    );
    const advanceAmount =
      total * (advancePercent / 100);
    const balanceAmount =
      total - advanceAmount;

    const soundCondition = cotizacion.incluye_sonido
      ? 'Incluido por EL ARTISTA según el alcance económico de la cotización.'
      : 'Será provisto y coordinado por EL CONTRATANTE conforme al rider técnico.';

    const paymentInstructions = [
      profile.nombre_banco
        ? `transferencia a ${profile.nombre_banco}`
        : '',
      profile.cuenta_bancaria
        ? `cuenta ${profile.cuenta_bancaria}`
        : '',
      profile.nombre_completo
        ? `a nombre de ${profile.nombre_completo}`
        : '',
      profile.identificacion
        ? `identificación ${profile.identificacion}`
        : '',
    ]
      .filter(Boolean)
      .join(', ');

    const variables = {
      nombre_legal_artista:
        quoteProfile.nombre_completo ||
        profile.nombre_completo ||
        nombreArtista,

      identificacion_artista:
        quoteProfile.identificacion ||
        profile.identificacion ||
        'No especificada',

      direccion_artista:
        artistAddress || 'No especificada',

      nombre_artista: nombreArtista,

      nombre_contratante:
        cliente.nombre || 'No especificado',

      identificacion_contratante:
        form.identificacion_contratante,

      calidad_contratante:
        form.calidad_contratante,

      empresa_contratante:
        cliente.empresa || 'No aplica',

      direccion_contratante:
        form.direccion_contratante,

      numero_cotizacion:
        cotizacion.numero || `#${cotizacion.id}`,

      nombre_evento:
        cotizacion.nombre_evento ||
        cotizacion.tipo_evento ||
        'Evento',

      tipo_evento:
        cotizacion.tipo_evento ||
        cotizacion.tipo_evento_nombre_snapshot ||
        'No especificado',

      fecha_evento:
        formatDateLong(cotizacion.fecha_evento),

      venue: cotizacion.venue,

      direccion_evento:
        cotizacion.direccion_evento,

      zona_evento:
        zona.nombre ||
        cotizacion.zona_nombre_snapshot,

      formato:
        cotizacion.formato_nombre_snapshot ||
        cotizacion.formato_snapshot?.nombre ||
        `${cotizacion.cantidad_musicos || 1} músico(s)`,

      cantidad_musicos:
        cotizacion.cantidad_musicos || 1,

      cantidad_personal:
        form.cantidad_personal,

      hora_montaje:
        formatTime(cotizacion.hora_montaje),

      hora_prueba_sonido:
        formatTime(form.hora_prueba_sonido),

      hora_inicio:
        formatTime(cotizacion.hora_inicio),

      hora_fin:
        formatTime(cotizacion.hora_fin),

      cantidad_sets:
        form.cantidad_sets,

      duracion_set:
        form.duracion_set,

      duracion_receso:
        form.duracion_receso,

      monto_total:
        formatMoney(total),

      monto_total_letras:
        moneyToWords(total),

      porcentaje_adelanto:
        advancePercent,

      monto_anticipo:
        formatMoney(advanceAmount),

      monto_saldo:
        formatMoney(balanceAmount),

      fecha_limite_anticipo:
        formatDateLong(form.fecha_limite_anticipo),

      fecha_limite_saldo:
        formatDateLong(form.fecha_limite_saldo),

      instrucciones_pago:
        paymentInstructions ||
        'el medio de pago acordado por escrito entre las partes',

      condicion_sonido:
        soundCondition,

      servicios_incluidos:
        form.servicios_incluidos,

      servicios_excluidos:
        form.servicios_excluidos,

      hospitalidad:
        form.hospitalidad,

      transporte_hospedaje:
        form.transporte_hospedaje,

      contacto_evento:
        cotizacion.contacto_evento ||
        form.representante_contratante ||
        cliente.nombre,

      telefono_contacto:
        cotizacion.telefono_contacto ||
        cliente.telefono,

      tarifa_hora_extra:
        Number(form.tarifa_hora_extra || 0) > 0
          ? formatMoney(form.tarifa_hora_extra)
          : 'el monto que las partes acuerden por escrito',

      dias_cancelacion:
        form.dias_cancelacion,

      jurisdiccion:
        form.jurisdiccion,

      condiciones_especiales:
        form.condiciones_especiales,

      anexos:
        form.anexos,

      lugar_firma:
        form.lugar_firma,

      fecha_contrato:
        formatDateLong(form.fecha_contrato),
    };

    const template =
      profile.plantilla_contrato?.trim() ||
      DEFAULT_CONTRACT_TEMPLATE;

    const clauses = renderContractTemplate(
      template,
      variables
    );

    const snapshot = {
      captured_at: new Date().toISOString(),

      quote: {
        id: cotizacion.id,
        number:
          cotizacion.numero || `#${cotizacion.id}`,
        status: cotizacion.estado,
      },

      artist: {
        workspace_id: workspaceId,
        artistic_name: nombreArtista,
        legal_name:
          quoteProfile.nombre_completo ||
          profile.nombre_completo ||
          nombreArtista,
        identification:
          quoteProfile.identificacion ||
          profile.identificacion ||
          '',
        address: artistAddress,
        phone:
          quoteProfile.telefono ||
          profile.telefono ||
          '',
        email:
          cotizacion.artista_email_snapshot ||
          workspace?.email_contacto ||
          '',
        bank:
          quoteProfile.nombre_banco ||
          profile.nombre_banco ||
          '',
        bank_account:
          quoteProfile.cuenta_bancaria ||
          profile.cuenta_bancaria ||
          '',
        signature_path:
          quoteProfile.firma_path ||
          profile.firma_path ||
          '',
        signature_url:
          quoteProfile.firma_url ||
          profile.firma_url ||
          '',
      },

      client: {
        id: cliente.id || cotizacion.cliente_id,
        name: cliente.nombre || '',
        company: cliente.empresa || '',
        identification:
          form.identificacion_contratante,
        address:
          form.direccion_contratante,
        phone: cliente.telefono || '',
        email:
          form.destinatario_email ||
          cliente.email ||
          '',
        representative:
          form.representante_contratante ||
          cliente.nombre ||
          '',
        capacity:
          form.calidad_contratante,
      },

      event: {
        name:
          cotizacion.nombre_evento ||
          cotizacion.tipo_evento ||
          '',
        type:
          cotizacion.tipo_evento ||
          cotizacion.tipo_evento_nombre_snapshot ||
          '',
        date: cotizacion.fecha_evento || '',
        venue: cotizacion.venue || '',
        address:
          cotizacion.direccion_evento || '',
        zone:
          zona.nombre ||
          cotizacion.zona_nombre_snapshot ||
          '',
        setup_time:
          cotizacion.hora_montaje || '',
        soundcheck_time:
          form.hora_prueba_sonido || '',
        start_time:
          cotizacion.hora_inicio || '',
        end_time:
          cotizacion.hora_fin || '',
        guests:
          cotizacion.invitados || null,
        contact:
          cotizacion.contacto_evento ||
          form.representante_contratante ||
          '',
        contact_phone:
          cotizacion.telefono_contacto ||
          cliente.telefono ||
          '',
        format:
          cotizacion.formato_nombre_snapshot ||
          cotizacion.formato_snapshot?.nombre ||
          '',
        musicians:
          Number(cotizacion.cantidad_musicos || 1),
        total_people:
          Number(form.cantidad_personal || 1),
        sets:
          Number(form.cantidad_sets || 1),
        set_minutes:
          Number(form.duracion_set || 0),
        break_minutes:
          Number(form.duracion_receso || 0),
        includes_sound:
          Boolean(cotizacion.incluye_sonido),
        sound_condition: soundCondition,
      },

      financial: {
        total,
        advance_percent: advancePercent,
        advance_amount: advanceAmount,
        balance_amount: balanceAmount,
        advance_due:
          form.fecha_limite_anticipo || '',
        balance_due:
          form.fecha_limite_saldo || '',
        overtime_rate:
          Number(form.tarifa_hora_extra || 0),
        payment_instructions:
          paymentInstructions,
      },

      production: {
        included_services:
          form.servicios_incluidos,
        excluded_services:
          form.servicios_excluidos,
        hospitality:
          form.hospitalidad,
        transport_and_lodging:
          form.transporte_hospedaje,
      },

      legal: {
        contract_date:
          form.fecha_contrato,
        signing_place:
          form.lugar_firma,
        jurisdiction:
          form.jurisdiccion,
        cancellation_days:
          Number(form.dias_cancelacion || 0),
        special_conditions:
          form.condiciones_especiales,
        annexes:
          form.anexos,
      },
    };

    return {
      variables,
      clauses,
      snapshot,
      total,
      advanceAmount,
      balanceAmount,
    };
  }, [
    cotizacion,
    form,
    businessProfile,
    workspace,
    workspaceId,
  ]);

  function validarContrato() {
    if (!cotizacion) {
      toast.error(
        'Selecciona una cotización confirmada o aprobada.'
      );
      return false;
    }

    if (
      !['Confirmada', 'Aprobada'].includes(
        cotizacion.estado
      )
    ) {
      toast.error(
        'Solo se puede contratar desde una cotización confirmada o aprobada.'
      );
      return false;
    }

    if (!form.representante_contratante.trim()) {
      toast.error(
        'Indica la persona que firmará por el cliente.'
      );
      return false;
    }

    if (!form.identificacion_contratante.trim()) {
      toast.error(
        'La cédula o RNC del contratante es obligatoria.'
      );
      return false;
    }

    if (!form.direccion_contratante.trim()) {
      toast.error(
        'La dirección del contratante es obligatoria.'
      );
      return false;
    }

    if (!form.fecha_limite_anticipo) {
      toast.error(
        'Indica la fecha límite del anticipo.'
      );
      return false;
    }

    if (!form.fecha_limite_saldo) {
      toast.error(
        'Indica la fecha límite del saldo.'
      );
      return false;
    }

    if (!previewData?.clauses) {
      toast.error(
        'No se pudo preparar el contenido del contrato.'
      );
      return false;
    }

    return true;
  }

  async function generarYDescargar() {
    setError('');

    if (!validarContrato()) return;

    try {
      setGenerando(true);

      let contratoGuardado = await createContract(
        {
          cotizacion_id: cotizacion.id,
          estado: 'Generado',
          datos_snapshot:
            previewData.snapshot,
          clausulas_snapshot:
            previewData.clauses,
          destinatario_email:
            form.destinatario_email,
        },
        workspaceId
      );

      const snapshotConNumero = {
        ...previewData.snapshot,
        contract: {
          id: contratoGuardado.id,
          number: contratoGuardado.numero,
          version: contratoGuardado.version,
          status: 'Generado',
        },
      };

      contratoGuardado = await updateContract(
        contratoGuardado.id,
        {
          datos_snapshot:
            snapshotConNumero,
        },
        workspaceId
      );

      const pdfBlob = await generateContractPdfBlob({
        contract: contratoGuardado,
        appLogoUrl: '/mibooking-icon.png',
      });

      const pdfPath = await uploadContractPdf(
        pdfBlob,
        contratoGuardado,
        workspaceId
      );

      contratoGuardado = await updateContract(
        contratoGuardado.id,
        {
          pdf_path: pdfPath,
          datos_snapshot:
            snapshotConNumero,
        },
        workspaceId
      );

      downloadBlob(
        pdfBlob,
        `Contrato-${contratoGuardado.numero}.pdf`
      );

      const contractsData =
        await getWorkspaceContracts(workspaceId);

      setContratos(contractsData);
      setModo('lista');
      setCotizacion(null);
      setForm(EMPTY_FORM);

      toast.success(
        'Contrato generado y descargado correctamente.'
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo generar el contrato.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setGenerando(false);
    }
  }

  async function descargarContrato(contract) {
    try {
      setDescargandoId(contract.id);
      await downloadStoredContract(contract);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message ||
          'No se pudo descargar el contrato.'
      );
    } finally {
      setDescargandoId(null);
    }
  }

  function prepararEliminacion(contract) {
    if (!esArtista) {
      toast.error(
        'Solo el Artista puede borrar contratos permanentemente.'
      );
      return;
    }

    setContratoEliminar(contract);
    setPalabraEliminar(createDeleteConfirmationWord());
    setConfirmacionEliminar('');
  }

  function cerrarEliminacion() {
    if (eliminandoId) return;

    setContratoEliminar(null);
    setPalabraEliminar('');
    setConfirmacionEliminar('');
  }

  async function confirmarEliminacion(event) {
    event.preventDefault();

    if (!contratoEliminar || !esArtista) return;

    const confirmacionCorrecta =
      confirmacionEliminar.trim().toUpperCase() ===
      palabraEliminar;

    if (!confirmacionCorrecta) {
      toast.error(
        'La palabra de confirmación no coincide.'
      );
      return;
    }

    try {
      setEliminandoId(contratoEliminar.id);

      await deleteContract(
        contratoEliminar,
        workspaceId
      );

      setContratos((actuales) =>
        actuales.filter(
          (contract) =>
            contract.id !== contratoEliminar.id
        )
      );

      setContratoEliminar(null);
      setPalabraEliminar('');
      setConfirmacionEliminar('');

      toast.success(
        'Contrato eliminado permanentemente.'
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo eliminar el contrato.'
      );
    } finally {
      setEliminandoId(null);
    }
  }

  function prepararEnvio(contract) {
    const snapshot = contract.datos_snapshot || {};
    const client = snapshot.client || {};
    const artist = snapshot.artist || {};
    const event = snapshot.event || {};

    const recipient =
      contract.destinatario_email ||
      client.email ||
      '';

    setContratoEnvio(contract);
    setEmailForm({
      destinatario: recipient,
      asunto:
        `Contrato ${contract.numero} - ` +
        `${artist.artistic_name || workspace?.workspace_name || 'Artista'}`,
      mensaje:
        `Hola ${client.representative || client.name || ''},\n\n` +
        `Adjuntamos el contrato correspondiente al evento ` +
        `${event.name || event.type || ''}, programado para el ` +
        `${formatDateLong(event.date)}.\n\n` +
        `Por favor, revísalo y comunícate con nosotros si necesitas alguna aclaración.\n\n` +
        `Atentamente,\n${artist.artistic_name || workspace?.workspace_name || 'MiBooking'}`,
    });
  }

  async function enviarCorreo(event) {
    event.preventDefault();

    if (!contratoEnvio) return;

    if (!isValidEmail(emailForm.destinatario)) {
      toast.error(
        'Escribe un correo válido para el cliente.'
      );
      return;
    }

    try {
      setEnviandoId(contratoEnvio.id);

      await sendContractByEmail({
        contractId: contratoEnvio.id,
        workspaceId,
        recipient:
          emailForm.destinatario,
        subject: emailForm.asunto,
        message: emailForm.mensaje,
      });

      const contractsData =
        await getWorkspaceContracts(workspaceId);

      setContratos(contractsData);
      setContratoEnvio(null);

      toast.success(
        'Contrato enviado por correo correctamente.'
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo enviar el contrato.'
      );
    } finally {
      setEnviandoId(null);
    }
  }

  if (documentSection === 'riders') {
    return (
      <Riders
        workspaceId={workspaceId}
        workspace={workspace}
        esArtista={esArtista}
        goBack={goBack}
        initialMode={riderInitialMode}
        goContracts={() => {
          setDocumentSection('contratos');
          setRiderInitialMode('lista');
        }}
      />
    );
  }

  if (cargando) {
    return (
      <div className="dashboard documentos-page">
        Cargando documentos...
      </div>
    );
  }

  return (
    <div className="dashboard documentos-page">
      <div className="top-bar">
        <div>
          <h1>Documentos</h1>

          <p>
            Contratos de {workspace?.workspace_name || 'Artista'}
            {' · '}
            {esArtista ? 'Cuenta de Artista' : 'Cuenta de Gestor'}
          </p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <div className="documentos-section-tabs">
        <button type="button" className="active">
          Contratos
        </button>

        <button
          type="button"
          onClick={() => {
            setRiderInitialMode('lista');
            setDocumentSection('riders');
          }}
        >
          Riders técnicos
        </button>
      </div>

      <div className="documentos-toolbar">
        <button
          type="button"
          className={modo === 'lista' ? 'active' : ''}
          onClick={() => setModo('lista')}
        >
          Contratos generados
        </button>

        <button
          type="button"
          className={modo === 'generar' ? 'active' : ''}
          onClick={() => {
            setModo('generar');
            setCotizacion(null);
            setForm(EMPTY_FORM);
          }}
        >
          + Generar contrato
        </button>

      </div>

      {error && (
        <p className="error documentos-error">
          {error}
        </p>
      )}

      {modo === 'lista' ? (
        <section className="documentos-listado">
          {contratos.length === 0 ? (
            <div className="documentos-empty">
              <h2>No hay contratos generados</h2>
              <p>
                Selecciona una cotización confirmada o aprobada
                para crear el primer contrato.
              </p>

              <button
                type="button"
                onClick={() => setModo('generar')}
              >
                Generar contrato
              </button>
            </div>
          ) : (
            contratos.map((contract) => {
              const quote = contract.cotizaciones || {};
              const client = quote.clientes || {};
              const snapshot = contract.datos_snapshot || {};
              const event = snapshot.event || {};

              return (
                <article
                  className="documento-card"
                  key={contract.id}
                >
                  <div className="documento-card-main">
                    <div className="documento-numero">
                      <span>Contrato</span>
                      <strong>{contract.numero}</strong>
                    </div>

                    <div className="documento-identidad">
                      <strong>
                        {client.nombre ||
                          snapshot.client?.name ||
                          'Cliente'}
                      </strong>

                      <span>
                        {event.name ||
                          quote.nombre_evento ||
                          quote.tipo_evento ||
                          'Evento'}
                      </span>

                      <small>
                        {formatDateLong(
                          event.date ||
                            quote.fecha_evento
                        )}
                        {' · '}
                        {event.venue ||
                          quote.venue ||
                          'Lugar pendiente'}
                      </small>
                    </div>

                    <div className="documento-cotizacion">
                      <span>Cotización</span>
                      <strong>
                        {quote.numero ||
                          snapshot.quote?.number ||
                          'N/A'}
                      </strong>
                    </div>

                    <div className="documento-version">
                      <span>Versión</span>
                      <strong>
                        {contract.version || 1}
                      </strong>
                    </div>

                    <div>
                      <span
                        className={
                          `documento-status ` +
                          `status-${statusClass(contract.estado)}`
                        }
                      >
                        {contract.estado}
                      </span>
                    </div>
                  </div>

                  <div className="documento-card-actions">
                    <button
                      type="button"
                      disabled={
                        descargandoId === contract.id ||
                        !contract.pdf_path
                      }
                      onClick={() =>
                        descargarContrato(contract)
                      }
                    >
                      {descargandoId === contract.id
                        ? 'Preparando...'
                        : 'Descargar PDF'}
                    </button>

                    <button
                      type="button"
                      disabled={!contract.pdf_path}
                      onClick={() =>
                        prepararEnvio(contract)
                      }
                    >
                      Enviar por correo
                    </button>


                    {esArtista && (
                      <button
                        type="button"
                        className="documento-delete-button"
                        disabled={
                          eliminandoId === contract.id
                        }
                        onClick={() =>
                          prepararEliminacion(contract)
                        }
                      >
                        {eliminandoId === contract.id
                          ? 'Eliminando...'
                          : 'Borrar contrato'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : (
        <div className="documentos-generator-grid">
          <form
            className="form-cotizacion documentos-form"
            onSubmit={(event) => {
              event.preventDefault();
              generarYDescargar();
            }}
          >
            <section className="form-section form-full">
              <h2>Cotización de referencia</h2>

              <label htmlFor="documento-cotizacion">
                Cotización confirmada o aprobada *
              </label>

              <select
                id="documento-cotizacion"
                name="cotizacion_id"
                value={form.cotizacion_id}
                onChange={seleccionarCotizacion}
              >
                <option value="">
                  Seleccionar cotización
                </option>

                {cotizaciones.map((quote) => (
                  <option
                    key={quote.id}
                    value={quote.id}
                  >
                    {quote.numero || `#${quote.id}`}
                    {' · '}
                    {quote.clientes?.nombre || 'Cliente'}
                    {' · '}
                    {quote.nombre_evento ||
                      quote.tipo_evento ||
                      'Evento'}
                    {' · '}
                    {formatDateLong(quote.fecha_evento)}
                  </option>
                ))}
              </select>

              {cotizaciones.length === 0 && (
                <p className="documentos-help">
                  No existen cotizaciones con estado Confirmada
                  o Aprobada para este Artista.
                </p>
              )}

              {cargandoCotizacion && (
                <p className="documentos-help">
                  Cargando información de la cotización...
                </p>
              )}
            </section>

            {cotizacion && (
              <>
                <section className="form-section">
                  <h2>Contratante</h2>

                  <label>
                    Persona que firmará *
                  </label>
                  <input
                    type="text"
                    name="representante_contratante"
                    value={form.representante_contratante}
                    onChange={cambiar}
                  />

                  <label>
                    Cédula o RNC *
                  </label>
                  <input
                    type="text"
                    name="identificacion_contratante"
                    value={form.identificacion_contratante}
                    onChange={cambiar}
                  />

                  <label>
                    Dirección legal *
                  </label>
                  <input
                    type="text"
                    name="direccion_contratante"
                    value={form.direccion_contratante}
                    onChange={cambiar}
                  />

                  <label>
                    Calidad o representación
                  </label>
                  <input
                    type="text"
                    name="calidad_contratante"
                    value={form.calidad_contratante}
                    onChange={cambiar}
                    placeholder="Ej: en representación de la empresa"
                  />

                  <label>
                    Correo para enviar el contrato
                  </label>
                  <input
                    type="email"
                    name="destinatario_email"
                    value={form.destinatario_email}
                    onChange={cambiar}
                  />
                </section>

                <section className="form-section">
                  <h2>Presentación</h2>

                  <label>
                    Hora de prueba de sonido
                  </label>
                  <input
                    type="time"
                    name="hora_prueba_sonido"
                    value={form.hora_prueba_sonido}
                    onChange={cambiar}
                  />

                  <div className="documentos-mini-grid">
                    <div>
                      <label>Sets</label>
                      <input
                        type="number"
                        min="1"
                        name="cantidad_sets"
                        value={form.cantidad_sets}
                        onChange={cambiar}
                      />
                    </div>

                    <div>
                      <label>Minutos por set</label>
                      <input
                        type="number"
                        min="1"
                        name="duracion_set"
                        value={form.duracion_set}
                        onChange={cambiar}
                      />
                    </div>

                    <div>
                      <label>Minutos de receso</label>
                      <input
                        type="number"
                        min="0"
                        name="duracion_receso"
                        value={form.duracion_receso}
                        onChange={cambiar}
                      />
                    </div>

                    <div>
                      <label>Personas del equipo</label>
                      <input
                        type="number"
                        min="1"
                        name="cantidad_personal"
                        value={form.cantidad_personal}
                        onChange={cambiar}
                      />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h2>Pago y cancelación</h2>

                  <label>Anticipo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="porcentaje_adelanto"
                    value={form.porcentaje_adelanto}
                    onChange={cambiar}
                  />

                  <label>
                    Fecha límite del anticipo *
                  </label>
                  <input
                    type="date"
                    name="fecha_limite_anticipo"
                    value={form.fecha_limite_anticipo}
                    onChange={cambiar}
                  />

                  <label>
                    Fecha límite del saldo *
                  </label>
                  <input
                    type="date"
                    name="fecha_limite_saldo"
                    value={form.fecha_limite_saldo}
                    onChange={cambiar}
                  />

                  <label>
                    Tarifa por hora adicional
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="tarifa_hora_extra"
                    value={form.tarifa_hora_extra}
                    onChange={cambiar}
                  />

                  <label>
                    Ventana de cancelación (días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="dias_cancelacion"
                    value={form.dias_cancelacion}
                    onChange={cambiar}
                  />
                </section>

                <section className="form-section">
                  <h2>Firma y jurisdicción</h2>

                  <label>
                    Fecha del contrato
                  </label>
                  <input
                    type="date"
                    name="fecha_contrato"
                    value={form.fecha_contrato}
                    onChange={cambiar}
                  />

                  <label>
                    Lugar de firma
                  </label>
                  <input
                    type="text"
                    name="lugar_firma"
                    value={form.lugar_firma}
                    onChange={cambiar}
                  />

                  <label>
                    Jurisdicción
                  </label>
                  <input
                    type="text"
                    name="jurisdiccion"
                    value={form.jurisdiccion}
                    onChange={cambiar}
                  />

                  <label>
                    Anexos
                  </label>
                  <textarea
                    name="anexos"
                    value={form.anexos}
                    onChange={cambiar}
                    rows="4"
                  />
                </section>

                <section className="form-section form-full">
                  <h2>Producción y logística</h2>

                  <label>Servicios incluidos</label>
                  <textarea
                    name="servicios_incluidos"
                    value={form.servicios_incluidos}
                    onChange={cambiar}
                    rows="4"
                  />

                  <label>Servicios excluidos</label>
                  <textarea
                    name="servicios_excluidos"
                    value={form.servicios_excluidos}
                    onChange={cambiar}
                    rows="4"
                  />

                  <label>Hospitalidad</label>
                  <textarea
                    name="hospitalidad"
                    value={form.hospitalidad}
                    onChange={cambiar}
                    rows="4"
                  />

                  <label>Transporte y hospedaje</label>
                  <textarea
                    name="transporte_hospedaje"
                    value={form.transporte_hospedaje}
                    onChange={cambiar}
                    rows="4"
                  />

                  <label>Condiciones especiales</label>
                  <textarea
                    name="condiciones_especiales"
                    value={form.condiciones_especiales}
                    onChange={cambiar}
                    rows="6"
                  />
                </section>

                <div className="form-actions documentos-form-actions">
                  <button
                    type="submit"
                    disabled={generando}
                  >
                    {generando
                      ? 'Generando contrato...'
                      : 'Generar y descargar PDF'}
                  </button>
                </div>
              </>
            )}
          </form>

          <aside className="documento-preview-panel">
            <div className="documento-preview-paper">
              <header className="documento-preview-header">
                <img
                  src="/mibooking-icon.png"
                  alt="MiBooking"
                />

                <div>
                  <strong>MiBooking</strong>
                  <span>Música · Eventos · Negocio</span>
                </div>
              </header>

              {!previewData ? (
                <div className="documento-preview-empty">
                  Selecciona una cotización para generar la
                  vista previa del contrato.
                </div>
              ) : (
                <>
                  <h2>
                    Contrato de presentación artística
                  </h2>

                  <div className="documento-preview-summary">
                    <p>
                      <strong>Artista:</strong>{' '}
                      {previewData.snapshot.artist
                        .artistic_name}
                    </p>

                    <p>
                      <strong>Contratante:</strong>{' '}
                      {previewData.snapshot.client.name}
                    </p>

                    <p>
                      <strong>Evento:</strong>{' '}
                      {previewData.snapshot.event.name}
                    </p>

                    <p>
                      <strong>Fecha:</strong>{' '}
                      {formatDateLong(
                        previewData.snapshot.event.date
                      )}
                    </p>

                    <p>
                      <strong>Total:</strong>{' '}
                      {formatMoney(previewData.total)}
                    </p>

                    <p>
                      <strong>Anticipo:</strong>{' '}
                      {formatMoney(
                        previewData.advanceAmount
                      )}
                    </p>

                    <p>
                      <strong>Saldo:</strong>{' '}
                      {formatMoney(
                        previewData.balanceAmount
                      )}
                    </p>
                  </div>

                  <div className="documento-preview-clauses">
                    {previewData.clauses
                      .split(/\n{2,}/)
                      .slice(0, 8)
                      .map((paragraph, index) => (
                        <p key={index}>
                          {text(paragraph)}
                        </p>
                      ))}
                  </div>

                  <small>
                    La descarga incluirá todas las cláusulas,
                    anexos y espacios de firma.
                  </small>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {contratoEliminar && (
        <div
          className="documentos-modal-backdrop"
          onClick={cerrarEliminacion}
        >
          <form
            className="documentos-delete-modal"
            onSubmit={confirmarEliminacion}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="documentos-delete-icon" aria-hidden="true">
              !
            </div>

            <h2>Eliminar contrato permanentemente</h2>

            <p>
              Vas a borrar <strong>{contratoEliminar.numero}</strong>{' '}
              de la lista y también su archivo PDF almacenado.
              Esta acción no se puede deshacer.
            </p>

            {contratoEliminar.estado === 'Enviado' && (
              <p className="documentos-delete-warning">
                Este contrato fue enviado anteriormente. Borrarlo de
                MiBooking no retira las copias que ya hayan sido
                recibidas por correo.
              </p>
            )}

            {contratoEliminar.estado === 'Firmado' && (
              <p className="documentos-delete-warning">
                Este contrato está marcado como firmado. Verifica que
                conservas cualquier copia legal necesaria antes de
                eliminarlo.
              </p>
            )}

            <label htmlFor="documento-confirmar-eliminacion">
              Para confirmar, escribe exactamente:
            </label>

            <strong className="documentos-delete-word">
              {palabraEliminar}
            </strong>

            <input
              id="documento-confirmar-eliminacion"
              type="text"
              value={confirmacionEliminar}
              onChange={(event) =>
                setConfirmacionEliminar(event.target.value)
              }
              autoComplete="off"
              spellCheck="false"
              autoFocus
              placeholder="Escribe la palabra indicada"
            />

            <div className="documentos-delete-actions">
              <button
                type="button"
                onClick={cerrarEliminacion}
                disabled={eliminandoId === contratoEliminar.id}
              >
                Conservar contrato
              </button>

              <button
                type="submit"
                className="confirm-delete-button"
                disabled={
                  eliminandoId === contratoEliminar.id ||
                  confirmacionEliminar.trim().toUpperCase() !==
                    palabraEliminar
                }
              >
                {eliminandoId === contratoEliminar.id
                  ? 'Eliminando...'
                  : 'Eliminar permanentemente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {contratoEnvio && (
        <div
          className="documentos-modal-backdrop"
          onClick={() => setContratoEnvio(null)}
        >
          <form
            className="documentos-email-modal"
            onSubmit={enviarCorreo}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Enviar contrato por correo</h2>

            <p>
              Se adjuntará el PDF de{' '}
              <strong>{contratoEnvio.numero}</strong>.
            </p>

            <label>Destinatario</label>
            <input
              type="email"
              value={emailForm.destinatario}
              onChange={(event) =>
                setEmailForm((actual) => ({
                  ...actual,
                  destinatario: event.target.value,
                }))
              }
              required
            />

            <label>Asunto</label>
            <input
              type="text"
              value={emailForm.asunto}
              onChange={(event) =>
                setEmailForm((actual) => ({
                  ...actual,
                  asunto: event.target.value,
                }))
              }
              required
            />

            <label>Mensaje</label>
            <textarea
              rows="9"
              value={emailForm.mensaje}
              onChange={(event) =>
                setEmailForm((actual) => ({
                  ...actual,
                  mensaje: event.target.value,
                }))
              }
            />

            <div className="documentos-email-actions">
              <button
                type="button"
                onClick={() => setContratoEnvio(null)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={enviandoId === contratoEnvio.id}
              >
                {enviandoId === contratoEnvio.id
                  ? 'Enviando...'
                  : 'Enviar contrato'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
