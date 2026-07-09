import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  getCotizaciones,
  duplicarCotizacion,
  cancelarCotizacion,
} from '../lib/cotizacionesService';

export default function Cotizaciones({
  goHome,
  abrirCotizacion,
  editarCotizacion,
  abrirPagos,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    function cerrarMenu() {
      setMenuAbierto(null);
    }

    function cerrarConEscape(event) {
      if (event.key === 'Escape') {
        setMenuAbierto(null);
      }
    }

    document.addEventListener('click', cerrarMenu);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('click', cerrarMenu);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  async function cargar() {
    const data = await getCotizaciones();
    setCotizaciones(data);
  }

  const filtradas = cotizaciones.filter((c) => {
    const texto = (
      (c.numero || '') +
      ' ' +
      (c.clientes?.nombre || '') +
      ' ' +
      (c.nombre_evento || '') +
      ' ' +
      (c.venue || '')
    ).toLowerCase();

    const cumpleTexto = texto.includes(buscar.toLowerCase());
    const cumpleEstado = !estado || c.estado === estado;

    return cumpleTexto && cumpleEstado;
  });

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) return '--';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  async function duplicar(id) {
    if (!window.confirm('¿Duplicar esta cotización?')) return;

    setMenuAbierto(null);
    await duplicarCotizacion(id);
    await cargar();
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar definitivamente esta cotización?')) return;

    const { error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`No se pudo eliminar: ${error.message}`);
      return;
    }

    setMenuAbierto(null);
    await cargar();
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta cotización?')) return;

    setMenuAbierto(null);
    await cancelarCotizacion(id);
    await cargar();
  }

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Cotizaciones</h1>
          <p>{filtradas.length} registros</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="cotizaciones-list">
        {filtradas.map((c) => (
          <div
            className={`cotizacion-item ${menuAbierto === c.id ? 'menu-activo' : ''}`}
            key={c.id}
          >
            <div className="cot-numero">
              {c.numero}
            </div>

            <div className="cot-cliente">
              <strong>{c.clientes?.nombre}</strong>

              <div>
                {c.nombre_evento || c.tipo_evento}
              </div>

              {c.venue && (
                <div
                  style={{
                    opacity: 0.75,
                    fontSize: 13,
                  }}
                >
                  {c.venue}
                </div>
              )}
            </div>

            <div className="cot-fecha">
              {fechaCorta(c.fecha_evento)}
            </div>

            <div className="cot-total">
              {money(c.total)}
            </div>

            <div className="cot-estado">
              {c.estado}
            </div>

            <div
              className="cot-menu"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() =>
                  setMenuAbierto(menuAbierto === c.id ? null : c.id)
                }
              >
                ⋮
              </button>

              {menuAbierto === c.id && (
                <div className="menu-popup">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(null);
                      abrirCotizacion(c.id);
                    }}
                  >
                    👁 Ver
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(null);
                      editarCotizacion(c.id);
                    }}
                  >
                    ✏ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(null);
                      abrirPagos(c.id);
                    }}
                  >
                    💰 Pagos
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicar(c.id)}
                  >
                    📋 Duplicar
                  </button>

                  <button
                    type="button"
                    onClick={() => cancelar(c.id)}
                  >
                    ❌ Cancelar
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => eliminar(c.id)}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}