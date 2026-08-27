import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../api/client';
import { Card, Spinner, Alert, Badge, StatCard, Btn } from '../components/UI';

type FilterTab = 'all' | 'unread' | 'read';

const TYPE_ICONS: Record<string, string> = {
  info: '\u2139\uFE0F',
  support: '\uD83C\uDFAB',
  warning: '\u26A0\uFE0F',
  success: '\u2705',
};

const TYPE_LABELS: Record<string, string> = {
  info: 'Info',
  support: 'Soporte',
  warning: 'Advertencia',
  success: 'Exito',
};

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD}d`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    notificationsApi.list(false, 100)
      .then(r => setItems(r.data))
      .catch(() => setError('No se pudieron cargar las notificaciones'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const unreadCount = useMemo(() => items.filter(n => !n.is_read).length, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter === 'unread') result = result.filter(n => !n.is_read);
    if (filter === 'read') result = result.filter(n => n.is_read);
    if (typeFilter !== 'all') result = result.filter(n => n.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, typeFilter, search]);

  const availableTypes = useMemo(() => {
    const types = new Set(items.map(n => n.type));
    return Array.from(types).sort();
  }, [items]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems(prev => prev.map(n => n.id_notification === id ? { ...n, is_read: true } : n));
    } catch {
      setError('No se pudo marcar como leida');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      flash('Todas las notificaciones marcadas como leidas');
    } catch {
      setError('No se pudieron marcar todas como leidas');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.remove(id);
      setItems(prev => prev.filter(n => n.id_notification !== id));
      flash('Notificacion eliminada');
    } catch {
      setError('No se pudo eliminar la notificacion');
    }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.is_read) handleMarkRead(n.id_notification);
    setExpandedId(expandedId === n.id_notification ? null : n.id_notification);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Centro de notificaciones
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4,
        }}>
          Notificaciones
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>
          Revisa las actualizaciones de tus tickets, respuestas del equipo de soporte y mas.
        </p>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert type="error" message={error} /></div>}
      {success && <div style={{ marginBottom: 16 }}><Alert type="success" message={success} /></div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total" value={items.length} icon={'\uD83D\uDD14'} />
        <StatCard label="Sin leer" value={unreadCount} icon={'\uD83D\uDD34'} accent={unreadCount > 0} />
        <StatCard label="Leidas" value={items.length - unreadCount} icon={'\u2705'} />
      </div>

      {/* Toolbar */}
      <Card style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gray-400)', fontSize: '0.85rem', pointerEvents: 'none',
            }}>
              {'\uD83D\uDD0D'}
            </span>
            <input
              placeholder="Buscar notificaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 34px',
                border: '1.5px solid var(--gray-200)', borderRadius: 8,
                fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--font-body)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', background: 'var(--gray-50)', borderRadius: 8, padding: 3, gap: 3, border: '1px solid var(--gray-100)' }}>
            <button onClick={() => setTypeFilter('all')} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
              background: typeFilter === 'all' ? 'var(--white)' : 'transparent',
              color: typeFilter === 'all' ? 'var(--violet)' : 'var(--gray-400)',
              boxShadow: typeFilter === 'all' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.12s',
            }}>
              Todos
            </button>
            {availableTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                background: typeFilter === t ? 'var(--white)' : 'transparent',
                color: typeFilter === t ? 'var(--violet)' : 'var(--gray-400)',
                boxShadow: typeFilter === t ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.12s',
              }}>
                {TYPE_ICONS[t] || '\u2139\uFE0F'} {TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
            {unreadCount > 0 && (
              <Btn size="sm" variant="ghost" onClick={handleMarkAllRead}>
                Marcar todo leido
              </Btn>
            )}
          </div>
        </div>

        {/* Read/Unread tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {([
            { id: 'all' as FilterTab, label: 'Todas', icon: '\uD83D\uDCCB' },
            { id: 'unread' as FilterTab, label: `Sin leer (${unreadCount})`, icon: '\uD83D\uDD34' },
            { id: 'read' as FilterTab, label: 'Leidas', icon: '\u2705' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
              background: filter === tab.id ? 'var(--violet)' : 'var(--gray-100)',
              color: filter === tab.id ? 'white' : 'var(--gray-600)',
              transition: 'all 0.12s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{'\uD83D\uDD14'}</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
          }}>
            {search || typeFilter !== 'all' || filter !== 'all'
              ? 'No se encontraron notificaciones'
              : 'No tienes notificaciones'}
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
            {search || typeFilter !== 'all' || filter !== 'all'
              ? 'Intenta con otros filtros o limpiando la busqueda.'
              : 'Cuando haya novedades, apareceran aqui.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(n => {
            const isExpanded = expandedId === n.id_notification;
            return (
              <div
                key={n.id_notification}
                onClick={() => handleClick(n)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  background: n.is_read ? 'var(--white)' : 'var(--violet-light)',
                  border: isExpanded
                    ? '1.5px solid var(--violet)'
                    : n.is_read
                      ? '1px solid var(--gray-100)'
                      : '1.5px solid rgba(91,79,207,0.2)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: n.is_read ? 'var(--gray-50)' : 'var(--violet)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>
                    {TYPE_ICONS[n.type] || '\u2139\uFE0F'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontWeight: 700, fontSize: '0.92rem',
                        color: 'var(--gray-800)',
                      }}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'var(--violet)', flexShrink: 0,
                        }} />
                      )}
                      <Badge
                        label={TYPE_LABELS[n.type] || n.type}
                        variant={n.type === 'support' ? 'amber' : n.type === 'success' ? 'success' : n.type === 'warning' ? 'danger' : 'default'}
                      />
                    </div>
                    <p style={{
                      fontSize: '0.85rem', color: 'var(--gray-500)',
                      lineHeight: 1.5, margin: 0,
                    }}>
                      {n.message}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        marginTop: 12, paddingTop: 12,
                        borderTop: '1px solid var(--gray-100)',
                      }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                          Recibida: {formatFullDate(n.created_at)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!n.is_read && (
                            <Btn size="sm" variant="ghost" onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(n.id_notification);
                            }}>
                              Marcar como leida
                            </Btn>
                          )}
                          {n.link && (
                            <Btn size="sm" onClick={(e) => {
                              e.stopPropagation();
                              navigate(n.link!);
                            }}>
                              Ir a {n.link === '/dashboard' ? 'Mi Panel' : n.link}
                            </Btn>
                          )}
                          <Btn size="sm" variant="danger" onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id_notification);
                          }}>
                            Eliminar
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <span style={{
                    fontSize: '0.72rem', color: 'var(--gray-400)',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {formatRelativeDate(n.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
