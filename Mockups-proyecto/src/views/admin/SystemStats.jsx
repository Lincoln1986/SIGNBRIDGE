import React from 'react';

const SystemStats = () => {
  const metricas = [
    { nombre: 'Usuarios', cantidad: 6, color: '#3b82f6', max: 10 },
    { nombre: 'Traducciones', cantidad: 8, color: '#ef4444', max: 10 },
    { nombre: 'Soporte', cantidad: 6, color: '#eab308', max: 10 },
    { nombre: 'Feedbacks', cantidad: 4, color: '#10b981', max: 10 },
  ];

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Estadísticas del sistema</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Resumen de actividad general de la plataforma</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {metricas.map((m, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '500' }}>
              <span>{m.nombre}</span>
              <span>{m.cantidad}</span>
            </div>
            {/* Barra de progreso */}
            <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${(m.cantidad / m.max) * 100}%`, height: '100%', backgroundColor: m.color, transition: 'width 0.5s ease-in-out' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b' }}>3.50</div>
        <div style={{ color: '#eab308', fontSize: '1.25rem', margin: '0.5rem 0' }}>⭐⭐⭐⭐★</div>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Valoración general de la plataforma</div>
      </div>
    </div>
  );
};

export default SystemStats;