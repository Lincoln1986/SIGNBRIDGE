import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Bienvenido de nuevo</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Ingresa tus credenciales para continuar</p>
      
      <form onSubmit={(e) => { e.preventDefault(); navigate('/dashboard/client'); }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo electrónico</label>
          <input type="email" placeholder="tu@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Contraseña</label>
          <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
        </div>
        
        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
          <span onClick={() => navigate('/forgot-password')} style={{ color: '#2563eb', fontSize: '0.875rem', cursor: 'pointer' }}>¿Olvidaste tu contraseña?</span>
        </div>
        
        <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1rem' }}>Iniciar sesión</button>
        
        <p style={{ textCentere: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          ¿No tienes cuenta? <span onClick={() => navigate('/register')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '500' }}>Regístrate</span>
        </p>
      </form>
    </div>
  );
};

export default Login;