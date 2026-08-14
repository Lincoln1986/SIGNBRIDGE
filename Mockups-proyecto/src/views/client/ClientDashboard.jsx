import React from 'react';

const ClientDashboard = () => {
  return (
    <div>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Hola, Juan 👋</h2>
        <p style={{ color: '#64748b', margin: '0.2rem 0 0 0' }}>juan@test.com</p>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>0</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Traducciones realizadas</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eab308' }}>0</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Palabras favoritas</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#64748b' }}>0</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Tickets de soporte</div>
        </div>
      </div>

      {/* Información del Perfil */}
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Información de perfil</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div><strong>Nombre Completo:</strong> Juan Pérez</div>
          <div><strong>Correo:</strong> juan@test.com</div>
          <div><strong>Teléfono:</strong> 3001234567</div>
          <div><strong>Rol:</strong> Cliente</div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;