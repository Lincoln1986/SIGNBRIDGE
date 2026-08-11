import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/UI';
import { Footer } from '../components/Footer';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar mínimo */}
      <nav style={{
        background: 'var(--white)', borderBottom: '1px solid var(--gray-100)',
        padding: '0 40px', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Logo size="sm" />
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: '1.5px solid var(--gray-200)', color: 'var(--gray-600)',
            padding: '6px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600,
            fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          ← Volver
        </button>
      </nav>

      <main style={{ flex: 1, maxWidth: 820, margin: '0 auto', width: '100%', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            Información legal
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--gray-800)', marginBottom: 12,
          }}>
            Política de Privacidad y Cookies
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
            Última actualización: enero de 2026 · SignBridge — Proyecto educativo SENA
          </p>
        </div>

        {/* Sections */}
        {[
          {
            title: '1. Responsable del tratamiento',
            body: `SignBridge es un proyecto educativo desarrollado por aprendices del SENA (Servicio Nacional de Aprendizaje de Colombia). Los datos recopilados se usan exclusivamente con fines académicos y demostrativos en el contexto de la plataforma.`,
          },
          {
            title: '2. Datos que recopilamos',
            body: `Recopilamos los siguientes datos cuando te registras o usas la plataforma:
• Nombre completo, correo electrónico, teléfono y ciudad.
• Historial de traducciones realizadas (texto, voz y señas).
• Palabras marcadas como favoritas.
• Tickets de soporte enviados.
• Valoraciones y feedback proporcionados.
• Registros de acceso (fecha, hora y actividad general).`,
          },
          {
            title: '3. Finalidad del tratamiento',
            body: `Los datos se usan para:
• Identificarte y gestionar tu cuenta en la plataforma.
• Mostrarte tu historial de uso y estadísticas personales.
• Mejorar la plataforma a partir de las traducciones y el feedback.
• Proporcionar soporte técnico cuando lo solicites.`,
          },
          {
            title: '4. Cookies y tecnologías similares',
            body: `SignBridge utiliza las siguientes cookies:

Cookies esenciales (no requieren consentimiento):
• session_token — mantiene tu sesión activa mientras usas la plataforma.
• cookie_consent — recuerda si ya aceptaste o rechazaste las cookies analíticas.

Cookies analíticas (requieren tu consentimiento):
• usage_stats — almacena información anónima sobre las funcionalidades que usas, para mejorar la experiencia.

Puedes gestionar o eliminar las cookies desde la configuración de tu navegador en cualquier momento.`,
          },
          {
            title: '5. Conservación de datos',
            body: `Tus datos se conservarán mientras tu cuenta esté activa. Al eliminar tu cuenta, los datos serán eliminados de nuestros sistemas en un plazo máximo de 30 días, salvo obligación legal en contrario.`,
          },
          {
            title: '6. Derechos del usuario',
            body: `Tienes derecho a:
• Acceder a los datos que tenemos sobre ti.
• Rectificar datos incorrectos.
• Solicitar la eliminación de tu cuenta y datos.
• Oponerte al tratamiento de tus datos.

Para ejercer estos derechos, escríbenos a signbridge@sena.edu.co.`,
          },
          {
            title: '7. Seguridad',
            body: `Implementamos medidas técnicas y organizativas para proteger tus datos: cifrado de contraseñas con hashing seguro, comunicación HTTPS y acceso restringido por roles. No obstante, ningún sistema es 100 % infalible; te recomendamos usar contraseñas seguras y únicas.`,
          },
          {
            title: '8. Cambios en esta política',
            body: `Podemos actualizar esta política periódicamente. Te notificaremos de cambios importantes mediante un aviso en la plataforma. La versión vigente siempre estará disponible en esta página.`,
          },
          {
            title: '9. Contacto',
            body: `Si tienes preguntas sobre esta política, contáctanos:\n✉️ signbridge@sena.edu.co`,
          },
        ].map(s => (
          <section key={s.title} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.05rem', color: 'var(--violet)', marginBottom: 10,
            }}>
              {s.title}
            </h2>
            <div style={{
              background: 'var(--white)', borderRadius: 'var(--radius)',
              border: '1px solid var(--gray-100)', padding: '18px 22px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{
                color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.75,
                whiteSpace: 'pre-line', margin: 0,
              }}>
                {s.body}
              </p>
            </div>
          </section>
        ))}
      </main>

      <Footer />
    </div>
  );
}
