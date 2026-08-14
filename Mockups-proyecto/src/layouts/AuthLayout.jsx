import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc' }}>
      {/* Columna Izquierda: Identidad Visual */}
      <div style={{ 
        flex: 1, 
        backgroundColor: '#2563eb', // El azul vibrante de tu app
        color: 'white', 
        padding: '3rem', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center' 
      }}>
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🤟 Bridge
          </h1>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#e0f2fe', marginBottom: '2.5rem' }}>
            Plataforma de traducción entre lenguaje de señas colombiano y texto/voz en tiempo real.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>🎙️ Traducción voz a señas</div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>👋 Señas a texto</div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>🇨🇴 Regiones de Colombia</div>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Formulario dinámico */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;