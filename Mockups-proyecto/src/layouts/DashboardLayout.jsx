import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DashboardLayout = ({ children, userRole, userName, currentTab, setCurrentTab }) => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
      {/* Navbar Superior */}
      <header style={{ backgroundColor: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '1.25rem' }}>SignBridge</span>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            {userRole === 'admin' ? (
              <>
                <button onClick={() => setCurrentTab('adminPanel')} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: currentTab === 'adminPanel' ? 'bold' : 'normal', color: currentTab === 'adminPanel' ? '#2563eb' : '#64748b' }}>Panel Admin</button>
                <button onClick={() => setCurrentTab('vocabulario')} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: currentTab === 'vocabulario' ? 'bold' : 'normal', color: currentTab === 'vocabulario' ? '#2563eb' : '#64748b' }}>Vocabulario</button>
                <button onClick={() => setCurrentTab('estadisticas')} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: currentTab === 'estadisticas' ? 'bold' : 'normal', color: currentTab === 'estadisticas' ? '#2563eb' : '#64748b' }}>Estadísticas</button>
              </>
            ) : (
              <>
                <button onClick={() => setCurrentTab('miPanel')} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: currentTab === 'miPanel' ? 'bold' : 'normal', color: currentTab === 'miPanel' ? '#2563eb' : '#64748b' }}>Mi Panel</button>
                <button onClick={() => setCurrentTab('vocabulario')} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: currentTab === 'vocabulario' ? 'bold' : 'normal', color: currentTab === 'vocabulario' ? '#2563eb' : '#64748b' }}>Vocabulario</button>
              </>
            )}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{userName}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', capitalize: 'true' }}>{userRole}</div>
          </div>
          <button onClick={() => navigate('/login')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Salir</button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;