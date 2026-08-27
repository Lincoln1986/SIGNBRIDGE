import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, feedbackApi, supportApi, favoritesApi, lastSession } from '../api/client';
import type { UserDashboardRow, FeedbackItem, SupportTicket, FavoriteWord, SupportResponseItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, Spinner, Alert, Badge, Btn } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

type DashTab = 'overview' | 'favorites' | 'support' | 'feedback';

function TabBar({ active, onChange, isAdmin }: { active: DashTab; onChange: (t: DashTab) => void; isAdmin: boolean }) {
  const allTabs: { id: DashTab; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Mi panel',     icon: '\uD83D\uDCCA' },
    { id: 'favorites', label: 'Favoritos',    icon: '\u2B50' },
    { id: 'support',   label: 'Soporte',      icon: '\uD83C\uDFAB' },
    { id: 'feedback',  label: 'Valoraciones', icon: '\uD83D\uDCAC' },
  ];
  // El rol Admin no gestiona tickets desde su propio panel — eso le corresponde al rol Soporte.
  const tabs = isAdmin ? allTabs.filter(t => t.id !== 'support') : allTabs;

  return (
    <div style={{
      display: 'flex', background: 'var(--gray-50)',
      borderRadius: 12, padding: 4, gap: 4, marginBottom: 28,
      border: '1.5px solid var(--gray-100)', flexWrap: 'wrap',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, minWidth: 110, padding: '10px 8px', borderRadius: 9, border: 'none',
          fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s',
          background: active === t.id ? 'var(--white)' : 'transparent',
          color: active === t.id ? 'var(--violet)' : 'var(--gray-400)',
          boxShadow: active === t.id ? 'var(--shadow-sm)' : 'none',
          fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Star rating
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{
            background: 'none', border: 'none',
            cursor: onChange ? 'pointer' : 'default',
            fontSize: size, padding: 0, lineHeight: 1,
            color: i <= (hover || value) ? '#f59e0b' : '#e5e7eb',
            transition: 'color 0.1s',
          }}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({
  data,
  loading,
  error,
}: {
  data: UserDashboardRow | null;
  loading: boolean;
  error: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { title: 'Ver vocabulario',      desc: 'Explora las senas disponibles en LSC', icon: '&#128218;', color: 'var(--violet)', to: '/vocabulary' },
    { title: 'Traducir voz a senas', desc: 'Convierte audio en lengua de senas',   icon: '&#127897;', color: 'var(--amber)',  to: '/voice-to-sign' },
    { title: 'Senas a texto',        desc: 'Traduce senas capturadas a texto',      icon: '&#9995;',  color: '#10b981',       to: '/sign-to-text' },
  ];

  const goal = 10;
  const progress = data ? Math.min(100, Math.round((data.translations_made / goal) * 100)) : 0;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Spinner size={36} />
    </div>
  );
  if (error) return <Alert type="error" message={error} />;

  return (
    <>
      {/* Banner bienvenida */}
      <Card style={{
        marginBottom: 28,
        background: 'linear-gradient(135deg, var(--violet) 0%, #4338ca 100%)',
        border: 'none', padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2.2rem' }}>&#129335;</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{
              color: 'white', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '1.1rem', marginBottom: 4,
            }}>
              Bienvenido a SignBridge
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Traduce entre Lengua de Senas Colombiana (LSC) y texto/voz en tiempo real.
            </p>
          </div>
        </div>
      </Card>

      {/* Accesos rapidos */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1rem', marginBottom: 14, color: 'var(--gray-800)',
        }}>
          Accesos rapidos
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {quickActions.map(qa => (
            <button
              key={qa.title}
              onClick={() => navigate(qa.to)}
              style={{
                textAlign: 'left', border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius)', background: 'var(--white)',
                padding: 18, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${qa.color}1A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}
                dangerouslySetInnerHTML={{ __html: qa.icon }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-800)' }}>
                  {qa.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  {qa.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          {/* Stat cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16, marginBottom: 28,
          }}>
            <StatCard label="Traducciones realizadas" value={data.translations_made} icon={<span>&#129335;</span>} />
            <StatCard label="Palabras favoritas"      value={data.favorite_words}    icon={<span>&#9733;</span>} accent />
            <StatCard label="Tickets de soporte"      value={data.support_requests}  icon={<span>&#127243;</span>} />
          </div>

          {/* Barra de progreso */}
          <Card style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1rem', color: 'var(--gray-800)',
              }}>
                Progreso de traducciones
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                {data.translations_made} / {goal}
              </span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, var(--violet), var(--amber))',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 8 }}>
              {progress >= 100
                ? 'Meta alcanzada!'
                : `Te faltan ${goal - data.translations_made} traducciones para tu proxima meta`}
            </p>
          </Card>

          {/* Valoracion promedio */}
          <Card style={{ marginBottom: 28 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)',
            }}>
              Tu valoracion promedio
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StarRating value={Math.round(data.average_rating)} size={22} />
              <span style={{
                fontSize: '1.4rem', fontWeight: 800,
                fontFamily: 'var(--font-display)', color: 'var(--gray-800)',
              }}>
                {data.average_rating.toFixed(1)}
              </span>
              <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>de 5.0</span>
            </div>
          </Card>

          {/* Perfil */}
          <Card>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)',
            }}>
              Informacion de perfil
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {([
                { label: 'Nombre completo', value: user?.full_name },
                { label: 'Correo',          value: user?.email },
                { label: 'Telefono',        value: user?.phone },
                { label: 'Ciudad',          value: user?.city ?? '—' },
                { label: 'Region',          value: user?.region ?? '—' },
                { label: 'Rol',             value: <Badge label={user?.role ?? ''} /> },
              ] as { label: string; value: React.ReactNode }[]).map(row => (
                <div key={row.label}>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                  }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Favorites tab
// ─────────────────────────────────────────────────────────────────────────────

function FavoritesTab() {
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    favoritesApi.list()
      .then(r => setFavorites(r.data))
      .catch(() => setError('No se pudieron cargar los favoritos'))
      .finally(() => setLoading(false));
  }, []);

  // El backend usa toggle: mismo POST /favorites/:id tanto agrega como elimina
  const handleRemove = async (fav: FavoriteWord) => {
    const unitId = fav.id_lexicalunit;
    if (!unitId) return;
    setTogglingId(unitId);
    // Optimista: quitar de la lista inmediatamente
    setFavorites(prev => prev.filter(f => f.id_lexicalunit !== unitId));
    try {
      await favoritesApi.toggle(unitId);
    } catch {
      // Revertir si falló
      setFavorites(prev => [...prev, fav]);
      setError('No se pudo eliminar el favorito');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>
            Mi coleccion
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800)' }}>
            Palabras favoritas
            {favorites.length > 0 && (
              <span style={{ color: 'var(--violet)', marginLeft: 6 }}>({favorites.length})</span>
            )}
          </h2>
        </div>
        <a
          href="/vocabulary"
          style={{ fontSize: '0.85rem', color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}
        >
          + Explorar vocabulario
        </a>
      </div>

      {error && <Alert type="error" message={error} />}

      {favorites.length === 0 && !error ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>&#9733;</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
          }}>
            Aun no tienes favoritos
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Ve al vocabulario y marca palabras con &#9733; para guardarlas aqui.
          </p>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 14,
        }}>
          {favorites.map(fav => {
            // FavoriteWordOut del backend: id_lexicalunit, word_text, video_url, created_at
            const displayText = fav.word_text ?? fav.text ?? '—';
            const isRemoving = togglingId === fav.id_lexicalunit;
            return (
              <Card key={fav.id_favorite ?? fav.id_lexicalunit} style={{ padding: 16, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{
                    fontWeight: 800, fontSize: '1.05rem',
                    fontFamily: 'var(--font-display)', color: 'var(--violet)',
                  }}>
                    {displayText}
                  </div>
                  <button
                    onClick={() => handleRemove(fav)}
                    disabled={isRemoving}
                    title="Quitar de favoritos"
                    style={{
                      background: 'none', border: 'none', cursor: isRemoving ? 'not-allowed' : 'pointer',
                      fontSize: '1.1rem', color: '#f59e0b', padding: 2, lineHeight: 1,
                      opacity: isRemoving ? 0.5 : 1,
                    }}
                  >
                    {isRemoving ? '...' : '\u2605'}
                  </button>
                </div>
                {fav.language && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    idioma: {fav.language}
                  </div>
                )}
                {fav.video_url && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--violet)', marginTop: 4, fontWeight: 600 }}>
                    Tiene video
                  </div>
                )}
                {fav.created_at && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 6 }}>
                    Guardado{' '}
                    {new Date(fav.created_at).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short',
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Support tab
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Abierto',    color: '#b45309', bg: '#fef3c7' },
  pending:     { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7' },
  in_progress: { label: 'En proceso', color: '#7c3aed', bg: 'var(--violet-light)' },
  resolved:    { label: 'Resuelto',   color: '#15803d', bg: '#f0fdf4' },
  closed:      { label: 'Cerrado',    color: 'var(--gray-500)', bg: 'var(--gray-100)' },
};

function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, SupportResponseItem[]>>({});
  const [loadingResponses, setLoadingResponses] = useState<string | null>(null);

  useEffect(() => {
    supportApi.list()
      .then(r => setTickets(r.data))
      .catch(() => setError('No se pudieron cargar los tickets'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFormError('Completa todos los campos');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { data } = await supportApi.create({
        subject: subject.trim(),
        description: description.trim(),
      });
      setTickets(prev => [data, ...prev]);
      setSubject('');
      setDescription('');
      setShowForm(false);
      setSuccess('Ticket enviado correctamente. Te responderemos pronto.');
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setFormError('No se pudo enviar el ticket. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>
            Ayuda
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800)' }}>
            Tickets de soporte
            {tickets.length > 0 && (
              <span style={{ color: 'var(--violet)', marginLeft: 6 }}>({tickets.length})</span>
            )}
          </h2>
        </div>
        <Btn size="sm" onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancelar' : '+ Nuevo ticket'}
        </Btn>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Formulario nuevo ticket */}
      {showForm && (
        <Card style={{ border: '1.5px solid var(--violet)' }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 16,
          }}>
            Nuevo ticket de soporte
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formError && <Alert type="error" message={formError} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                Asunto *
              </label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Describe brevemente el problema"
                maxLength={120}
                style={{
                  padding: '10px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                Descripcion *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible..."
                rows={4}
                style={{
                  padding: '10px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem', fontFamily: 'var(--font-body)',
                  outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </Btn>
              <Btn size="sm" type="submit" loading={submitting}>
                Enviar ticket
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de tickets */}
      {tickets.length === 0 && !error ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>&#127243;</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
          }}>
            Sin tickets abiertos
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
            Si tienes algun problema, crea un ticket y te ayudaremos.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map((t, i) => {
            const st = STATUS_META[t.status ?? 'pending'] ?? STATUS_META.pending;
            const bodyText = t.message ?? t.description ?? '';
            const dateStr = t.date ?? t.created_at;
            const ticketId = t.id_support ?? t.id_ticket ?? '';
            const isExpanded = expandedId === ticketId;
            const ticketResponses = responses[ticketId] ?? [];
            const isLoadingResp = loadingResponses === ticketId;

            const toggleExpand = async () => {
              if (isExpanded) { setExpandedId(null); return; }
              setExpandedId(ticketId);
              if (!responses[ticketId] && ticketId) {
                setLoadingResponses(ticketId);
                try {
                  const { data } = await supportApi.getResponses(ticketId);
                  setResponses(prev => ({ ...prev, [ticketId]: data }));
                } catch {}
                finally { setLoadingResponses(null); }
              }
            };

            return (
              <Card key={t.id_support ?? t.id_ticket ?? i} style={{ padding: '16px 20px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 4 }}>
                      {t.subject}
                      {t.has_response && <Badge label="Respuesta disponible" variant="success" />}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.5, margin: 0 }}>
                      {bodyText}
                    </p>
                    {dateStr && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 6 }}>
                        {new Date(dateStr).toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      background: st.bg, color: st.color,
                      padding: '4px 12px', borderRadius: 20,
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                    <button onClick={toggleExpand}
                      style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid var(--gray-200)', background: 'white', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {isExpanded ? 'Ocultar' : 'Ver respuestas'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
                    {isLoadingResp ? (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Cargando respuestas...</div>
                    ) : ticketResponses.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>Sin respuestas aun.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ticketResponses.map(r => (
                          <div key={r.id_response} style={{
                            padding: '10px 14px', borderRadius: 8,
                            background: r.is_auto ? '#fef3c7' : 'var(--violet-light)',
                            fontSize: '0.82rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                {r.responder_name || 'Soporte'}
                                {r.is_auto && <Badge label="Auto" variant="amber" />}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                                {new Date(r.created_at).toLocaleString('es-CO')}
                              </span>
                            </div>
                            <div style={{ color: 'var(--gray-600)', lineHeight: 1.5 }}>{r.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback tab
// ─────────────────────────────────────────────────────────────────────────────

const RATING_LABEL: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

function FeedbackTab() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  // Sesión de traducción más reciente (guardada por VoiceToSign.tsx), necesaria
  // porque el backend exige id_session al crear un feedback.
  const [sessionId] = useState<string | null>(() => lastSession.get());

  useEffect(() => {
    feedbackApi.list()
      .then(r => setFeedbackList(r.data))
      .catch(() => setError('No se pudo cargar el historial de valoraciones'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setFormError('Selecciona una puntuacion'); return; }
    if (!sessionId) {
      setFormError('Traduce algo en "Voz a Señas" primero para poder valorar esa sesión.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { data } = await feedbackApi.create({
        id_session: sessionId,
        rating,
        comment: comment.trim() || undefined,
      });
      setFeedbackList(prev => [data, ...prev]);
      setRating(0);
      setComment('');
      setShowForm(false);
      setSuccess('Gracias por tu valoracion!');
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setFormError('No se pudo enviar la valoracion. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating =
    feedbackList.length > 0
      ? feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length
      : null;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>
            Tu opinion
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800)' }}>
            Valoraciones de sesion
          </h2>
        </div>
        <Btn size="sm" onClick={() => setShowForm(f => !f)} disabled={!sessionId}>
          {showForm ? 'Cancelar' : (sessionId ? '+ Nueva valoracion' : 'Traduce algo primero')}
        </Btn>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      {!sessionId && !error && (
        <Alert type="info" message='Para dejar una valoracion, primero traduce algo en "Voz a Señas".' />
      )}

      {/* Promedio */}
      {avgRating !== null && (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--amber-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
          }}>
            &#9733;
          </div>
          <div>
            <div style={{
              fontWeight: 800, fontSize: '1.5rem',
              fontFamily: 'var(--font-display)', color: 'var(--gray-800)', lineHeight: 1,
            }}>
              {avgRating.toFixed(1)}
              <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--gray-400)' }}> / 5</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 3 }}>
              Promedio de {feedbackList.length} valoracion{feedbackList.length !== 1 ? 'es' : ''}
            </div>
          </div>
          <StarRating value={Math.round(avgRating)} size={22} />
        </Card>
      )}

      {/* Formulario nueva valoracion */}
      {showForm && (
        <Card style={{ border: '1.5px solid var(--violet)' }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 16,
          }}>
            Valorar sesion
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formError && <Alert type="error" message={formError} />}

            <div>
              <label style={{
                fontSize: '0.82rem', fontWeight: 600,
                color: 'var(--gray-600)', display: 'block', marginBottom: 10,
              }}>
                Puntuacion *
              </label>
              <StarRating value={rating} onChange={setRating} size={36} />
              {rating > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 6 }}>
                  {RATING_LABEL[rating]}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                Comentario (opcional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Que te parecio la sesion? Algo que mejorar?"
                rows={3}
                style={{
                  padding: '10px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem', fontFamily: 'var(--font-body)',
                  outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </Btn>
              <Btn size="sm" type="submit" loading={submitting} disabled={rating === 0}>
                Enviar valoracion
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de valoraciones */}
      {feedbackList.length === 0 && !error ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>&#128172;</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
          }}>
            Aun no has dejado valoraciones
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
            Despues de usar la plataforma, comparte tu opinion para ayudarnos a mejorar.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feedbackList.map((fb, i) => (
            <Card key={fb.id_feedback ?? i} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--amber-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', flexShrink: 0,
                  }}>
                    &#9733;
                  </div>
                  <div>
                    <StarRating value={fb.rating} size={18} />
                    {fb.comment && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 6, lineHeight: 1.5 }}>
                        &ldquo;{fb.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                {(fb.date ?? fb.created_at) && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', flexShrink: 0 }}>
                    {new Date((fb.date ?? fb.created_at)!).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [data, setData] = useState<UserDashboardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.user()
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el panel'))
      .finally(() => setLoading(false));
  }, []);

  // Si el rol es Admin y por algún motivo quedó activa la pestaña "support"
  // (p. ej. quedó guardada de una sesión anterior), la regresamos a "overview".
  useEffect(() => {
    if (isAdmin && activeTab === 'support') {
      setActiveTab('overview');
    }
  }, [isAdmin, activeTab]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Mi Panel
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4,
        }}>
          Hola, {user?.full_name?.split(' ')[0]} &#128075;
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>
          {user?.email}
        </p>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />

      {activeTab === 'overview'  && <OverviewTab data={data} loading={loading} error={error} />}
      {activeTab === 'favorites' && <FavoritesTab />}
      {activeTab === 'support' && !isAdmin && <SupportTab />}
      {activeTab === 'feedback'  && <FeedbackTab />}
    </>
  );
}