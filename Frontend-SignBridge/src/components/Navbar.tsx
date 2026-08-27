import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo, Btn } from './UI';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../api/client';

export function Navbar() {
  const { user, logout, isAdmin, isSupport } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    notificationsApi.unreadCount()
      .then(r => setUnreadCount(r.data.count))
      .catch(() => {});
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };

  const navLink = (to: string, label: string) => {
    const isActive = pathname === to;
    return (
      <button
        key={to}
        onClick={() => navigate(to)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.88rem',
          color: isActive ? 'var(--violet)' : 'var(--gray-600)',
          padding: '6px 0',
          borderBottom: isActive ? '2px solid var(--amber)' : '2px solid transparent',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <nav style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-100)',
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 24 }}>
          {navLink('/home', '🏠 Inicio')}
          {isAdmin
            ? navLink('/admin', '📊 Panel Admin')
            : isSupport
              ? navLink('/support', '🎧 Panel de Soporte')
              : navLink('/dashboard', '📊 Mi Panel')}
          {navLink('/vocabulary', '📚 Vocabulario')}
          {navLink('/voice-to-sign', '🎙️ Voz a Señas')}
          {navLink('/sign-to-text', '🤟 Señas a Texto')}
          {isAdmin && navLink('/stats', '📈 Estadísticas')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)' }}>
            {user?.full_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
            {user?.role}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--violet)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
        }}>
          {user?.full_name?.charAt(0) ?? '?'}
        </div>
        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              if (!showNotifs) {
                notificationsApi.list()
                  .then(r => setNotifs(r.data))
                  .catch(() => {});
                notificationsApi.unreadCount()
                  .then(r => setUnreadCount(r.data.count))
                  .catch(() => {});
              }
              setShowNotifs(s => !s);
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.2rem', position: 'relative', padding: 4,
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -4,
                background: '#ef4444', color: 'white',
                fontSize: '0.6rem', fontWeight: 700,
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 320, maxHeight: 400, overflowY: 'auto',
              background: 'var(--white)', borderRadius: 12,
              border: '1.5px solid var(--gray-100)',
              boxShadow: 'var(--shadow-lg)', zIndex: 200,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-800)' }}>Notificaciones</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      notificationsApi.markAllRead().then(() => {
                        setUnreadCount(0);
                        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
                      }).catch(() => {});
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--violet)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    Marcar todo leído
                  </button>
                )}
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                  Sin notificaciones
                </div>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id_notification}
                    onClick={() => {
                      if (!n.is_read) {
                        notificationsApi.markRead(n.id_notification).then(() => {
                          setUnreadCount(prev => Math.max(0, prev - 1));
                          setNotifs(prev => prev.map(x => x.id_notification === n.id_notification ? { ...x, is_read: true } : x));
                        }).catch(() => {});
                      }
                    }}
                    style={{
                      padding: '10px 16px', borderBottom: '1px solid var(--gray-50)',
                      cursor: 'pointer', background: n.is_read ? 'transparent' : 'var(--violet-light)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--violet-light)')}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-800)', marginBottom: 2 }}>
                      {!n.is_read && <span style={{ color: 'var(--violet)', marginRight: 4 }}>●</span>}
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', lineHeight: 1.4 }}>
                      {n.message.substring(0, 120)}{n.message.length > 120 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 4 }}>
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Btn variant="ghost" size="sm" onClick={handleLogout}>Salir</Btn>
      </div>
    </nav>
  );
}