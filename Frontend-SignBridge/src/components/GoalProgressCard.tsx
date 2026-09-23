import { useEffect, useState, useCallback } from 'react';
import { statsApi } from '../api/client';
import type { GoalProgress } from '../api/client';
import { Card, Spinner } from './UI';

/**
 * Progreso hacia la meta de traducciones, con reinicio por ciclos.
 *
 * Antes la barra llegaba a "11 / 10" y se quedaba ahí, llena para siempre.
 * Ahora cada meta cumplida reinicia la barra y suma a la racha, y el historial
 * de metas queda a la vista.
 *
 * La racha se calcula en el backend a partir del historial de sesiones, así que
 * también cuenta lo que el usuario ya había traducido antes de esta función.
 */

/** Cuántos segundos queda el cartel en pantalla. */
const DURACION_CARTEL = 11;

/** Recuerda cuántas metas se le habían festejado ya a este usuario. */
const CLAVE_VISTAS = 'signbridge:metas-festejadas';

function metasFestejadas(): number {
  const v = Number(localStorage.getItem(CLAVE_VISTAS));
  return Number.isFinite(v) ? v : 0;
}

// ── Cartel de felicitación ──────────────────────────────────────────────────

function CartelMeta({ numero, onClose }: { numero: number; onClose: () => void }) {
  const [restante, setRestante] = useState(DURACION_CARTEL);

  useEffect(() => {
    const t = setInterval(() => {
      setRestante(s => {
        if (s <= 1) { clearInterval(t); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onClose]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 7000,
        background: 'rgba(15,15,25,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-live="polite"
        style={{
          width: 'min(420px, 100%)', textAlign: 'center',
          background: 'var(--white)', borderRadius: 20, padding: '32px 28px 24px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.32)',
        }}
      >
        <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: 12 }}>🎉</div>

        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.35rem', color: 'var(--gray-800)', margin: '0 0 8px',
        }}>
          ¡Genial, completaste tu meta!
        </h3>

        <p style={{ fontSize: '0.92rem', color: 'var(--gray-600)', lineHeight: 1.6, margin: '0 0 6px' }}>
          Llevás <strong>{numero} meta{numero !== 1 ? 's' : ''}</strong> de traducciones
          cumplida{numero !== 1 ? 's' : ''}. Seguí así, cada seña que traducís
          suma a tu racha.
        </p>

        <p style={{ fontSize: '0.85rem', color: 'var(--violet)', fontWeight: 700, margin: '14px 0 18px' }}>
          Tu barra vuelve a empezar 🚀
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
            background: 'var(--violet)', color: 'white', fontWeight: 700,
            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          ¡Vamos! ({restante})
        </button>
      </div>
    </div>
  );
}

// ── Barra de progreso ───────────────────────────────────────────────────────

export function GoalProgressCard() {
  const [datos, setDatos]       = useState<GoalProgress | null>(null);
  const [cargando, setCargando] = useState(true);
  const [festejar, setFestejar] = useState<number | null>(null);

  useEffect(() => {
    statsApi.miProgreso()
      .then(r => {
        setDatos(r.data);
        // Si cumplió metas nuevas desde la última visita, se felicita una vez.
        if (r.data.metas_completadas > metasFestejadas()) {
          setFestejar(r.data.metas_completadas);
        }
      })
      .catch(() => setDatos(null))
      .finally(() => setCargando(false));
  }, []);

  const cerrarCartel = useCallback(() => {
    if (datos) localStorage.setItem(CLAVE_VISTAS, String(datos.metas_completadas));
    setFestejar(null);
  }, [datos]);

  if (cargando) {
    return (
      <Card style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size={24} />
      </Card>
    );
  }
  if (!datos) return null;

  const porcentaje = Math.min(100, Math.round((datos.en_ciclo_actual / datos.meta) * 100));
  const faltan = datos.meta - datos.en_ciclo_actual;

  return (
    <>
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', margin: 0,
          }}>
            Progreso de traducciones
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-600)' }}>
            {datos.en_ciclo_actual} / {datos.meta}
          </span>
        </div>

        <div style={{
          height: 10, borderRadius: 20, background: 'var(--gray-100)',
          overflow: 'hidden', margin: '10px 0 8px',
        }}>
          <div style={{
            width: `${porcentaje}%`, height: '100%', borderRadius: 20,
            background: 'linear-gradient(90deg, var(--violet), var(--amber))',
            transition: 'width 400ms ease',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: 0 }}>
            {faltan === datos.meta
              ? `Traducí ${datos.meta} veces para completar tu próxima meta`
              : `Te faltan ${faltan} traduccion${faltan !== 1 ? 'es' : ''} para la próxima meta`}
          </p>

          {datos.metas_completadas > 0 && (
            <span style={{
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--violet)',
              background: 'rgba(40,35,188,0.1)', padding: '3px 10px', borderRadius: 20,
            }}>
              🔥 {datos.metas_completadas} meta{datos.metas_completadas !== 1 ? 's' : ''} cumplida{datos.metas_completadas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Historial de metas: qué día se alcanzó cada una */}
        {datos.historial.length > 0 && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--gray-100)', paddingTop: 14 }}>
            <p style={{
              fontSize: '0.76rem', fontWeight: 700, color: 'var(--gray-400)',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
            }}>
              Tus metas cumplidas
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {datos.historial.slice().reverse().map(m => (
                <span
                  key={m.numero}
                  title={m.fecha ? `Alcanzada el ${new Date(m.fecha).toLocaleDateString('es-CO')}` : ''}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px', borderRadius: 20,
                    background: 'var(--gray-100)', fontSize: '0.78rem',
                    color: 'var(--gray-800)', fontWeight: 600,
                  }}
                >
                  🏅 Meta {m.numero}
                  {m.fecha && (
                    <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>
                      · {new Date(m.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {festejar !== null && <CartelMeta numero={festejar} onClose={cerrarCartel} />}
    </>
  );
}