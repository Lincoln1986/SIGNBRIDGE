import { useEffect, useState, useCallback } from 'react';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../api/client';
import { Card, Spinner, Btn } from '../components/UI';

/**
 * Sección de notificaciones.
 *
 * Antes el clic en la campana llevaba al panel de usuario, lo que no tenía
 * sentido para un Administrador: terminaba en una pantalla que no le
 * correspondía. Ahora abre esta página, que sirve para cualquier rol.
 */

const ICONOS: Record<string, string> = {
  ticket_resolved:   '🎫',
  feedback_answered: '💬',
};

const ETIQUETAS: Record<string, string> = {
  ticket_resolved:   'Ticket resuelto',
  feedback_answered: 'Respuesta a tu valoración',
};

type Filtro = 'todas' | 'sin-leer';

function fechaLarga(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

export default function Notifications() {
  const [avisos, setAvisos]     = useState<NotificationItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [filtro, setFiltro]     = useState<Filtro>('todas');

  const cargar = useCallback(() => {
    setCargando(true);
    setError('');
    notificationsApi.list(false, 100)
      .then(r => setAvisos(r.data))
      .catch(() => setError('No se pudieron cargar las notificaciones.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const sinLeer = avisos.filter(a => !a.read_at).length;
  const visibles = filtro === 'sin-leer' ? avisos.filter(a => !a.read_at) : avisos;

  const marcarUna = async (a: NotificationItem) => {
    if (a.read_at) return;
    try {
      await notificationsApi.markRead(a.id_notification);
      setAvisos(prev => prev.map(x => x.id_notification === a.id_notification
        ? { ...x, read_at: new Date().toISOString() } : x));
    } catch { /* sin ruido: es una acción secundaria */ }
  };

  const marcarTodas = async () => {
    try {
      await notificationsApi.markAllRead();
      const ahora = new Date().toISOString();
      setAvisos(prev => prev.map(x => x.read_at ? x : { ...x, read_at: ahora }));
    } catch { /* sin ruido */ }
  };

  const eliminar = async (a: NotificationItem) => {
    try {
      await notificationsApi.remove(a.id_notification);
      setAvisos(prev => prev.filter(x => x.id_notification !== a.id_notification));
    } catch { /* sin ruido */ }
  };

  return (
    <>
      <p style={{
        fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber)',
        textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
      }}>
        Tus avisos
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: '1.7rem', color: 'var(--gray-800)', margin: '4px 0 20px',
      }}>
        Notificaciones {sinLeer > 0 && (
          <span style={{
            fontSize: '0.85rem', fontWeight: 700, color: 'var(--violet)',
            background: 'rgba(91,79,207,0.1)', padding: '3px 10px',
            borderRadius: 20, verticalAlign: 'middle', marginLeft: 8,
          }}>
            {sinLeer} sin leer
          </span>
        )}
      </h1>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center',
                    flexWrap: 'wrap', marginBottom: 18 }}>
        {(['todas', 'sin-leer'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: filtro === f ? 700 : 500,
              fontFamily: 'var(--font-body)',
              border: `1.5px solid ${filtro === f ? 'var(--violet)' : 'var(--gray-200)'}`,
              background: filtro === f ? 'var(--violet)' : 'var(--white)',
              color: filtro === f ? 'white' : 'var(--gray-800)',
            }}
          >
            {f === 'todas' ? 'Todas' : 'Sin leer'}
          </button>
        ))}

        {sinLeer > 0 && (
          <Btn size="sm" variant="ghost" onClick={marcarTodas} style={{ marginLeft: 'auto' }}>
            Marcar todas como leídas
          </Btn>
        )}
      </div>

      {cargando && (
        <Card style={{ display: 'flex', justifyContent: 'center', padding: 44 }}>
          <Spinner size={28} />
        </Card>
      )}

      {!cargando && error && (
        <Card style={{ padding: '20px 24px', border: '1.5px solid #FECACA', background: '#FEF2F2' }}>
          <p style={{ fontSize: '0.88rem', color: '#991B1B', margin: 0 }}>{error}</p>
        </Card>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '44px 24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-400)', margin: 0 }}>
            {filtro === 'sin-leer'
              ? 'No tenés notificaciones sin leer.'
              : 'Todavía no tenés notificaciones.'}
          </p>
        </Card>
      )}

      {!cargando && !error && visibles.map(a => (
        <Card
          key={a.id_notification}
          style={{
            padding: '16px 18px', marginBottom: 10,
            borderLeft: a.read_at ? '4px solid transparent' : '4px solid var(--violet)',
            background: a.read_at ? 'var(--white)' : 'rgba(91,79,207,0.04)',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1.2, flexShrink: 0 }}>
              {ICONOS[a.type] ?? '🔔'}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center',
                            flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {ETIQUETAS[a.type] ?? 'Aviso'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>
                  · {fechaLarga(a.created_at)}
                </span>
              </div>

              <p style={{
                fontSize: '0.95rem', fontWeight: a.read_at ? 500 : 700,
                color: 'var(--gray-800)', margin: '0 0 6px',
              }}>
                {a.title}
              </p>

              {a.body && (
                <p style={{
                  fontSize: '0.87rem', color: 'var(--gray-600)',
                  lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap',
                }}>
                  {a.body}
                </p>
              )}

              <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                {!a.read_at && (
                  <button
                    onClick={() => marcarUna(a)}
                    style={enlace}
                  >
                    ✓ Marcar como leída
                  </button>
                )}
                <button
                  onClick={() => eliminar(a)}
                  style={{ ...enlace, color: '#E5534B' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

const enlace: React.CSSProperties = {
  border: 'none', background: 'none', cursor: 'pointer', padding: 0,
  fontSize: '0.8rem', fontWeight: 600, color: 'var(--violet)',
  fontFamily: 'var(--font-body)',
};
