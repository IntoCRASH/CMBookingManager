import { useMemo, useState } from 'react';
import './IndustriaMusical.css';

const CATEGORIES = ['Todos', 'Derechos y regalías', 'Publishing y composición', 'Distribución y máster', 'Contratos y negocio', 'Producción y tecnología', 'Shows y operación'];

const QUESTIONS = [
{category:'Publishing y composición',question:'¿Qué es un publisher o editorial musical?',answer:'Administra los derechos de autor de una composición. Puede registrar obras, recaudar regalías editoriales, buscar sincronizaciones y representar al compositor. No necesariamente controla el máster.',keywords:'publisher editorial publishing compositor'},
{category:'Derechos y regalías',question:'¿Qué es una PRO?',answer:'Es una organización de derechos de ejecución pública. Licencia ciertos usos públicos de música y recauda regalías para compositores y publishers. Ejemplos conocidos incluyen BMI, ASCAP, SESAC y PRS.',keywords:'PRO BMI ASCAP SESAC ejecución pública'},
{category:'Distribución y máster',question:'¿Qué es una distribuidora digital?',answer:'Entrega grabaciones a plataformas como Spotify y Apple Music, recibe ingresos del máster y los liquida al titular de la cuenta según su modelo de comisión o tarifa.',keywords:'distribuidora Spotify Apple Music agregador'},
{category:'Derechos y regalías',question:'¿Cuáles tipos de regalías existen?',answer:'Entre las principales están las regalías del máster, mecánicas, de ejecución pública, sincronización, derechos conexos y ciertos derechos digitales. Una canción puede generar varias a la vez.',keywords:'regalías master mecánicas sincronización'},
{category:'Publishing y composición',question:'Si escribo la letra y mi amigo pone la melodía, ¿quién es autor?',answer:'Ambos son coautores. La letra y la melodía son aportes autorales. Conviene acordar los porcentajes mediante un split sheet antes de publicar.',keywords:'letra melodía coautor split'},
{category:'Publishing y composición',question:'¿Qué es un split sheet?',answer:'Es un documento donde los compositores dejan por escrito quiénes participaron y qué porcentaje pertenece a cada uno. Debe incluir nombres legales, PRO, IPI o CAE, firmas y fecha.',keywords:'split sheet porcentajes autores'},
{category:'Producción y tecnología',question:'¿Qué es un DAW?',answer:'DAW significa Digital Audio Workstation. Es el software usado para grabar, editar, producir, mezclar y masterizar audio, como Cubase, Pro Tools, Logic, Ableton o Studio One.',keywords:'DAW Cubase Pro Tools Logic Ableton'},
{category:'Distribución y máster',question:'¿Qué es un máster?',answer:'Es la grabación final de una canción. Quien controla el máster decide cómo se distribuye, licencia o utiliza esa grabación específica.',keywords:'master grabación fonograma'},
{category:'Publishing y composición',question:'¿Cuál es la diferencia entre composición y máster?',answer:'La composición es la obra: letra, melodía y estructura. El máster es una grabación específica de esa obra. Una composición puede tener muchos másteres.',keywords:'composición master diferencia'},
{category:'Derechos y regalías',question:'¿Qué son las regalías mecánicas?',answer:'Son pagos generados cuando una composición se reproduce o distribuye en formatos físicos, descargas y determinados usos digitales. Corresponden a compositores y publishers.',keywords:'mecánicas reproducción'},
{category:'Derechos y regalías',question:'¿Qué son las regalías de ejecución pública?',answer:'Se generan cuando una composición se interpreta o comunica públicamente, por ejemplo en radio, televisión, conciertos, negocios o ciertos servicios digitales.',keywords:'ejecución pública radio concierto'},
{category:'Derechos y regalías',question:'¿Qué son los derechos conexos?',answer:'Son derechos relacionados con la interpretación y la grabación, distintos del derecho de autor de la composición. Pueden corresponder a intérpretes y productores fonográficos.',keywords:'derechos conexos intérprete'},
{category:'Derechos y regalías',question:'¿Qué es una licencia de sincronización?',answer:'Es el permiso para usar una composición junto con imágenes en películas, series, publicidad, videojuegos o contenido audiovisual. También puede requerirse licencia del máster.',keywords:'sync sincronización cine publicidad'},
{category:'Distribución y máster',question:'¿Qué diferencia hay entre una distribuidora y un sello?',answer:'La distribuidora entrega música a plataformas y procesa ingresos. Un sello puede financiar, producir, promocionar, invertir y adquirir o administrar derechos.',keywords:'distribuidora sello disquera'},
{category:'Contratos y negocio',question:'¿Qué es un contrato 360?',answer:'Es un acuerdo donde una compañía participa en varias fuentes de ingresos del artista, como grabaciones, shows, patrocinios y merchandising.',keywords:'contrato 360'},
{category:'Contratos y negocio',question:'¿Qué significa recoupable o recuperable?',answer:'Significa que un adelanto o gasto debe recuperarse con ingresos futuros antes de que el artista reciba ciertas regalías. El detalle depende del contrato.',keywords:'recoupable recuperable adelanto'},
{category:'Contratos y negocio',question:'¿Qué es un adelanto?',answer:'Es dinero pagado por anticipado contra ingresos futuros. Suele estar sujeto a recuperación según las condiciones del contrato.',keywords:'adelanto advance'},
{category:'Publishing y composición',question:'¿Qué es el IPI o CAE?',answer:'Es un identificador internacional de autores, compositores y publishers dentro de los sistemas de gestión colectiva.',keywords:'IPI CAE'},
{category:'Publishing y composición',question:'¿Qué es un ISWC?',answer:'Es un identificador internacional para una composición musical. Identifica la obra, no la grabación.',keywords:'ISWC composición'},
{category:'Distribución y máster',question:'¿Qué es un ISRC?',answer:'Es un código internacional para una grabación específica. Versiones distintas, como remixes o grabaciones en vivo, suelen llevar códigos diferentes.',keywords:'ISRC grabación'},
{category:'Distribución y máster',question:'¿Qué es un UPC o EAN?',answer:'Es el código que identifica comercialmente un lanzamiento completo, como un sencillo, EP o álbum. El ISRC identifica cada pista.',keywords:'UPC EAN álbum'},
{category:'Publishing y composición',question:'¿Debo registrar una canción antes de publicarla?',answer:'Es recomendable documentar autoría y registrar la obra cerca del lanzamiento. El registro facilita la prueba de titularidad y la recaudación.',keywords:'registrar canción copyright'},
{category:'Publishing y composición',question:'¿Puedo usar un sample de otra canción?',answer:'Normalmente necesitas autorización del dueño del máster y del titular de la composición. Una muestra corta también puede generar reclamaciones.',keywords:'sample muestra clearance'},
{category:'Publishing y composición',question:'¿Qué es una interpolación?',answer:'Es volver a grabar una melodía, letra o elemento reconocible de otra composición sin usar el audio original. Aun así suele requerir autorización de la composición.',keywords:'interpolación'},
{category:'Producción y tecnología',question:'¿Qué es un stem?',answer:'Es una mezcla parcial de grupos de pistas, como voces, batería o instrumentos. Se usa para shows, remixes, sincronización y mezclas inmersivas.',keywords:'stem pistas'},
{category:'Producción y tecnología',question:'¿Cuál es la diferencia entre mezcla y mastering?',answer:'La mezcla equilibra y procesa las pistas individuales. El mastering optimiza la mezcla final para distribución y coherencia entre formatos.',keywords:'mezcla mastering'},
{category:'Shows y operación',question:'¿Qué es un rider técnico?',answer:'Es el documento que especifica necesidades de audio, backline, micrófonos, monitores, escenario, iluminación, energía, personal y montaje.',keywords:'rider técnico'},
{category:'Shows y operación',question:'¿Qué es un hospitality rider?',answer:'Detalla necesidades de camerino, alimentos, bebidas, transporte, alojamiento, seguridad y atención del artista y su equipo.',keywords:'hospitality rider'},
{category:'Shows y operación',question:'¿Qué es un stage plot?',answer:'Es un diagrama del escenario que muestra posiciones de músicos, instrumentos, micrófonos, monitores y conexiones.',keywords:'stage plot'},
{category:'Shows y operación',question:'¿Qué es un input list?',answer:'Es la lista numerada de entradas de audio necesarias para el show, incluyendo fuente, micrófono o DI, canal y observaciones.',keywords:'input list'},
{category:'Shows y operación',question:'¿Qué hace un road manager?',answer:'Coordina horarios, transporte, hoteles, pagos, montaje, personal y comunicación durante viajes y presentaciones.',keywords:'road manager'},
{category:'Shows y operación',question:'¿Qué hace un booking agent?',answer:'Busca, negocia y cierra presentaciones. Puede trabajar por comisión y coordina contratos, disponibilidad y condiciones económicas.',keywords:'booking agent'},
{category:'Contratos y negocio',question:'¿Qué hace un manager artístico?',answer:'Coordina la estrategia general de carrera: equipo, lanzamientos, negociaciones, alianzas, prioridades e imagen.',keywords:'manager artístico'},
{category:'Contratos y negocio',question:'¿Qué diferencia hay entre manager, booking agent y publicista?',answer:'El manager coordina la estrategia general; el booking agent consigue shows; el publicista trabaja prensa, medios y comunicación.',keywords:'manager booking publicista'},
{category:'Contratos y negocio',question:'¿Qué es un EPK?',answer:'Es un Electronic Press Kit con biografía, fotos, música, videos, prensa, logros, datos de contacto y materiales para venues y compradores.',keywords:'EPK press kit'},
{category:'Contratos y negocio',question:'¿Qué es una cláusula de exclusividad?',answer:'Es una condición que limita con quién, dónde o durante cuánto tiempo puede trabajar una persona o explotarse una obra.',keywords:'exclusividad'},
{category:'Derechos y regalías',question:'¿Qué es SoundExchange?',answer:'Es una organización estadounidense que recauda ciertos derechos digitales relacionados con grabaciones sonoras. No sustituye a una PRO de compositores.',keywords:'SoundExchange'},
{category:'Derechos y regalías',question:'¿Spotify paga directamente al artista?',answer:'Generalmente paga al distribuidor, sello o titular del máster. El artista recibe según sus contratos, propiedad del máster, publishing y registros.',keywords:'Spotify pago artista'},
{category:'Distribución y máster',question:'¿Qué son Content ID y las reclamaciones de YouTube?',answer:'Content ID compara videos con referencias de audio. El titular puede monetizar, rastrear o bloquear usos. Una reclamación no siempre es un strike.',keywords:'YouTube Content ID'},
{category:'Producción y tecnología',question:'¿Qué es metadata musical?',answer:'Son datos como título, artistas, compositores, productores, publishers, ISRC, créditos y porcentajes. Errores en metadata pueden retrasar pagos.',keywords:'metadata'},
{category:'Contratos y negocio',question:'¿Qué significa work for hire?',answer:'Es un acuerdo donde el trabajo puede pertenecer desde el inicio a quien lo encarga, según el contrato y la ley aplicable.',keywords:'work for hire'},
{category:'Publishing y composición',question:'¿Un productor musical también puede ser compositor?',answer:'Sí, si aporta melodía, armonía, letra u otros elementos autorales. Producir no da automáticamente porcentaje de composición; debe acordarse.',keywords:'productor compositor'},
{category:'Contratos y negocio',question:'¿Qué son los puntos de productor?',answer:'Son porcentajes de regalías del máster negociados para el productor. No son lo mismo que participación en la composición.',keywords:'puntos productor'},
{category:'Shows y operación',question:'¿Qué diferencia hay entre venue, promotor y comprador?',answer:'El venue es el lugar; el promotor organiza o asume riesgo comercial; el comprador o talent buyer contrata al artista.',keywords:'venue promotor comprador'}
];

