import { useState, useEffect } from 'react';
import { historyApi, type GoalProgress } from '../api/history';
import { Card, Spinner } from './UI';

interface GoalProgressCardProps {
  /** Traducciones ya hechas (se puede pasar desde el dashboard si ya se cargó) */
  translationsMade?: number;
}

const DEFAULT_GOAL = 10;

export default function GoalProgressCard({ translationsMade }: GoalProgressCardProps) {
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyApi
      .goalProgress()
      .then(r => setProgress(r.data))
      .catch(() => {
        // Fallback: usar datos del dashboard si el endpoint no existe aún
        if (translationsMade !== undefined) {
          setProgress({
            translations_made: translationsMade,
            goal: DEFAULT_GOAL,
            streak: 0,
            last_goal_date: null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [translationsMade]);

  if (loading) {
    return (
      <Card style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner size={24} />
      </Card>
    );
  }

  const made = progress?.translations_made ?? translationsMade ?? 0;
  const goal = progress?.goal ?? DEFAULT_GOAL;
  const streak = progress?.streak ?? 0;
  const percent = Math.min(100, Math.round((made / goal) * 100));

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1rem', color: 'var(--gray-800)',
        }}>
          🎯 Meta de traducciones
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>
          {made} / {goal}
        </span>
      </div>

      {/* Barra de progreso */}
      <div style={{
        width: '100%', height: 10, background: 'var(--gray-100)',
        borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{
          width: `${percent}%`, height: '100%', borderRadius: 99,
          background: percent >= 100
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : 'linear-gradient(90deg, var(--violet), var(--amber))',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Mensaje y racha */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 10, flexWrap: 'wrap', gap: 8,
      }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
          {percent >= 100
            ? '🎉 ¡Meta alcanzada! Sigue así.'
            : `Te faltan ${goal - made} traducciones para tu próxima meta`}
        </p>

        {streak > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--amber-light)', borderRadius: 20,
            padding: '3px 10px',
          }}>
            <span style={{ fontSize: '0.75rem' }}>🔥</span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#b45309',
            }}>
              Racha: {streak}
            </span>
          </div>
        )}
      </div>

      {/* Progreso visual con puntos */}
      {goal <= 20 && (
        <div style={{
          display: 'flex', gap: 4, marginTop: 12, justifyContent: 'center',
        }}>
          {Array.from({ length: goal }, (_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i < made ? 'var(--violet)' : 'var(--gray-100)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
