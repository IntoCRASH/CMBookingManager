import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getClientes, crearCliente } from '../lib/clientesService';
import { getProvincias } from '../lib/provinciasService';
import { calcularCotizacion } from '../lib/calcularCotizacion';
import { getMyProfile } from '../lib/profileService';
import {
  saveCotizacion,
  getCotizacionById,
} from '../lib/cotizacionesService';

const ADMIN_EMAIL = 'cruzmonty1983@gmail.com';

const formInicial = {
  cliente_id: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_empresa: '',
  cliente_email: '',

  provincia_id: '',
  fecha_evento: '',
  tipo_evento: 'Privado',
  nombre_evento: '',
  venue: '',
  direccion_evento: '',
  hora_montaje: '',
  hora_inicio: '',
  hora_fin: '',
  invitados: '',
  contacto_evento: '',
  telefono_contacto: '',
  observaciones: '',

  cantidad_musicos: 1,
  incluye_sonido: false,
  descuento: 0,
  estado: 'Pendiente',
};

const tiposEvento = [
  'Boda',
  'Cumpleaños',
  'Concierto',
  'Privado',
  'Público',
  'Small Venue',
  'Político',
  'Corporativo',
  'Festival',
  'Religioso',
  'Otro',
];

export default function NuevaCotizacion({ cotizacionId, goHome, onCotizacionGuardada }) {
  const [clientes, setClientes] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(formInicial);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarDetallesEvento, setMostrarDetallesEvento] = useState(false);

useEffect(() => {
  cargarDatos();

  if (cotizacionId) {
    cargarCotizacion();
  }
}, [cotizacionId]);

