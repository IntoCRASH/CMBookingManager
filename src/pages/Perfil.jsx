import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DEFAULT_BUSINESS_POLICIES_TEMPLATE,
  getMyBusinessProfile,
  getMyProfile,
  getWorkspaceArtistProfile,
  saveMyBusinessProfile,
  saveWorkspaceArtistProfile,
  uploadMyBusinessAsset,
} from '../lib/profileService';

const MAX_PNG_SIZE = 5 * 1024 * 1024;

const formInicial = {
  nombre_artistico: '',
  email_artistico: '',
  telefono_artistico: '',
  spotify_url: '',

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
  const [error, setError] = useState('');

  const logoInputRef = useRef(null);
  const firmaInputRef = useRef(null);

  const puedeEditar = Boolean(
    esArtista || workspace?.member_role === 'owner'
  );

  useEffect(() => {
    if (!workspaceId) {
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId]);

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
        'No se pudo cargar el perfil del Artista.';

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
    if (!form.nombre_artistico.trim()) {
      toast.error(
        'El nombre artístico es obligatorio.'
      );

      return false;
    }

    if (!form.nombre_completo.trim()) {
      toast.error(
        'El nombre completo es obligatorio.'
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

    return true;
  }

  async function guardar(event) {
    event.preventDefault();
    setError('');

    if (!puedeEditar) {
      toast.error(
        'Solo el Artista puede modificar este perfil.'
      );
      return;
    }

    if (!validar()) return;

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