export default function IndustriaMusical({ goBack }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredQuestions = useMemo(() => {
    return QUESTIONS.filter((item) => {
      const categoryMatch =
        activeCategory === 'Todos' ||
        item.category === activeCategory;

      if (!categoryMatch) return false;
      if (!normalizedQuery) return true;

      return [
        item.question,
        item.answer,
        item.category,
        item.keywords,
      ].join(' ').toLowerCase().includes(normalizedQuery);
    });
  }, [activeCategory, normalizedQuery]);

  return (
    <div className="industry-page">
      <header className="industry-heading">
        <div>
          <span className="industry-eyebrow">Educación</span>
          <h1>Industria musical, explicada sin rodeos</h1>
          <p>
            Conceptos esenciales de music business, derechos,
            producción, contratos, distribución y operación de shows.
          </p>
        </div>

        <button type="button" className="industry-back" onClick={goBack}>
          ← Atrás
        </button>
      </header>

      <section className="industry-intro">
        <div className="industry-intro-icon">♪</div>
        <div>
          <span>Diccionario práctico</span>
          <h2>Aprende cómo funciona el negocio detrás de la música</h2>
          <p>
            Busca un término o explora por categorías. Este material
            es educativo y no sustituye asesoría legal, fiscal o contractual.
          </p>
        </div>
      </section>

      <section className="industry-tools">
        <label className="industry-search">
          <span>Buscar una pregunta</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej.: publisher, regalías, DAW..."
          />
        </label>

        <div className="industry-categories">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="industry-results-bar">
        <strong>{filteredQuestions.length}</strong>
        <span>preguntas disponibles</span>
      </div>

      {filteredQuestions.length ? (
        <section className="industry-list">
          {filteredQuestions.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              className="industry-question"
            >
              <summary>
                <div>
                  <span>{item.category}</span>
                  <strong>{item.question}</strong>
                </div>
              </summary>
              <div className="industry-answer">
                <p>{item.answer}</p>
              </div>
            </details>
          ))}
        </section>
      ) : (
        <section className="industry-empty">
          <h2>No encontramos esa pregunta</h2>
          <p>Prueba con otra palabra o cambia la categoría.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('Todos');
            }}
          >
            Ver todas las preguntas
          </button>
        </section>
      )}

      <section className="industry-coming">
        <div>
          <span>Próximamente</span>
          <h2>Quizzes, rutas de aprendizaje y progreso</h2>
          <p>
            Esta base está preparada para convertirse después en
            módulos, evaluaciones y certificados dentro de MiBooking.
          </p>
        </div>
        <strong>Fase 1</strong>
      </section>
    </div>
  );
}
