import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tarifas from './pages/Tarifas';
import Clientes from './pages/Clientes';
import NuevaCotizacion from './pages/NuevaCotizacion';
import VerCotizacion from './pages/VerCotizacion';
import Cotizaciones from './pages/Cotizaciones';
import Calendario from './pages/Calendario';
import PagosCotizacion from './pages/PagosCotizacion';
import Comisiones from './pages/Comisiones';
import Usuarios from './pages/Usuarios';
import Formatos from './pages/Formatos';
import TiposEvento from './pages/TiposEvento';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [cotizacionId, setCotizacionId] = useState(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  function abrirCotizacion(id) {
    setCotizacionId(id);
    setPage('ver-cotizacion');
  }

  function editarCotizacion(id) {
    setCotizacionId(id);
    setPage('nueva-cotizacion');
  }

  function abrirPagos(id) {
    setCotizacionId(id);
    setPage('pagos-cotizacion');
  }

  function volverDashboard() {
    setCotizacionId(null);
    setPage('dashboard');
  }

  function nuevaCotizacion() {
    setCotizacionId(null);
    setPage('nueva-cotizacion');
  }

  let contenido;

  if (loading) {
    contenido = <h2>Cargando...</h2>;
  } else if (!session) {
    contenido = <Login />;
  } else {
    switch (page) {
      case 'tarifas':
        contenido = <Tarifas goHome={volverDashboard} />;
        break;

      case 'clientes':
        contenido = <Clientes goHome={volverDashboard} />;
        break;

      case 'nueva-cotizacion':
        contenido = (
          <NuevaCotizacion
            session={session}
            cotizacionId={cotizacionId}
            goHome={volverDashboard}
            onCotizacionGuardada={abrirCotizacion}
          />
        );
        break;

      case 'cotizaciones':
        contenido = (
          <Cotizaciones
            goHome={volverDashboard}
            abrirCotizacion={abrirCotizacion}
            editarCotizacion={editarCotizacion}
            abrirPagos={abrirPagos}
          />
        );
        break;

      case 'calendario':
        contenido = (
          <Calendario
            goHome={volverDashboard}
            abrirCotizacion={abrirCotizacion}
            editarCotizacion={editarCotizacion}
          />
        );
        break;

      case 'ver-cotizacion':
        contenido = (
          <VerCotizacion
            cotizacionId={cotizacionId}
            goHome={volverDashboard}
            nuevaCotizacion={nuevaCotizacion}
          />
        );
        break;

      case 'pagos-cotizacion':
        contenido = (
          <PagosCotizacion
            cotizacionId={cotizacionId}
            goBack={() => setPage('cotizaciones')}
          />
        );
        break;

      case 'comisiones':
        contenido = <Comisiones goHome={volverDashboard} />;
        break;

      case 'usuarios':
        contenido = <Usuarios goHome={volverDashboard} />;
        break;

      case 'formatos':
        contenido = <Formatos goHome={volverDashboard} />;
        break;

      case 'tipos-evento':
        contenido = <TiposEvento goHome={volverDashboard} />;
        break;

      default:
        contenido = (
          <Dashboard
            session={session}
            goTarifas={() => setPage('tarifas')}
            goClientes={() => setPage('clientes')}
            goNuevaCotizacion={nuevaCotizacion}
            goCotizaciones={() => setPage('cotizaciones')}
            goCalendario={() => setPage('calendario')}
            goComisiones={() => setPage('comisiones')}
            goUsuarios={() => setPage('usuarios')}
            goFormatos={() => setPage('formatos')}
            goTiposEvento={() => setPage('tipos-evento')}
          />
        );
        break;
    }
  }

  return (
    <>
      {contenido}

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '14px',
            fontWeight: 600,
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </>
  );
}
