import { useEffect, useState } from 'react';
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

  if (loading) return <h2>Cargando...</h2>;

  if (!session) return <Login />;

  switch (page) {
    case 'tarifas':
      return <Tarifas goHome={volverDashboard} />;

    case 'clientes':
      return <Clientes goHome={volverDashboard} />;

    case 'nueva-cotizacion':
      return (
<NuevaCotizacion
    session={session}
    cotizacionId={cotizacionId}
    goHome={volverDashboard}
    onCotizacionGuardada={abrirCotizacion}
/>
      );
case 'cotizaciones':
  return (
<Cotizaciones
  goHome={volverDashboard}
  abrirCotizacion={abrirCotizacion}
  editarCotizacion={editarCotizacion}
  abrirPagos={abrirPagos}
/>
  );

case 'calendario':
  return (
    <Calendario
      goHome={volverDashboard}
      abrirCotizacion={abrirCotizacion}
      editarCotizacion={editarCotizacion}
    />
  );

case 'ver-cotizacion':
      return (
        <VerCotizacion
          cotizacionId={cotizacionId}
          goHome={volverDashboard}
          nuevaCotizacion={() => {
            setCotizacionId(null);
            setPage('nueva-cotizacion');
          }}
        />
      );
case 'pagos-cotizacion':
  return (
    <PagosCotizacion
      cotizacionId={cotizacionId}
      goBack={() => setPage('cotizaciones')}
    />
  );
  case 'comisiones':
  return (
    <Comisiones
      goHome={volverDashboard}
    />
  );
  case 'usuarios':
  return (
    <Usuarios
      goHome={volverDashboard}
    />
  );
  case 'formatos':
  return (
    <Formatos
      goHome={volverDashboard}
    />
  );
  case 'tipos-evento':
  return (
    <TiposEvento
      goHome={volverDashboard}
    />
  );
    default:
      return (
        <Dashboard
  session={session}
  goTarifas={() => setPage('tarifas')}
  goClientes={() => setPage('clientes')}
  goNuevaCotizacion={() => setPage('nueva-cotizacion')}
  goCotizaciones={() => setPage('cotizaciones')}
  goCalendario={() => setPage('calendario')}
  goComisiones={() => setPage('comisiones')}
  goUsuarios={() => setPage('usuarios')}
  goFormatos={() => setPage('formatos')}
  goTiposEvento={() => setPage('tipos-evento')}
/>
      );
  }
}