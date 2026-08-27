import { useEffect, useState } from 'react';
import { supportApi, feedbackApi, feedbackReplyApi } from '../api/client';
import type { SupportTicketWithUser, FeedbackItemWithUser, FeedbackReply } from '../api/client';
import { Card, Spinner, Alert, Badge, StatCard, Btn } from '../components/UI';

type SupportTab = 'tickets' | 'feedback';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7' },
  in_progress: { label: 'En proceso', color: '#7c3aed', bg: 'var(--violet-light)' },
  resolved:    { label: 'Resuelto',   color: '#15803d', bg: '#f0fdf4' },
  closed:      { label: 'Cerrado',    color: 'var(--gray-500)', bg: 'var(--gray-100)' },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending',     label: 'Pendiente' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'resolved',    label: 'Resuelto' },
  { value: 'closed',      label: 'Cerrado' },
];

function formatDate(iso?: string) {
  if (!iso) return '---';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// -- Tab bar ---------------------------------------------------------------

function TabBar({ active, onChange }: { active: SupportTab; onChange: (t: SupportTab) => void }) {
  const tabs: { id: SupportTab; label: string; icon: string }[] = [
    { id: 'tickets',  label: 'Tickets',      icon: '\uD83C\uDFAB' },
    { id: 'feedback', label: 'Valoraciones', icon: '\uD83D\uDCAC' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1.5px solid var(--gray-100)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-body)',
            color: active === t.id ? 'var(--violet)' : 'var(--gray-400)',
            borderBottom: active === t.id ? '2.5px solid var(--violet)' : '2.5px solid transparent',
            marginBottom: -2, transition: 'all 0.15s',
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// -- Resolve modal (response required) ------------------------------------

function ResolveModal({
  ticketId,
  onClose,
  onResolve,
  resolving,
}: {
  ticketId: string;
  onClose: () => void;
  onResolve: (id: string, response: string) => void;
  resolving: boolean;
}) {
  const [response, setResponse] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 16, padding: 28, width: 440,
        boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-body)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-800)', marginBottom: 4 }}>
          Resolver ticket
        </h3>
        <p style={{ fontSize: '0.83rem', color: 'var(--gray-400)', marginBottom: 16 }}>
          Debes proporcionar una retroalimentacion antes de marcar el ticket como resuelto.
          El usuario recibira una notificacion con tu respuesta.
        </p>
        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          placeholder="Escribe la respuesta o retroalimentacion para el usuario..."
          rows={4}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem', fontFamily: 'var(--font-body)',
            outline: 'none', resize: 'vertical', lineHeight: 1.6,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} disabled={resolving} style={{
            padding: '8px 18px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
            background: 'none', color: 'var(--gray-600)', fontSize: '0.85rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Cancelar
          </button>
          <Btn
            size="sm"
            onClick={() => onResolve(ticketId, response)}
            disabled={!response.trim() || resolving}
            loading={resolving}
          >
            Resolver con retroalimentacion
          </Btn>
        </div>
      </div>
    </div>
  );
}

// -- Tickets tab -----------------------------------------------------------

function TicketsTab() {
  const [tickets, setTickets] = useState<SupportTicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    supportApi.listAll()
      .then(({ data }) => setTickets(data))
      .catch(() => setError('No se pudieron cargar los tickets.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleStatusChange = async (id_support: string, status: string) => {
    if (status === 'resolved') {
      setShowResolveModal(id_support);
      return;
    }
    setUpdatingId(id_support);
    try {
      await supportApi.updateStatus(id_support, status as any);
      setTickets(prev => prev.map(t =>
        (t.id_support ?? t.id_ticket) === id_support ? { ...t, status: status as any } : t
      ));
    } catch {
      setError('No se pudo actualizar el estado del ticket.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResolve = async (id_support: string, responseText: string) => {
    if (!responseText.trim()) {
      setError('Debes proporcionar una retroalimentacion para resolver el ticket.');
      return;
    }
    setUpdatingId(id_support);
    try {
      await supportApi.updateStatus(id_support, 'resolved', responseText.trim());
      setTickets(prev => prev.map(t =>
        (t.id_support ?? t.id_ticket) === id_support
          ? { ...t, status: 'resolved', response: responseText.trim() }
          : t
      ));
      setShowResolveModal(null);
    } catch {
      setError('No se pudo resolver el ticket.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>;
  if (error) return <Alert type="error" message={error} />;

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total tickets" value={tickets.length} icon={'\uD83C\uDFAB'} />
        <StatCard label="Pendientes" value={pendingCount} icon={'\u23F3'} accent={pendingCount > 0} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{
          padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
          background: statusFilter === 'all' ? 'var(--violet)' : 'var(--gray-100)',
          color: statusFilter === 'all' ? 'white' : 'var(--gray-600)',
        }}>
          Todos
        </button>
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setStatusFilter(o.value)} style={{
            padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
            background: statusFilter === o.value ? 'var(--violet)' : 'var(--gray-100)',
            color: statusFilter === o.value ? 'white' : 'var(--gray-600)',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
          No hay tickets con este filtro.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((t, i) => {
            const id = t.id_support ?? t.id_ticket ?? String(i);
            const st = STATUS_META[t.status ?? 'pending'] ?? STATUS_META.pending;
            return (
              <Card key={id} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 4 }}>
                      {t.subject}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                      {t.user_full_name} &middot; {t.user_email} &middot; {formatDate(t.date)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      {t.message ?? t.description}
                    </div>
                    {(t as any).response && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Respuesta del equipo
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          {(t as any).response}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                      color: st.color, background: st.bg, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                    </span>
                    <select
                      value={t.status ?? 'pending'}
                      disabled={updatingId === id}
                      onChange={e => handleStatusChange(id, e.target.value)}
                      style={{
                        padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
                        fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showResolveModal && (
        <ResolveModal
          ticketId={showResolveModal}
          onClose={() => setShowResolveModal(null)}
          onResolve={handleResolve}
          resolving={updatingId === showResolveModal}
        />
      )}
    </>
  );
}

// -- Feedback replies component --------------------------------------------

function FeedbackReplySection({ feedbackId }: { feedbackId: string }) {
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    feedbackReplyApi.list(feedbackId)
      .then(r => setReplies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [feedbackId]);

  const handleReply = async (isAutomatic = false) => {
    const text = isAutomatic
      ? 'Gracias por tu valoracion. Hemos registrado tu opinion y la usaremos para mejorar la plataforma.'
      : replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      const { data } = await feedbackReplyApi.create(feedbackId, text, isAutomatic);
      setReplies(prev => [...prev, data]);
      setReplyText('');
      setShowForm(false);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  return (
    <div style={{ marginTop: 10 }}>
      {loading ? (
        <Spinner size={16} />
      ) : replies.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {replies.map(r => (
            <div key={r.id_reply} style={{
              padding: '8px 12px', borderRadius: 8,
              background: r.is_automatic ? 'var(--gray-50)' : '#f0fdf4',
              border: `1px solid ${r.is_automatic ? 'var(--gray-100)' : '#bbf7d0'}`,
              fontSize: '0.8rem',
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{r.user_full_name}</span>
                {r.is_automatic && <Badge label="Automatica" variant="default" />}
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                  {new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              <div style={{ color: 'var(--gray-600)', lineHeight: 1.5 }}>{r.reply_text}</div>
            </div>
          ))}
        </div>
      ) : null}

      {!showForm ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--violet)',
              background: 'none', color: 'var(--violet)', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Responder
          </button>
          <button
            onClick={() => handleReply(true)}
            disabled={sending}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
              background: 'none', color: 'var(--gray-500)', fontSize: '0.75rem', fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
              opacity: sending ? 0.5 : 1,
            }}
          >
            Respuesta automatica
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={2}
            style={{
              padding: '8px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
              fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setReplyText(''); }} style={{
              padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
              background: 'none', color: 'var(--gray-500)', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              Cancelar
            </button>
            <button
              onClick={() => handleReply(false)}
              disabled={!replyText.trim() || sending}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: replyText.trim() ? 'var(--violet)' : 'var(--gray-200)',
                color: replyText.trim() ? 'white' : 'var(--gray-400)',
                fontSize: '0.75rem', fontWeight: 600,
                cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Feedback admin tab ----------------------------------------------------

function FeedbackAdminTab() {
  const [items, setItems] = useState<FeedbackItemWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    feedbackApi.listAll()
      .then(({ data }) => setItems(data))
      .catch(() => setError('No se pudieron cargar las valoraciones.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleReviewed = async (fb: FeedbackItemWithUser) => {
    const id = fb.id_feedback!;
    setBusyId(id);
    try {
      await feedbackApi.setReviewed(id, !fb.is_reviewed);
      setItems(prev => prev.map(f => f.id_feedback === id ? { ...f, is_reviewed: !fb.is_reviewed } : f));
    } catch { setError('No se pudo actualizar el estado de revision.'); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (fb: FeedbackItemWithUser) => {
    const id = fb.id_feedback!;
    if (!window.confirm('Eliminar esta valoracion? Dejara de contar en el promedio general.')) return;
    setBusyId(id);
    try {
      await feedbackApi.remove(id);
      setItems(prev => prev.filter(f => f.id_feedback !== id));
    } catch { setError('No se pudo eliminar la valoracion.'); }
    finally { setBusyId(null); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>;
  if (error) return <Alert type="error" message={error} />;

  const average = items.length > 0 ? items.reduce((s, f) => s + f.rating, 0) / items.length : 0;
  const lowRatings = items.filter(f => f.rating <= 2).length;
  const pendingReview = items.filter(f => !f.is_reviewed).length;

  const filtered = items.filter(f => {
    if (filter === 'pending') return !f.is_reviewed;
    if (filter === 'reviewed') return !!f.is_reviewed;
    return true;
  });

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Promedio general" value={average.toFixed(1) + ' / 5'} icon={'\u2B50'} />
        <StatCard label="Total valoraciones" value={items.length} icon={'\uD83D\uDCAC'} />
        <StatCard label="Sin revisar" value={pendingReview} icon={'\u23F5\uFE0F'} accent={pendingReview > 0} />
        <StatCard label="Calificaciones bajas (\u22642)" value={lowRatings} icon={'\u26A0\uFE0F'} accent={lowRatings > 0} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Sin revisar' },
          { value: 'reviewed', label: 'Revisadas' },
        ] as const).map(o => (
          <button key={o.value} onClick={() => setFilter(o.value)} style={{
            padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
            background: filter === o.value ? 'var(--violet)' : 'var(--gray-100)',
            color: filter === o.value ? 'white' : 'var(--gray-600)',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
          No hay valoraciones con este filtro.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((f, i) => {
            const id = f.id_feedback ?? String(i);
            const isBusy = busyId === id;
            return (
              <Card key={id} style={{ padding: '14px 18px', opacity: f.is_reviewed ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                      {f.user_full_name} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}> &middot; {f.user_email}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{formatDate(f.date ?? f.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge label={'\u2B50'.repeat(f.rating) + ' ' + f.rating + '/5'} variant={f.rating <= 2 ? 'danger' : f.rating === 3 ? 'amber' : 'success'} />
                    {f.is_reviewed && <Badge label="Revisada" variant="success" />}
                  </div>
                </div>
                {f.comment && (
                  <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--gray-600)' }}>{f.comment}</div>
                )}
                <FeedbackReplySection feedbackId={id} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button onClick={() => handleToggleReviewed(f)} disabled={isBusy} style={{
                    padding: '5px 12px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
                    background: 'white', cursor: isBusy ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                    color: 'var(--gray-600)', opacity: isBusy ? 0.5 : 1,
                  }}>
                    {f.is_reviewed ? 'Marcar como no revisada' : 'Marcar como revisada'}
                  </button>
                  <button onClick={() => handleDelete(f)} disabled={isBusy} style={{
                    padding: '5px 12px', borderRadius: 6, border: '1.5px solid #fecaca',
                    background: 'white', cursor: isBusy ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                    color: '#dc2626', opacity: isBusy ? 0.5 : 1,
                  }}>
                    Eliminar
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// -- Main page -------------------------------------------------------------

export default function SupportDashboard() {
  const [tab, setTab] = useState<SupportTab>('tickets');

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }}>
        Panel de Soporte
      </h1>
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: 24 }}>
        Tickets y valoraciones de todos los usuarios de la plataforma.
      </p>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'tickets' ? <TicketsTab /> : <FeedbackAdminTab />}
    </div>
  );
}
