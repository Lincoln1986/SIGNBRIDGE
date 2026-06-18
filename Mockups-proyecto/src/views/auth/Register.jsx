import React from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Crea tu cuenta</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Únete a la comunidad SignBridge</p>
      <form onSubmit={(e) => { e.preventDefault(); navigate('/login'); }}>
        <div style={{ marginBottom: '1rem' }}><label>Nombre Completo</label><input type="text" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
        <div style={{ marginBottom: '1rem' }}><label>Teléfono</label><input type="tel" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
        <div style={{ marginBottom: '1rem' }}><label>Correo electrónico</label><input type="email" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
        <div style={{ marginBottom: '1.5rem' }}><label>Región de Colombia</label><input type="text" placeholder="Ej: Bogotá, Bucaramanga" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
        <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Registrarse</button>
      </form>
    </div>
  );
};

export default Register;