async function cargarCotizacion() {
  const c = await getCotizacionById(cotizacionId);

  setModoEdicion(true);

  setForm({
    ...formInicial,

    id: c.id,

    cliente_id: c.cliente_id,

    cliente_nombre: c.clientes?.nombre || '',
    cliente_telefono: c.clientes?.telefono || '',
    cliente_empresa: c.clientes?.empresa || '',
    cliente_email: c.clientes?.email || '',

    provincia_id: c.provincia_id,

    fecha_evento: c.fecha_evento || '',

    tipo_evento: c.tipo_evento,

    nombre_evento: c.nombre_evento || '',

    venue: c.venue || '',

    direccion_evento: c.direccion_evento || '',

    hora_montaje: c.hora_montaje || '',

    hora_inicio: c.hora_inicio || '',

    hora_fin: c.hora_fin || '',

    invitados: c.invitados || '',

    contacto_evento: c.contacto_evento || '',

    telefono_contacto: c.telefono_contacto || '',

    observaciones: c.observaciones || '',

    cantidad_musicos: c.cantidad_musicos,

    incluye_sonido: c.incluye_sonido,

    descuento: c.descuento,

    estado: c.estado,
  });

  setResultado({
    honorarios: c.honorarios,
    nomina: c.nomina,
    dieta: c.dieta,
    transporte: c.transporte,
    sonido: c.sonido,
    road_manager: c.road_manager,
    subtotal: c.subtotal,
    descuento: c.descuento,
    monto_descuento: c.monto_descuento,
    comision: c.comision,
    total: c.total,
  });
}

  async function cargarDatos() {
    const { data: userData } = await supabase.auth.getUser();
    setUsuarioEmail(userData?.user?.email || '');
    const perfil = await getMyProfile();
    setProfile(perfil);
    const clientesData = await getClientes();
    const provinciasData = await getProvincias();

    setClientes(clientesData);
    setProvincias(provinciasData.filter((p) => p.activa));
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });

    setResultado(null);
    setError('');
  }

  function seleccionarCliente(e) {
    const clienteId = e.target.value;
    const cliente = clientes.find((c) => String(c.id) === String(clienteId));

    setForm({
      ...form,
      cliente_id: clienteId,
      cliente_nombre: cliente?.nombre || '',
      cliente_telefono: cliente?.telefono || '',
      cliente_empresa: cliente?.empresa || '',
      cliente_email: cliente?.email || '',
    });

    setResultado(null);
    setError('');
  }

  function validar() {
    if (!form.cliente_id && !form.cliente_nombre.trim()) {
      setError('Selecciona un cliente o escribe el nombre del cliente.');
      return false;
    }

    if (!form.cliente_telefono.trim()) {
      setError('El teléfono del cliente es obligatorio.');
      return false;
    }

    if (!form.provincia_id) {
      setError('Selecciona una provincia.');
      return false;
    }

    return true;
  }

  async function calcular(e) {
  e.preventDefault();
  setError('');

  if (!validar()) return;

  const provincia = provincias.find(
    (p) => String(p.id) === String(form.provincia_id)
  );

  if (!provincia) {
    setError('Provincia inválida.');
    return;
  }

  let perfilActual = profile;

  if (!perfilActual) {
    perfilActual = await getMyProfile();
    setProfile(perfilActual);
  }

  const rol = String(perfilActual?.rol || '').trim().toLowerCase();

  const esAdmin =
    rol === 'admin' ||
    rol === 'administrador';

  const calculo = calcularCotizacion({
    provincia,
    cantidadMusicos: Number(form.cantidad_musicos),
    incluyeSonido: form.incluye_sonido,
    descuento: Number(form.descuento),
    aplicarComision: !esAdmin,
    comisionPorcentaje: Number(profile?.comision_porcentaje || 0) / 100,
  });

  setResultado(calculo);
}

  async function obtenerClienteId() {
    if (form.cliente_id) return form.cliente_id;

    const nuevoCliente = await crearCliente({
      nombre: form.cliente_nombre.trim(),
      telefono: form.cliente_telefono.trim(),
      empresa: form.cliente_empresa.trim() || null,
      email: form.cliente_email.trim() || null,
    });

    return nuevoCliente.id;
  }

  async function guardar() {
    setError('');

    if (!resultado) {
      setError('Primero debes calcular la cotización.');
      return;
    }

    try {
      const clienteIdFinal = await obtenerClienteId();

const guardada = await saveCotizacion({
        id: form.id,
        cliente_id: clienteIdFinal,
        vendedor_id: (
  await supabase.auth.getUser()
).data.user.id,
        provincia_id: form.provincia_id,

        fecha_evento: form.fecha_evento || null,
        tipo_evento: form.tipo_evento,
        nombre_evento: form.nombre_evento || null,
        venue: form.venue || null,
        direccion_evento: form.direccion_evento || null,
        hora_montaje: form.hora_montaje || null,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        invitados: form.invitados ? Number(form.invitados) : null,
        contacto_evento: form.contacto_evento || null,
        telefono_contacto: form.telefono_contacto || null,
        observaciones: form.observaciones || null,

        cantidad_musicos: Number(form.cantidad_musicos),
        incluye_sonido: form.incluye_sonido,
        descuento: Number(form.descuento),
        estado: form.estado,

        ...resultado,
      });

      alert(
  modoEdicion
    ? 'Cotización actualizada.'
    : 'Cotización guardada.'
);

      if (onCotizacionGuardada) {
        onCotizacionGuardada(guardada.id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar la cotización.');
    }
  }

  return (
  <div className="dashboard">
    <div className="top-bar">
      <div>
        <h1>{modoEdicion ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
        <p>Calcular y guardar una cotización</p>
      </div>

      <button onClick={goHome}>← Dashboard</button>
    </div>

    <form className="form-cotizacion" onSubmit={calcular}>
      <div className="form-grid">
        <section className="form-section">
          <h2>Cliente</h2>

          <label>Cliente existente</label>
          <select name="cliente_id" value={form.cliente_id} onChange={seleccionarCliente}>
            <option value="">Crear / escribir cliente nuevo</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.empresa ? `- ${c.empresa}` : ''}
              </option>
            ))}
          </select>

          <label>Nombre del cliente *</label>
          <input type="text" name="cliente_nombre" value={form.cliente_nombre} onChange={cambiar} />

          <label>Teléfono *</label>
          <input type="text" name="cliente_telefono" value={form.cliente_telefono} onChange={cambiar} />

          <label>Empresa</label>
          <input type="text" name="cliente_empresa" value={form.cliente_empresa} onChange={cambiar} />

          <label>Email</label>
          <input type="email" name="cliente_email" value={form.cliente_email} onChange={cambiar} />
        </section>

        <section className="form-section">
          <h2>Evento</h2>

          <label>Tipo de evento</label>
          <select name="tipo_evento" value={form.tipo_evento} onChange={cambiar}>
            {tiposEvento.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <label>Nombre del evento</label>
          <input type="text" name="nombre_evento" value={form.nombre_evento} onChange={cambiar} />

          <label>Venue / Hotel / Salón</label>
          <input type="text" name="venue" value={form.venue} onChange={cambiar} />

          <label>Provincia *</label>
          <select name="provincia_id" value={form.provincia_id} onChange={cambiar}>
            <option value="">Seleccionar provincia</option>
            {provincias.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <label>Fecha del evento</label>
          <input type="date" name="fecha_evento" value={form.fecha_evento} onChange={cambiar} />

          <label>Dirección</label>
          <input type="text" name="direccion_evento" value={form.direccion_evento} onChange={cambiar} /><br></br>
          <button
  type="button"
  style={{ marginTop: 16 }}
  onClick={() => setMostrarDetallesEvento(!mostrarDetallesEvento)}
>
  {mostrarDetallesEvento ? 'Ocultar detalles del evento' : 'Mostrar más detalles'}
</button>

{mostrarDetallesEvento && (
  <>
    <label>Hora de montaje</label>
    <input type="time" name="hora_montaje" value={form.hora_montaje} onChange={cambiar} />

    <label>Hora de inicio</label>
    <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={cambiar} />

    <label>Hora de finalización</label>
    <input type="time" name="hora_fin" value={form.hora_fin} onChange={cambiar} />

    <label>Cantidad estimada de invitados</label>
    <input type="number" name="invitados" min="0" value={form.invitados} onChange={cambiar} />

    <label>Persona de contacto</label>
    <input type="text" name="contacto_evento" value={form.contacto_evento} onChange={cambiar} />

    <label>Teléfono del contacto</label>
    <input type="text" name="telefono_contacto" value={form.telefono_contacto} onChange={cambiar} />

    <label>Observaciones</label>
    <textarea name="observaciones" value={form.observaciones} onChange={cambiar} rows="3" />
  </>
)}
        </section>

        <section className="form-section form-full">
  <h2>Cotización</h2>

  <div className="form-grid">

    <div>
      <label>Cantidad de músicos</label>
      <input
        type="number"
        name="cantidad_musicos"
        min="1"
        value={form.cantidad_musicos}
        onChange={cambiar}
      />
    </div>

    <div>
      <label>Descuento</label>
      <select
        name="descuento"
        value={form.descuento}
        onChange={cambiar}
      >
        <option value="0">0%</option>
        <option value="5">5%</option>
        <option value="10">10%</option>
        <option value="15">15%</option>
        <option value="20">20%</option>
        <option value="25">25%</option>
      </select>
    </div>

    <div>
      <label>Estado</label>
      <select
        name="estado"
        value={form.estado}
        onChange={cambiar}
      >
        <option value="Pendiente">Pendiente</option>
        <option value="Confirmada">Confirmada</option>
        <option value="Cancelada">Cancelada</option>
        <option value="Realizada">Realizada</option>
      </select>
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <label className="check-row">
        <input
          type="checkbox"
          name="incluye_sonido"
          checked={form.incluye_sonido}
          onChange={cambiar}
        />
        Incluir sonido
      </label>
    </div>

  </div>

  {!resultado && error && (
    <p className="error">{error}</p>
  )}

  <div className="form-actions">
    <button type="submit">
      Calcular Cotización
    </button>
  </div>

</section>

        
      </div>
    </form>

    {resultado && (
      <div className="provincia-card" style={{ marginTop: 24 }}>
        <h2>Resultado interno</h2>

        <div className="resultado-grid">
          <div className="fila"><span>Honorarios</span><strong>RD$ {resultado.honorarios.toLocaleString()}</strong></div>
          <div className="fila"><span>Nómina</span><strong>RD$ {resultado.nomina.toLocaleString()}</strong></div>
          <div className="fila"><span>Dieta</span><strong>RD$ {resultado.dieta.toLocaleString()}</strong></div>
          <div className="fila"><span>Transporte</span><strong>RD$ {resultado.transporte.toLocaleString()}</strong></div>
          <div className="fila"><span>Sonido</span><strong>RD$ {resultado.sonido.toLocaleString()}</strong></div>
          <div className="fila"><span>Road Manager</span><strong>RD$ {resultado.road_manager.toLocaleString()}</strong></div>
          <div className="fila"><span>Subtotal</span><strong>RD$ {resultado.subtotal.toLocaleString()}</strong></div>
          <div className="fila"><span>Descuento {resultado.descuento}%</span><strong>RD$ {resultado.monto_descuento.toLocaleString()}</strong></div>
          <div className="fila">
            <span>Comisión {profile?.rol === 'admin' ? '(Admin: no aplica)' : '(10%)'}</span>
            <strong>RD$ {resultado.comision.toLocaleString()}</strong>
          </div>
          <div className="fila"><span>Total redondeado</span><strong>RD$ {resultado.total.toLocaleString()}</strong></div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={guardar}>
            {modoEdicion ? 'Actualizar Cotización' : 'Guardar Cotización'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    )}
  </div>
);
}