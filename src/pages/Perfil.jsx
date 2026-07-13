import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DEFAULT_BUSINESS_POLICIES_TEMPLATE,
  DEFAULT_CONTRACT_SETTINGS,
  DEFAULT_CONTRACT_TEMPLATE,
  getMyBusinessProfile,
  getMyProfile,
  getWorkspaceArtistProfile,
  saveMyBusinessProfile,
  saveMyPersonalProfile,
  saveWorkspaceArtistProfile,
  uploadMyBusinessAsset,
} from '../lib/profileService';
import { CONTRACT_VARIABLES } from '../lib/contratoTemplate';
import { updateCurrentPassword } from '../lib/authService';

const MAX_PNG_SIZE = 5 * 1024 * 1024;

const formInicial = {
  nombre_artistico: '',
  email_artistico: '',
  telefono_artistico: '',
  spotify_url: '',
  prefijo_cotizacion: '',

  nombre_completo: '',
  direccion: '',
  ciudad: '',
  pais: 'República Dominicana',
  codigo_postal: '',
  telefono: '',
  identificacion: '',
  cuenta_bancaria: '',
  nombre_banco: '',
  porcentaje_adelanto: 50,
  condiciones_pago:
    DEFAULT_BUSINESS_POLICIES_TEMPLATE,

  ...DEFAULT_CONTRACT_SETTINGS,

  logo_path: '',
  firma_path: '',
};

const uploaderGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 18,
};

const uploaderCardStyle = {
  border:
    '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 16,
  padding: 16,
  background:
    'rgba(255, 255, 255, 0.02)',
};

const previewStyle = {
  width: '100%',
  minHeight: 170,
  marginTop: 12,
  padding: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: 12,
  background: '#ffffff',
  border:
    '1px dashed rgba(148, 163, 184, 0.55)',
};

const variablesStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 10,
  marginBottom: 14,
};

const variableStyle = {
  padding: '5px 8px',
  borderRadius: 8,
  background:
    'rgba(59, 130, 246, 0.1)',
  border:
    '1px solid rgba(59, 130, 246, 0.2)',
  fontSize: 12,
};

const VARIABLES_POLITICAS = [
  '{{nombre_completo}}',
  '{{identificacion}}',
  '{{nombre_banco}}',
  '{{cuenta_bancaria}}',
  '{{porcentaje_adelanto}}',
  '{{porcentaje_restante}}',
  '{{telefono}}',
  '{{direccion}}',
  '{{ciudad}}',
  '{{pais}}',
  '{{codigo_postal}}',
];

