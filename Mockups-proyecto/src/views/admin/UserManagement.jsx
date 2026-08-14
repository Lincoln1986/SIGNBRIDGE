import React from 'react';

const UserManagement = () => {
  const usuarios = [
    { id: 4, nombre: 'Carlos Pérez', correo: 'admin@signbridge.com', rol: 'Administrador', region: 'Sin región' },
    { id: 1, nombre: 'Javier Pérez', correo: 'javierperez578@gmail.com', rol: 'Administrador', region: 'Sin región' },
    { id: 3, nombre: 'Juan Pérez', correo: 'juan@test.com', rol: 'Cliente', region: 'Sin región' },
    { id: 5, nombre: 'Luis Gómez', correo: 'luis@mail.com', rol: 'Cliente', region: 'Bucaramanga' },
    { id: 6, nombre: 'María López', correo: 'maria@mail.com', rol: 'Cliente', region: 'Bucaramanga' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Gestión de usuarios</h2>
      
      {/* Mini Kpis del Admin */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0' }}><strong>6</strong> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Usuarios totales</span></div>
        <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0' }}><strong>8</strong> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Traducciones</span></div>
        <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0' }}><strong>6</strong> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Tickets soporte</span></div>
        <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '8px', flex: 1, border: '1px solid #e2e8f0' }}><strong>⭐ 3.5</strong> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Valoración media</span></div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Usuario</th>
              <th style={{ padding: '1rem' }}>Correo</th>
              <th style={{ padding: '1rem' }}>Rol</th>
              <th style={{ padding: '1rem' }}>Región</th>
              <th style={{ padding: '1rem' }}>Traducciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>{u.id}</div>
                  {u.nombre}
                </td>
                <td style={{ padding: '1rem', color: '#64748b' }}>{u.correo}</td>
                <td style={{ padding: '1rem' }}><span style={{ color: u.rol === 'Administrador' ? '#ef4444' : '#2563eb', fontWeight: '500' }}>{u.rol}</span></td>
                <td style={{ padding: '1rem', color: '#64748b' }}>{u.region}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;