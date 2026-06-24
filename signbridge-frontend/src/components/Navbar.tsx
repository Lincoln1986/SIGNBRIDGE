import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo, Btn } from './UI';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

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
        <Btn variant="ghost" size="sm" onClick={handleLogout}>Salir</Btn>
      </div>
    </nav>
  );
}