import { useEffect, useState, useRef, useCallback } from 'react';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../api/client';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(() => {
    notificationsApi.unreadCount()
      .then(r => setCount(r.data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsApi.list(false, 20)
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems(prev => prev.map(n => n.id_notification === id ? { ...n, is_read: true } : n));
      setCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setCount(0);
    } catch {}
  };

  const TYPE_ICONS: Record<string, string> = {
    info: 'ℹ️',
    support: '🎫',
    warning: '⚠️',
    success: '✅',
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 8, borderRadius: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: 'white',
            fontSize: '0.6rem', fontWeight: 700,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 400,
          background: 'var(--white)', borderRadius: 12,
          border: '1.5px solid var(--gray-100)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', zIndex: 1000,
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
              Notificaciones
            </span>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--violet)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                Cargando...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                Sin notificaciones
              </div>
            ) : items.map(n => (
              <div
                key={n.id_notification}
                onClick={() => !n.is_read && handleMarkRead(n.id_notification)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--gray-100)',
                  background: n.is_read ? 'transparent' : 'var(--violet-light)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.background = 'var(--gray-50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--violet-light)'; }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>
                    {TYPE_ICONS[n.type] || 'ℹ️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 4 }}>
                      {formatDate(n.created_at)}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--violet)', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
