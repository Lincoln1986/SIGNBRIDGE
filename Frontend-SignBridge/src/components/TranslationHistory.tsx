import { useState, useEffect } from 'react';
import { statsApi } from '../api/client';
import type { HistoryDay, HistorySession } from '../api/client';
import { Card, Spinner, Alert } from './UI';

// ── Helpers ────────────────────────────────────────────────────────────────

const CANAL_META: Record<string, { icono: string; etiqueta: string }> = {
  texto:         { icono: '⌨️', etiqueta: 'Texto → Señas' },
  text_to_sign:  { icono: '⌨️', etiqueta: 'Texto → Señas' },
  voz:           { icono: '🎙️', etiqueta: 'Voz → Señas' },
  voice_to_sign: { icono: '🎙️', etiqueta: 'Voz → Señas' },
  sena:          { icono: '🤟', etiqueta: 'Señas → Texto' },
  'seña':        { icono: '🤟', etiqueta: 'Señas → Texto' },
  sign_to_text:  { icono: '🤟', etiqueta: 'Señas → Texto' },
};

function metaCanal(tipo?: string | null) {
  return CANAL_META[tipo ?? ''] ?? { icono: '🔤', etiqueta: tipo || 'Traducción' };
}

function formatDayLabel(dayStr: string): string {
  // dayStr viene como YYYY-MM-DD (fecha del backend, sin hora)
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().split('T')[0];

  if (dayStr === hoyStr) return 'Hoy';
  if (dayStr === ayerStr) return 'Ayer';

  const d = new Date(`${dayStr}T00:00:00`);
  const texto = d.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ── Una sesión individual ─────────────────────────────────────────────────

function SessionCard({
  session,
  onDelete,
}: {
  session: HistorySession;
  onDelete: (id_session: string) => void;
}) {
  const { icono, etiqueta } = metaCanal(session.translation_type);
  const [eliminando, setEliminando] = useState(false);

  const handleDelete = async () => {
    const descripcion = session.generated_text || etiqueta;
    if (!window.confirm(`¿Eliminar "${descripcion}" de tu historial?`)) return;

    setEliminando(true);
    try {
      await statsApi.eliminarDeHistorial(session.id_session);
      onDelete(session.id_session);
    } catch {
      setEliminando(false);
    }
  };

  return (
    <Card style={{ padding: '12px 16px', opacity: eliminando ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--violet-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', flexShrink: 0,
          }}>
            {icono}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-800)' }}>
              {etiqueta}
            </div>
            {session.generated_text ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', marginTop: 4, fontWeight: 600 }}>
                "{session.generated_text}"
              </div>
            ) : session.signs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {session.signs.map((s, i) => (
                  <span key={i} style={{
                    background: 'var(--violet-light)', color: 'var(--violet)',
                    padding: '2px 9px', borderRadius: 20,
                    fontSize: '0.74rem', fontWeight: 700,
                  }}>
                    {s.word}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>
                Sin señas registradas en esta traducción.
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
            {formatTime(session.date_time)}
          </span>
          <button
            onClick={handleDelete}
            disabled={eliminando}
            title="Eliminar del historial"
            style={{
              background: 'none', border: 'none', cursor: eliminando ? 'default' : 'pointer',
              fontSize: '0.85rem', color: 'var(--gray-400)', padding: 4, lineHeight: 1,
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Barra de búsqueda ──────────────────────────────────────────────────────

function BuscadorHistorial({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: '0.9rem', color: 'var(--gray-400)', pointerEvents: 'none',
      }}>
        🔍
      </span>
      <input
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar por palabra (ej: gracias, hola...)"
        style={{
          width: '100%', padding: '10px 14px 10px 38px',
          border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none',
          background: 'var(--white)', color: 'var(--gray-800)',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
      />
      {valor && (
        <button
          onClick={() => onChange('')}
          title="Limpiar búsqueda"
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', color: 'var(--gray-400)', padding: 4, lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

function TranslationHistory() {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Carga inicial (sin filtro)
  useEffect(() => {
    statsApi
      .miHistorial()
      .then(r => setDays(r.data))
      .catch(() => setError('No se pudo cargar el historial de traducciones'))
      .finally(() => setLoading(false));
  }, []);

  // Búsqueda con debounce: espera 400ms sin que el usuario siga escribiendo
  // antes de consultar al backend, para no mandar una petición por cada letra.
  useEffect(() => {
    // La carga inicial ya trae todo; no repetir la misma consulta al montar.
    if (loading) return;

    const termino = busqueda.trim();
    setBuscando(true);
    const timeoutId = setTimeout(() => {
      statsApi
        .miHistorial(30, termino || undefined)
        .then(r => { setDays(r.data); setError(''); })
        .catch(() => setError('No se pudo buscar en el historial'))
        .finally(() => setBuscando(false));
    }, 400);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const handleDeleteSession = (id_session: string) => {
    setDays(prev =>
      prev
        .map(dia => ({
          ...dia,
          sessions: dia.sessions.filter(s => s.id_session !== id_session),
          total: dia.sessions.filter(s => s.id_session !== id_session).length,
        }))
        .filter(dia => dia.sessions.length > 0)
    );
  };

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      const { data } = await statsApi.exportarHistorialPDF(30, busqueda.trim() || undefined);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'historial-signbridge.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <Spinner size={36} />
      </div>
    );
  }

  const totalTraducciones = days.reduce((acc, d) => acc + d.total, 0);
  const hayBusqueda = busqueda.trim().length > 0;

  // El backend ya ordena las sesiones por fecha descendente; los días
  // también se ordenan del más reciente al más antiguo acá.
  const diasOrdenados = [...days].sort((a, b) => b.day.localeCompare(a.day));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Buscador + exportar PDF */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <BuscadorHistorial valor={busqueda} onChange={setBusqueda} />
        </div>
        <button
          onClick={handleExportarPDF}
          disabled={exportando || days.length === 0}
          style={{
            padding: '10px 16px', borderRadius: 'var(--radius-sm)', cursor: exportando ? 'default' : 'pointer',
            border: '1.5px solid var(--violet)', background: 'var(--violet)', color: 'white',
            fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-body)',
            opacity: exportando || days.length === 0 ? 0.6 : 1, whiteSpace: 'nowrap',
          }}
        >
          {exportando ? 'Generando...' : '📄 Exportar PDF'}
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Resumen */}
      {!hayBusqueda && (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--violet-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', flexShrink: 0,
          }}>
            📊
          </div>
          <div>
            <div style={{
              fontWeight: 800, fontSize: '1.2rem',
              fontFamily: 'var(--font-display)', color: 'var(--gray-800)',
            }}>
              {totalTraducciones} traducción{totalTraducciones !== 1 ? 'es' : ''}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              en {diasOrdenados.length} día{diasOrdenados.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Card>
      )}

      {hayBusqueda && !buscando && (
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: 0 }}>
          {totalTraducciones === 0
            ? `Sin resultados para "${busqueda.trim()}".`
            : `${totalTraducciones} resultado${totalTraducciones !== 1 ? 's' : ''} para "${busqueda.trim()}"`}
        </p>
      )}

      {buscando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={28} />
        </div>
      ) : days.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{hayBusqueda ? '🔍' : '📝'}</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
          }}>
            {hayBusqueda ? 'No se encontraron traducciones' : 'Aún no tienes traducciones'}
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {hayBusqueda
              ? 'Probá con otra palabra o borrá la búsqueda.'
              : 'Usa "Voz a Señas" o "Señas a Texto" para ver tu historial aquí.'}
          </p>
        </Card>
      ) : (
        /* Historial agrupado por día */
        diasOrdenados.map(dia => (
          <div key={dia.day}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              marginBottom: 10, paddingBottom: 6,
              borderBottom: '1.5px solid var(--gray-100)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.92rem', color: 'var(--gray-800)', margin: 0,
              }}>
                📅 {formatDayLabel(dia.day)}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                {dia.total} traducción{dia.total !== 1 ? 'es' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dia.sessions.map(session => (
                <SessionCard key={session.id_session} session={session} onDelete={handleDeleteSession} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Se exportan las dos formas porque distintos archivos del proyecto lo
// importan de manera distinta (`import TranslationHistory from ...` y
// `import { TranslationHistory } from ...`).
export { TranslationHistory };
export default TranslationHistory;