export default function Perfil({
  workspaceId,
  workspace,
  esArtista,
  goBack,
  goEquipo,
  onProfileUpdated,
}) {
  const [form, setForm] = useState(formInicial);
  const [profile, setProfile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [firmaFile, setFirmaFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [firmaPreview, setFirmaPreview] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoPassword, setGuardandoPassword] =
    useState(false);
  const [nuevaPassword, setNuevaPassword] =
    useState('');
  const [confirmarPassword, setConfirmarPassword] =
    useState('');
  const [error, setError] = useState('');

  const logoInputRef = useRef(null);
  const firmaInputRef = useRef(null);

  const esPerfilArtista = Boolean(
    esArtista || workspace?.member_role === 'owner'
  );

  const puedeEditar = esPerfilArtista;

  useEffect(() => {
    if (
      !workspaceId &&
      esPerfilArtista
    ) {
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId, esPerfilArtista]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  useEffect(() => {
    return () => {
      if (firmaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(firmaPreview);
      }
    };
  }, [firmaPreview]);

  async function cargar() {
    try {
      setCargando(true);
      setError('');

      if (!esPerfilArtista) {
        const perfilUsuario =
          await getMyProfile();

        setProfile(perfilUsuario);

        setForm({
          ...formInicial,
          nombre_completo:
            perfilUsuario?.nombre || '',
          direccion:
            perfilUsuario?.direccion || '',
          ciudad:
            perfilUsuario?.ciudad || '',
          pais:
            perfilUsuario?.pais ||
            'República Dominicana',
          codigo_postal:
            perfilUsuario?.codigo_postal || '',
          telefono:
            perfilUsuario?.telefono || '',
          identificacion:
            perfilUsuario?.identificacion || '',
          nombre_banco:
            perfilUsuario?.nombre_banco || '',
          cuenta_bancaria:
            perfilUsuario?.cuenta_bancaria || '',
        });

        setLogoPreview('');
        setFirmaPreview('');
        return;
      }

      const [
        perfilUsuario,
        perfilArtistico,
        perfilNegocio,
      ] = await Promise.all([
        getMyProfile(),
        getWorkspaceArtistProfile(workspaceId),
        getMyBusinessProfile(workspaceId),
      ]);

      setProfile(perfilUsuario);

      setForm({
        ...formInicial,
        ...perfilNegocio,

        nombre_artistico:
          perfilArtistico?.nombre_artistico ||
          workspace?.workspace_name ||
          '',

        email_artistico:
          perfilArtistico?.email_artistico || '',

        telefono_artistico:
          perfilArtistico?.telefono_artistico || '',

        spotify_url:
          perfilArtistico?.spotify_url || '',

        prefijo_cotizacion:
          perfilArtistico?.prefijo_cotizacion || '',

        nombre_completo:
          perfilNegocio?.nombre_completo ||
          perfilUsuario?.nombre ||
          '',

        porcentaje_adelanto: Number(
          perfilNegocio?.porcentaje_adelanto ?? 50
        ),

        condiciones_pago:
          perfilNegocio?.condiciones_pago?.trim() ||
          DEFAULT_BUSINESS_POLICIES_TEMPLATE,

        plantilla_contrato:
          perfilNegocio?.plantilla_contrato?.trim() ||
          DEFAULT_CONTRACT_TEMPLATE,

        cantidad_sets_contrato: Number(
          perfilNegocio?.cantidad_sets_contrato ??
          DEFAULT_CONTRACT_SETTINGS.cantidad_sets_contrato
        ),

        duracion_set_contrato: Number(
          perfilNegocio?.duracion_set_contrato ??
          DEFAULT_CONTRACT_SETTINGS.duracion_set_contrato
        ),

        duracion_receso_contrato: Number(
          perfilNegocio?.duracion_receso_contrato ??
          DEFAULT_CONTRACT_SETTINGS.duracion_receso_contrato
        ),

        dias_anticipo_contrato: Number(
          perfilNegocio?.dias_anticipo_contrato ??
          DEFAULT_CONTRACT_SETTINGS.dias_anticipo_contrato
        ),

        dias_saldo_contrato: Number(
          perfilNegocio?.dias_saldo_contrato ??
          DEFAULT_CONTRACT_SETTINGS.dias_saldo_contrato
        ),

        tarifa_hora_extra_contrato: Number(
          perfilNegocio?.tarifa_hora_extra_contrato ??
          DEFAULT_CONTRACT_SETTINGS.tarifa_hora_extra_contrato
        ),

        dias_cancelacion_contrato: Number(
          perfilNegocio?.dias_cancelacion_contrato ??
          DEFAULT_CONTRACT_SETTINGS.dias_cancelacion_contrato
        ),

        servicios_incluidos_contrato:
          perfilNegocio?.servicios_incluidos_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.servicios_incluidos_contrato,

        servicios_excluidos_contrato:
          perfilNegocio?.servicios_excluidos_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.servicios_excluidos_contrato,

        hospitalidad_contrato:
          perfilNegocio?.hospitalidad_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.hospitalidad_contrato,

        transporte_hospedaje_contrato:
          perfilNegocio?.transporte_hospedaje_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.transporte_hospedaje_contrato,

        jurisdiccion_contrato:
          perfilNegocio?.jurisdiccion_contrato?.trim() ||
          perfilNegocio?.ciudad ||
          DEFAULT_CONTRACT_SETTINGS.jurisdiccion_contrato,

        lugar_firma_contrato:
          perfilNegocio?.lugar_firma_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.lugar_firma_contrato,

        anexos_contrato:
          perfilNegocio?.anexos_contrato?.trim() ||
          DEFAULT_CONTRACT_SETTINGS.anexos_contrato,

        logo_path:
          perfilNegocio?.logo_path || '',

        firma_path:
          perfilNegocio?.firma_path || '',
      });

      setLogoPreview(
        perfilNegocio?.logo_url || ''
      );

      setFirmaPreview(
        perfilNegocio?.firma_url || ''
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        `No se pudo cargar el perfil ${
          esPerfilArtista
            ? 'del Artista'
            : 'de la cuenta'
        }.`;

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

  function restaurarPoliticas() {
    const confirmar = window.confirm(
      '¿Restaurar la plantilla recomendada de políticas y condiciones?'
    );

    if (!confirmar) return;

    setForm((actual) => ({
      ...actual,
      condiciones_pago:
        DEFAULT_BUSINESS_POLICIES_TEMPLATE,
    }));
  }

  function restaurarPlantillaContrato() {
    const confirmar = window.confirm(
      '¿Restaurar la plantilla contractual recomendada?'
    );

    if (!confirmar) return;

    setForm((actual) => ({
      ...actual,
      ...DEFAULT_CONTRACT_SETTINGS,
      plantilla_contrato:
        DEFAULT_CONTRACT_TEMPLATE,
    }));
  }

  function validarArchivoPng(file) {
    const esPng =
      file?.type === 'image/png' ||
      String(file?.name || '')
        .toLowerCase()
        .endsWith('.png');

    if (!esPng) {
      toast.error(
        'El archivo debe estar en formato PNG.'
      );

      return false;
    }

    if (file.size > MAX_PNG_SIZE) {
      toast.error(
        'El archivo PNG no puede superar los 5 MB.'
      );

      return false;
    }

    return true;
  }

  function seleccionarLogo(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!validarArchivoPng(file)) {
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  }

  function seleccionarFirma(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!validarArchivoPng(file)) {
      event.target.value = '';
      return;
    }

    setFirmaFile(file);
    setFirmaPreview(URL.createObjectURL(file));
    setError('');
  }

  function validar() {
    if (!form.nombre_completo.trim()) {
      toast.error(
        'El nombre completo es obligatorio.'
      );

      return false;
    }

    if (!esPerfilArtista) {
      return true;
    }

    if (!form.nombre_artistico.trim()) {
      toast.error(
        'El nombre artístico es obligatorio.'
      );

      return false;
    }

    if (
      !/^[A-Z0-9]{2,8}$/.test(
        String(
          form.prefijo_cotizacion || ''
        )
          .trim()
          .toUpperCase()
      )
    ) {
      toast.error(
        'El prefijo debe tener entre 2 y 8 letras o números, sin espacios.'
      );

      return false;
    }

    const porcentaje = Number(
      form.porcentaje_adelanto
    );

    if (
      !Number.isFinite(porcentaje) ||
      porcentaje < 0 ||
      porcentaje > 100
    ) {
      toast.error(
        'El adelanto debe estar entre 0% y 100%.'
      );

      return false;
    }

    if (!form.condiciones_pago.trim()) {
      toast.error(
        'Las políticas y condiciones no pueden estar vacías.'
      );

      return false;
    }

    if (!form.plantilla_contrato.trim()) {
      toast.error(
        'La plantilla del contrato no puede estar vacía.'
      );

      return false;
    }

    const numericContractFields = [
      ['cantidad_sets_contrato', 1, null, 'La cantidad de sets'],
      ['duracion_set_contrato', 1, null, 'La duración de cada set'],
      ['duracion_receso_contrato', 0, null, 'La duración del receso'],
      ['dias_anticipo_contrato', 0, null, 'Los días del anticipo'],
      ['dias_saldo_contrato', 0, null, 'Los días del saldo'],
      ['tarifa_hora_extra_contrato', 0, null, 'La tarifa por hora adicional'],
      ['dias_cancelacion_contrato', 0, null, 'La ventana de cancelación'],
    ];

    for (const [field, min, max, label] of numericContractFields) {
      const value = Number(form[field]);

      if (
        !Number.isFinite(value) ||
        value < min ||
        (max !== null && value > max)
      ) {
        toast.error(`${label} no es válida.`);
        return false;
      }
    }

    return true;
  }

  async function guardar(event) {
    event.preventDefault();
    setError('');

    if (!validar()) return;

    if (!esPerfilArtista) {
      try {
        setGuardando(true);

        const perfilGuardado =
          await saveMyPersonalProfile({
            nombre_completo:
              form.nombre_completo,
            telefono: form.telefono,
            direccion: form.direccion,
            ciudad: form.ciudad,
            pais: form.pais,
            codigo_postal:
              form.codigo_postal,
            identificacion:
              form.identificacion,
            nombre_banco:
              form.nombre_banco,
            cuenta_bancaria:
              form.cuenta_bancaria,
          });

        setProfile(perfilGuardado);

        if (onProfileUpdated) {
          onProfileUpdated({
            nombre_completo:
              perfilGuardado.nombre,
          });
        }

        toast.success(
          'Perfil personal actualizado correctamente.'
        );
      } catch (err) {
        console.error(err);

        const mensaje =
          err.message ||
          'No se pudo guardar el perfil personal.';

        setError(mensaje);
        toast.error(mensaje);
      } finally {
        setGuardando(false);
      }

      return;
    }

    if (!puedeEditar) {
      toast.error(
        'Solo el Artista puede modificar este perfil.'
      );
      return;
    }

    try {
      setGuardando(true);

      const perfilArtisticoGuardado =
        await saveWorkspaceArtistProfile(
          {
            nombre_artistico:
              form.nombre_artistico,
            email_artistico:
              form.email_artistico,
            telefono_artistico:
              form.telefono_artistico,
            spotify_url:
              form.spotify_url,
            prefijo_cotizacion:
              String(
                form.prefijo_cotizacion || ''
              )
                .trim()
                .toUpperCase(),
          },
          workspaceId
        );

      let logoPath = form.logo_path || '';
      let firmaPath = form.firma_path || '';

      if (logoFile) {
        const logoSubido =
          await uploadMyBusinessAsset(
            logoFile,
            'logo',
            workspaceId
          );

        logoPath = logoSubido.path;
      }

      if (firmaFile) {
        const firmaSubida =
          await uploadMyBusinessAsset(
            firmaFile,
            'firma',
            workspaceId
          );

        firmaPath = firmaSubida.path;
      }

      const perfilNegocioGuardado =
        await saveMyBusinessProfile(
          {
            ...form,
            logo_path: logoPath,
            firma_path: firmaPath,
            porcentaje_adelanto: Number(
              form.porcentaje_adelanto
            ),
          },
          workspaceId
        );

      setForm((actual) => ({
        ...actual,
        ...perfilNegocioGuardado,
        ...perfilArtisticoGuardado,

        porcentaje_adelanto: Number(
          perfilNegocioGuardado
            ?.porcentaje_adelanto ??
            actual.porcentaje_adelanto
        ),

        condiciones_pago:
          perfilNegocioGuardado?.condiciones_pago ||
          actual.condiciones_pago,

        logo_path:
          perfilNegocioGuardado?.logo_path ||
          logoPath,

        firma_path:
          perfilNegocioGuardado?.firma_path ||
          firmaPath,
      }));

      setLogoPreview(
        perfilNegocioGuardado?.logo_url ||
          logoPreview
      );

      setFirmaPreview(
        perfilNegocioGuardado?.firma_url ||
          firmaPreview
      );

      setLogoFile(null);
      setFirmaFile(null);

      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }

      if (firmaInputRef.current) {
        firmaInputRef.current.value = '';
      }

      setProfile((actual) => ({
        ...actual,
        nombre:
          perfilNegocioGuardado.nombre_completo ||
          actual?.nombre,
      }));

      if (onProfileUpdated) {
        onProfileUpdated({
          ...perfilNegocioGuardado,
          ...perfilArtisticoGuardado,
          workspace_name:
            perfilArtisticoGuardado.nombre_artistico,
        });
      }

      toast.success(
        'Perfil del Artista actualizado correctamente.'
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo guardar el perfil del Artista.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPassword() {
    setError('');

    if (nuevaPassword.length < 8) {
      toast.error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
      return;
    }

    if (
      nuevaPassword !==
      confirmarPassword
    ) {
      toast.error(
        'Las contraseñas no coinciden.'
      );
      return;
    }

    try {
      setGuardandoPassword(true);

      await updateCurrentPassword(
        nuevaPassword
      );

      setNuevaPassword('');
      setConfirmarPassword('');

      toast.success(
        'Contraseña actualizada correctamente.'
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo actualizar la contraseña.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setGuardandoPassword(false);
    }
  }

  if (!esPerfilArtista) {
    return (
      <div className="dashboard perfil-page">
        <div className="top-bar">
          <div>
            <h1>Mi perfil</h1>

            <p>
              Información personal, contacto,
              pagos y seguridad de tu cuenta
            </p>
          </div>

          <button
            type="button"
            onClick={goBack}
          >
            ← Atrás
          </button>
        </div>

        {cargando ? (
          <div className="form-section">
            Cargando perfil...
          </div>
        ) : (
          <form
            className="form-cotizacion"
            onSubmit={guardar}
          >
            <div className="form-grid">
              <section className="form-section">
                <h2>Información personal</h2>

                <label htmlFor="gestor-nombre">
                  Nombre completo *
                </label>

                <input
                  id="gestor-nombre"
                  type="text"
                  name="nombre_completo"
                  value={form.nombre_completo}
                  onChange={cambiar}
                  autoComplete="name"
                />

                <label htmlFor="gestor-email">
                  Correo de la cuenta
                </label>

                <input
                  id="gestor-email"
                  type="email"
                  value={profile?.email || ''}
                  readOnly
                  autoComplete="email"
                />

                <small>
                  El correo de acceso no se cambia
                  desde esta sección.
                </small>

                <label htmlFor="gestor-telefono">
                  Teléfono
                </label>

                <input
                  id="gestor-telefono"
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={cambiar}
                  autoComplete="tel"
                />

                <label htmlFor="gestor-identificacion">
                  Cédula o ID
                </label>

                <input
                  id="gestor-identificacion"
                  type="text"
                  name="identificacion"
                  value={form.identificacion}
                  onChange={cambiar}
                  autoComplete="off"
                />
              </section>

              <section className="form-section">
                <h2>Ubicación</h2>

                <label htmlFor="gestor-direccion">
                  Dirección
                </label>

                <input
                  id="gestor-direccion"
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={cambiar}
                  autoComplete="street-address"
                />

                <label htmlFor="gestor-ciudad">
                  Ciudad
                </label>

                <input
                  id="gestor-ciudad"
                  type="text"
                  name="ciudad"
                  value={form.ciudad}
                  onChange={cambiar}
                  autoComplete="address-level2"
                />

                <label htmlFor="gestor-pais">
                  País
                </label>

                <input
                  id="gestor-pais"
                  type="text"
                  name="pais"
                  value={form.pais}
                  onChange={cambiar}
                  autoComplete="country-name"
                />

                <label htmlFor="gestor-codigo-postal">
                  Código postal
                </label>

                <input
                  id="gestor-codigo-postal"
                  type="text"
                  name="codigo_postal"
                  value={form.codigo_postal}
                  onChange={cambiar}
                  autoComplete="postal-code"
                />
              </section>

              <section className="form-section">
                <h2>Información para pagos</h2>

                <p>
                  Estos datos pertenecen al Gestor
                  y pueden servir como referencia
                  para el pago de sus comisiones.
                </p>

                <label htmlFor="gestor-banco">
                  Nombre del banco
                </label>

                <input
                  id="gestor-banco"
                  type="text"
                  name="nombre_banco"
                  value={form.nombre_banco}
                  onChange={cambiar}
                  autoComplete="off"
                />

                <label htmlFor="gestor-cuenta">
                  Cuenta bancaria
                </label>

                <input
                  id="gestor-cuenta"
                  type="text"
                  name="cuenta_bancaria"
                  value={form.cuenta_bancaria}
                  onChange={cambiar}
                  autoComplete="off"
                />
              </section>

              <section className="form-section">
                <h2>Seguridad</h2>

                <p>
                  Puedes cambiar tu contraseña
                  mientras tengas la sesión abierta.
                </p>

                <label htmlFor="gestor-password">
                  Nueva contraseña
                </label>

                <input
                  id="gestor-password"
                  type="password"
                  value={nuevaPassword}
                  onChange={(event) =>
                    setNuevaPassword(
                      event.target.value
                    )
                  }
                  minLength="8"
                  autoComplete="new-password"
                />

                <label htmlFor="gestor-password-confirm">
                  Confirmar nueva contraseña
                </label>

                <input
                  id="gestor-password-confirm"
                  type="password"
                  value={confirmarPassword}
                  onChange={(event) =>
                    setConfirmarPassword(
                      event.target.value
                    )
                  }
                  minLength="8"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={guardarPassword}
                  disabled={guardandoPassword}
                  style={{ marginTop: 16 }}
                >
                  {guardandoPassword
                    ? 'Actualizando...'
                    : 'Cambiar contraseña'}
                </button>
              </section>
            </div>

            {error && (
              <p className="error">
                {error}
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando...'
                  : 'Guardar mi perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard perfil-page">
      <div className="top-bar">
        <div>
          <h1>Perfil del Artista</h1>

          <p>
            Identidad artística, contratación, imagen,
            banco y políticas
          </p>
        </div>

        <button
          type="button"
          onClick={goBack}
        >
          ← Atrás
        </button>
      </div>

      {cargando ? (
        <div className="form-section">
          Cargando perfil...
        </div>
      ) : !puedeEditar ? (
        <div className="form-section">
          <h2>Acceso restringido</h2>

          <p>
            Esta sección solamente está disponible para
            el Artista propietario.
          </p>
        </div>
      ) : (
        <form
          className="form-cotizacion"
          onSubmit={guardar}
        >
          <div className="form-grid">
            <section className="form-section">
              <h2>Identidad artística</h2>

              <label htmlFor="perfil-artista-nombre">
                Nombre artístico *
              </label>

              <input
                id="perfil-artista-nombre"
                type="text"
                name="nombre_artistico"
                value={form.nombre_artistico}
                onChange={cambiar}
                placeholder="Ej: Cruzmonty"
                autoComplete="organization"
              />

              <label htmlFor="perfil-prefijo-cotizacion">
                Prefijo de cotizaciones *
              </label>

              <input
                id="perfil-prefijo-cotizacion"
                type="text"
                name="prefijo_cotizacion"
                value={form.prefijo_cotizacion}
                onChange={(event) =>
                  setForm((actual) => ({
                    ...actual,
                    prefijo_cotizacion:
                      event.target.value
                        .toUpperCase()
                        .replace(
                          /[^A-Z0-9]/g,
                          ''
                        )
                        .slice(0, 8),
                  }))
                }
                placeholder="Ej: CM, RM, CP"
                maxLength="8"
                autoComplete="off"
              />

              <small>
                Se usará en números como{' '}
                <strong>
                  {form.prefijo_cotizacion || 'ART'}-0001
                </strong>.
                Debe ser exclusivo de este Artista.
              </small>

              <label htmlFor="perfil-artista-email">
                Correo de contratación
              </label>

              <input
                id="perfil-artista-email"
                type="email"
                name="email_artistico"
                value={form.email_artistico}
                onChange={cambiar}
                autoComplete="email"
              />

              <label htmlFor="perfil-artista-telefono">
                Teléfono de contratación
              </label>

              <input
                id="perfil-artista-telefono"
                type="tel"
                name="telefono_artistico"
                value={form.telefono_artistico}
                onChange={cambiar}
                autoComplete="tel"
              />

              <label htmlFor="perfil-artista-spotify">
                Perfil de Spotify
              </label>

              <input
                id="perfil-artista-spotify"
                type="url"
                name="spotify_url"
                value={form.spotify_url}
                onChange={cambiar}
                placeholder="https://open.spotify.com/artist/..."
              />

              {form.spotify_url && (
                <a
                  href={form.spotify_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir perfil de Spotify ↗
                </a>
              )}
            </section>

            <section className="form-section">
              <h2>Representación y autorizaciones</h2>

              <p>
                Cada Gestor puede tener un porcentaje
                independiente con este Artista.
              </p>

              <p>
                La invitación se envía al correo del Gestor
                y el acceso solo se activa cuando la persona
                invitada acepta la relación.
              </p>

              {typeof goEquipo === 'function' && (
                <button
                  type="button"
                  onClick={goEquipo}
                >
                  Abrir Equipo e invitaciones
                </button>
              )}
            </section>

            <section className="form-section">
              <h2>Identidad legal y contacto</h2>

              <label htmlFor="perfil-nombre">
                Nombre completo *
              </label>

              <input
                id="perfil-nombre"
                type="text"
                name="nombre_completo"
                value={form.nombre_completo}
                onChange={cambiar}
                autoComplete="name"
              />

              <label htmlFor="perfil-direccion">
                Dirección
              </label>

              <input
                id="perfil-direccion"
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={cambiar}
                autoComplete="street-address"
              />

              <label htmlFor="perfil-ciudad">
                Ciudad
              </label>

              <input
                id="perfil-ciudad"
                type="text"
                name="ciudad"
                value={form.ciudad}
                onChange={cambiar}
                autoComplete="address-level2"
              />

              <label htmlFor="perfil-pais">
                País
              </label>

              <input
                id="perfil-pais"
                type="text"
                name="pais"
                value={form.pais}
                onChange={cambiar}
                autoComplete="country-name"
              />

              <label htmlFor="perfil-codigo-postal">
                Código postal
              </label>

              <input
                id="perfil-codigo-postal"
                type="text"
                name="codigo_postal"
                value={form.codigo_postal}
                onChange={cambiar}
                autoComplete="postal-code"
              />

              <label htmlFor="perfil-telefono">
                Teléfono personal o legal
              </label>

              <input
                id="perfil-telefono"
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={cambiar}
                autoComplete="tel"
              />

              <label htmlFor="perfil-identificacion">
                Cédula o ID
              </label>

              <input
                id="perfil-identificacion"
                type="text"
                name="identificacion"
                value={form.identificacion}
                onChange={cambiar}
                autoComplete="off"
              />
            </section>

            <section className="form-section">
              <h2>Información bancaria</h2>

              <label htmlFor="perfil-banco">
                Nombre del banco
              </label>

              <input
                id="perfil-banco"
                type="text"
                name="nombre_banco"
                value={form.nombre_banco}
                onChange={cambiar}
                autoComplete="off"
              />

              <label htmlFor="perfil-cuenta">
                Cuenta de banco
              </label>

              <input
                id="perfil-cuenta"
                type="text"
                name="cuenta_bancaria"
                value={form.cuenta_bancaria}
                onChange={cambiar}
                autoComplete="off"
              />

              <p style={{ marginTop: 18 }}>
                Estos datos se insertan automáticamente
                en las políticas de cada cotización nueva.
              </p>
            </section>

            <section className="form-section form-full">
              <h2>Logo y firma</h2>

              <p>
                Selecciona archivos PNG. Se subirán cuando
                presiones <strong>Guardar perfil</strong>.
                Tamaño máximo: 5 MB por archivo.
              </p>

              <div style={uploaderGridStyle}>
                <div style={uploaderCardStyle}>
                  <label htmlFor="perfil-logo">
                    Logo en PNG
                  </label>

                  <input
                    ref={logoInputRef}
                    id="perfil-logo"
                    type="file"
                    accept="image/png,.png"
                    onChange={seleccionarLogo}
                  />

                  <div style={previewStyle}>
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Vista previa del logo"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 145,
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <span>No hay logo cargado</span>
                    )}
                  </div>

                  {logoFile && (
                    <small>
                      Nuevo archivo: {logoFile.name}
                    </small>
                  )}
                </div>

                <div style={uploaderCardStyle}>
                  <label htmlFor="perfil-firma">
                    Firma en PNG
                  </label>

                  <input
                    ref={firmaInputRef}
                    id="perfil-firma"
                    type="file"
                    accept="image/png,.png"
                    onChange={seleccionarFirma}
                  />

                  <div style={previewStyle}>
                    {firmaPreview ? (
                      <img
                        src={firmaPreview}
                        alt="Vista previa de la firma"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 145,
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <span>No hay firma cargada</span>
                    )}
                  </div>

                  {firmaFile && (
                    <small>
                      Nuevo archivo: {firmaFile.name}
                    </small>
                  )}
                </div>
              </div>

              <p style={{ marginTop: 14 }}>
                Las cotizaciones anteriores conservarán la
                firma y el perfil que tenían al momento de
                ser creadas.
              </p>
            </section>

            <section className="form-section form-full">
              <h2>Políticas y condiciones</h2>

              <div className="form-grid">
                <div>
                  <label htmlFor="perfil-avance">
                    Adelanto requerido para reservar (%)
                  </label>

                  <input
                    id="perfil-avance"
                    type="number"
                    name="porcentaje_adelanto"
                    min="0"
                    max="100"
                    step="1"
                    value={form.porcentaje_adelanto}
                    onChange={cambiar}
                  />
                </div>
              </div>

              <label htmlFor="perfil-condiciones">
                Políticas y condiciones
              </label>

              <p>
                Puedes usar estas variables. Al guardar una
                cotización, se sustituyen por los datos
                actuales y se conserva una copia permanente.
              </p>

              <div style={variablesStyle}>
                {VARIABLES_POLITICAS.map((variable) => (
                  <code
                    key={variable}
                    style={variableStyle}
                  >
                    {variable}
                  </code>
                ))}
              </div>

              <textarea
                id="perfil-condiciones"
                name="condiciones_pago"
                value={form.condiciones_pago}
                onChange={cambiar}
                rows="18"
                placeholder={
                  DEFAULT_BUSINESS_POLICIES_TEMPLATE
                }
              />

              <p>
                Usa <code>**texto**</code> para mostrar una
                parte en negrita dentro de la cotización.
              </p>

              <button
                type="button"
                onClick={restaurarPoliticas}
                style={{ marginTop: 8 }}
              >
                Restaurar plantilla recomendada
              </button>

              <p style={{ marginTop: 14 }}>
                Los cambios realizados aquí se aplicarán
                únicamente a cotizaciones nuevas.
              </p>
            </section>

            <section className="form-section form-full">
              <h2>Configuración contractual</h2>

              <p>
                Estos valores se cargarán automáticamente
                cuando el Artista o un Gestor genere un
                contrato desde una cotización confirmada o
                aprobada.
              </p>

              <div className="form-grid">
                <div>
                  <label htmlFor="contrato-sets">
                    Cantidad habitual de sets
                  </label>

                  <input
                    id="contrato-sets"
                    type="number"
                    min="1"
                    name="cantidad_sets_contrato"
                    value={form.cantidad_sets_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-duracion-set">
                    Minutos por set
                  </label>

                  <input
                    id="contrato-duracion-set"
                    type="number"
                    min="1"
                    name="duracion_set_contrato"
                    value={form.duracion_set_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-receso">
                    Minutos de receso
                  </label>

                  <input
                    id="contrato-receso"
                    type="number"
                    min="0"
                    name="duracion_receso_contrato"
                    value={form.duracion_receso_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-dias-anticipo">
                    Anticipo: días antes del evento
                  </label>

                  <input
                    id="contrato-dias-anticipo"
                    type="number"
                    min="0"
                    name="dias_anticipo_contrato"
                    value={form.dias_anticipo_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-dias-saldo">
                    Saldo: días antes del evento
                  </label>

                  <input
                    id="contrato-dias-saldo"
                    type="number"
                    min="0"
                    name="dias_saldo_contrato"
                    value={form.dias_saldo_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-hora-extra">
                    Tarifa por hora adicional
                  </label>

                  <input
                    id="contrato-hora-extra"
                    type="number"
                    min="0"
                    name="tarifa_hora_extra_contrato"
                    value={form.tarifa_hora_extra_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-cancelacion">
                    Ventana de cancelación (días)
                  </label>

                  <input
                    id="contrato-cancelacion"
                    type="number"
                    min="0"
                    name="dias_cancelacion_contrato"
                    value={form.dias_cancelacion_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div>
                  <label htmlFor="contrato-jurisdiccion">
                    Jurisdicción
                  </label>

                  <input
                    id="contrato-jurisdiccion"
                    type="text"
                    name="jurisdiccion_contrato"
                    value={form.jurisdiccion_contrato}
                    onChange={cambiar}
                  />
                </div>

                <div className="form-full">
                  <label htmlFor="contrato-lugar-firma">
                    Lugar habitual de firma
                  </label>

                  <input
                    id="contrato-lugar-firma"
                    type="text"
                    name="lugar_firma_contrato"
                    value={form.lugar_firma_contrato}
                    onChange={cambiar}
                  />
                </div>
              </div>

              <label htmlFor="contrato-servicios-incluidos">
                Servicios incluidos por defecto
              </label>

              <textarea
                id="contrato-servicios-incluidos"
                name="servicios_incluidos_contrato"
                value={form.servicios_incluidos_contrato}
                onChange={cambiar}
                rows="4"
              />

              <label htmlFor="contrato-servicios-excluidos">
                Servicios excluidos por defecto
              </label>

              <textarea
                id="contrato-servicios-excluidos"
                name="servicios_excluidos_contrato"
                value={form.servicios_excluidos_contrato}
                onChange={cambiar}
                rows="4"
              />

              <label htmlFor="contrato-hospitalidad">
                Hospitalidad por defecto
              </label>

              <textarea
                id="contrato-hospitalidad"
                name="hospitalidad_contrato"
                value={form.hospitalidad_contrato}
                onChange={cambiar}
                rows="4"
              />

              <label htmlFor="contrato-transporte">
                Transporte y hospedaje por defecto
              </label>

              <textarea
                id="contrato-transporte"
                name="transporte_hospedaje_contrato"
                value={form.transporte_hospedaje_contrato}
                onChange={cambiar}
                rows="4"
              />

              <label htmlFor="contrato-anexos">
                Anexos por defecto
              </label>

              <textarea
                id="contrato-anexos"
                name="anexos_contrato"
                value={form.anexos_contrato}
                onChange={cambiar}
                rows="3"
              />

              <label htmlFor="contrato-plantilla">
                Plantilla del contrato
              </label>

              <p>
                Las variables se sustituyen al generar cada
                contrato y el texto final queda congelado
                junto con los datos del evento.
              </p>

              <div style={variablesStyle}>
                {CONTRACT_VARIABLES.map((variable) => (
                  <code
                    key={variable}
                    style={variableStyle}
                  >
                    {variable}
                  </code>
                ))}
              </div>

              <textarea
                id="contrato-plantilla"
                name="plantilla_contrato"
                value={form.plantilla_contrato}
                onChange={cambiar}
                rows="38"
                placeholder={DEFAULT_CONTRACT_TEMPLATE}
              />

              <button
                type="button"
                onClick={restaurarPlantillaContrato}
                style={{ marginTop: 8 }}
              >
                Restaurar contrato recomendado
              </button>

              <p style={{ marginTop: 14 }}>
                Los cambios se aplicarán únicamente a
                contratos nuevos.
              </p>
            </section>

            <section className="form-section form-full">
              <h2>Seguridad de la cuenta</h2>

              <p>
                Cambia la contraseña de acceso sin
                modificar los datos del Artista.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                <div>
                  <label htmlFor="artista-password">
                    Nueva contraseña
                  </label>

                  <input
                    id="artista-password"
                    type="password"
                    value={nuevaPassword}
                    onChange={(event) =>
                      setNuevaPassword(
                        event.target.value
                      )
                    }
                    minLength="8"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="artista-password-confirm">
                    Confirmar nueva contraseña
                  </label>

                  <input
                    id="artista-password-confirm"
                    type="password"
                    value={confirmarPassword}
                    onChange={(event) =>
                      setConfirmarPassword(
                        event.target.value
                      )
                    }
                    minLength="8"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={guardarPassword}
                disabled={guardandoPassword}
                style={{ marginTop: 16 }}
              >
                {guardandoPassword
                  ? 'Actualizando...'
                  : 'Cambiar contraseña'}
              </button>
            </section>
          </div>

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : 'Guardar perfil del Artista'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
