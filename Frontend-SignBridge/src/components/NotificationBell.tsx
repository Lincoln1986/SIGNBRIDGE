import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../api/client';

/**
 * Campana de notificaciones del menú.
 *
 * Cierra la segunda mitad del punto de corrección "el usuario debe poder
 * recibir una notificación" cuando le resuelven un ticket. El correo puede
 * fallar si el SMTP no está configurado; esto siempre funciona.
 *
 * Hoy muestra dos tipos de aviso:
 *   - ticket_resolved   → Soporte resolvió tu ticket (incluye la solución)
 *   - feedback_answered → Soporte respondió tu valoración
 */

const ICONOS: Record<string, string> = {
  ticket_resolved:   '🎫',
  feedback_answered: '💬',
};

/** Todos los avisos llevan a la sección de notificaciones, que sirve para
 *  los tres roles. Antes iban a /dashboard, que para un Admin no aplica. */
const DESTINO = '/notifications';

/** "hace 5 min", "ayer", "12 ago" */
function tiempoRelativo(iso?: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60)    return 'recién';
  if (segundos < 3600)  return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  if (segundos < 172800) return 'ayer';
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [abierto, setAbierto]   = useState(false);
  const [avisos, setAvisos]     = useState<NotificationItem[]>([]);
  const [sinLeer, setSinLeer]   = useState(0);
  const [cargando, setCargando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const refrescarContador = useCallback(() => {
    notificationsApi.unreadCount()
      .then(r => setSinLeer(r.data.unread))
      .catch(() => { /* silencioso: la campana no debe romper el menú */ });
  }, []);

  // Se consulta solo el contador (un entero), no la lista completa.
  useEffect(() => {
    refrescarContador();
    const t = setInterval(refrescarContador, 60000);
    return () => clearInterval(t);
  }, [refrescarContador]);

  // Cerrar al hacer clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  const alternar = () => {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (nuevo) {
      setCargando(true);
      notificationsApi.list(false, 20)
        .then(r => setAvisos(r.data))
        .catch(() => setAvisos([]))
        .finally(() => setCargando(false));
    }
  };

  const abrirAviso = (a: NotificationItem) => {
    // Navegación en la misma pestaña. Abrir una ventana nueva obligaba a
    // volver atrás para seguir trabajando, y además los navegadores la
    // bloquean si la apertura no es inmediata al clic.
    setAbierto(false);
    navigate(DESTINO);

    // Marcar como leída después, sin bloquear la apertura.
    if (!a.read_at) {
      notificationsApi.markRead(a.id_notification)
        .then(() => {
          setAvisos(prev => prev.map(x =>
            x.id_notification === a.id_notification
              ? { ...x, read_at: new Date().toISOString() }
              : x));
          setSinLeer(n => Math.max(0, n - 1));
        })
        .catch(() => { /* la pestaña ya se abrió igual */ });
    }
  };

  const marcarTodas = async () => {
    try {
      const r = await notificationsApi.markAllRead();
      setSinLeer(r.data.unread);
      const ahora = new Date().toISOString();
      setAvisos(prev => prev.map(x => x.read_at ? x : { ...x, read_at: ahora }));
    } catch { /* silencioso */ }
  };

  return (
    <div ref={contenedor} style={{ position: 'relative' }}>
      <button
        onClick={alternar}
        aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
        aria-expanded={abierto}
        title="Notificaciones"
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: '50%',
          border: '1px solid var(--gray-100)', background: 'var(--white)',
          cursor: 'pointer', fontSize: '1.05rem', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        🔔
        {sinLeer > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 18, height: 18, padding: '0 4px',
            borderRadius: 9, background: '#E5534B', color: 'white',
            fontSize: '0.68rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--white)',
          }}>
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          style={{
            position: 'absolute', top: 46, right: 0, zIndex: 4000,
            // En pantallas angostas se ajusta en lugar de salirse del viewport
            width: 'min(360px, calc(100vw - 32px))',
            maxHeight: 'min(460px, calc(100vh - 120px))',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'var(--white)', borderRadius: 14,
            border: '1px solid var(--gray-100)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <button
              onClick={() => { setAbierto(false); navigate(DESTINO); }}
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--gray-800)',
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              Notificaciones
            </button>
            {sinLeer > 0 && (
              <button
                onClick={marcarTodas}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--violet)', fontWeight: 600, fontSize: '0.78rem',
                  fontFamily: 'var(--font-body)', padding: 0,
                }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {cargando && (
              <p style={{ padding: 24, textAlign: 'center', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                Cargando…
              </p>
            )}

            {!cargando && avisos.length === 0 && (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📭</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', margin: 0 }}>
                  No tenés notificaciones todavía.
                </p>
              </div>
            )}

            {!cargando && avisos.map(a => (
              <button
                key={a.id_notification}
                onClick={() => abrirAviso(a)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '12px 16px', display: 'flex', gap: 12,
                  borderBottom: '1px solid var(--gray-100)',
                  background: a.read_at ? 'var(--white)' : 'rgba(91, 79, 207, 0.06)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1.3, flexShrink: 0 }}>
                  {ICONOS[a.type] ?? '🔔'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: '0.85rem',
                    fontWeight: a.read_at ? 500 : 700,
                    color: 'var(--gray-800)', marginBottom: 2,
                  }}>
                    {a.title}
                  </span>
                  {a.body && (
                    <span style={{
                      fontSize: '0.8rem', color: 'var(--gray-400)',
                      lineHeight: 1.4,
                      // Recortar a dos líneas: la solución puede ser larga
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                      {a.body}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    {tiempoRelativo(a.created_at)}
                  </span>
                </span>
                {!a.read_at && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--violet)', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
