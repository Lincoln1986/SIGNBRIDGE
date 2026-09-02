import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Types ──────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
  full_name: string;
}

export interface UserProfile {
  id_user: string;
  full_name: string;
  email: string;
  role: string;
  region?: string;
  phone: string;
  city?: string;
}

// ── Admin user management ──────────────────────────────────────────────────

export interface AdminDashboardRow {
  id_user?: string;      // presente en UserAdminRow (/admin/users), ausente en AdminDashboardRow (/dashboard/admin)
  full_name: string;
  email: string;
  role_name: string;
  region?: string | null;
  is_active?: boolean;
  total_translations: number;
  support_tickets: number;
  feedback_count: number;
  created_at?: string | null;
}

export interface RoleOption {
  id_role: string;
  role_name: string;
}

export interface UserDashboardRow {
  full_name: string;
  email: string;
  translations_made: number;
  favorite_words: number;
  average_rating: number;
  support_requests: number;
}

export interface SystemStats {
  total_users: number;
  total_translations: number;
  total_support_requests: number;
  total_feedback: number;
  average_rating?: number;
}

export interface LexicalUnit {
  id_lexicalunit?: string;   // presente si el backend lo incluye en la respuesta pública
  text: string;
  language: string;
  created_at: string;
  updated_at: string;
  video_url?: string;
  average_rating?: number;  // promedio de estrellas de la traducción de esta palabra
  total_ratings?: number;
}

export interface LexicalUnitAdmin {
  id_lexicalunit: string;
  text: string;
  language: string;
  created_at: string;
  updated_at: string;
  video_url?: string;
}

// ── Translation Types ──────────────────────────────────────────────────────

export interface SignToTextResponse {
  detected_sign?: string | null;
  confidence?: number | null;
  message?: string;
}

export interface TextToSignResponse {
  original_text?: string;
  id_session: string;           // el backend siempre lo devuelve — guardarlo para feedback
  signs: SignUnit[];
  untranslated_words?: string[];
  message?: string;
  // campos legacy que usaba el frontend antes de conectar al backend real
  video_url?: string;
  animation_url?: string;
}

export interface VozToSignResponse {
  texto_reconocido?: string;
  id_session: string;           // igual que texto — guardarlo para feedback
  signs: SignUnit[];
  untranslated_words?: string[];
  message?: string;
}

export interface SignUnit {
  word: string;
  video_url?: string | null;
  found: boolean;
}

// ── Feedback, Support & Favorites ─────────────────────────────────────────

export interface FeedbackItem {
  id_feedback?: string;
  id_session?: string;
  id_lexicalunit?: string;   // si viene, es una valoración de una palabra puntual
  rating: number;         // 1-5
  comment?: string;
  date?: string;          // el backend devuelve "date", no "created_at"
  created_at?: string;    // alias por compatibilidad
  is_reviewed?: boolean;
  support_response?: string | null; // respuesta que dio Soporte al revisarla
}

export interface SupportTicket {
  id_support?: string;    // el backend devuelve "id_support"
  id_ticket?: string;     // alias por compatibilidad
  id_user?: string;
  subject: string;
  message?: string;       // el backend usa "message", no "description"
  description?: string;   // alias por compatibilidad
  status?: 'open' | 'in_progress' | 'closed' | string;
  solution?: string | null; // solución que da Soporte al resolver el ticket
  date?: string;          // el backend devuelve "date"
  created_at?: string;    // alias por compatibilidad
}

export interface WordRatingSummary {
  id_lexicalunit: string;
  word: string;
  average_rating: number;
  total_ratings: number;
}

export interface QuickReply {
  key: string;
  text: string;
}

export interface FavoriteWord {
  id_favorite: string;
  id_lexicalunit: string;   // el backend devuelve "id_lexicalunit"
  lexical_unit_id?: string; // alias por compatibilidad
  word_text: string;        // el backend devuelve "word_text", no "text"
  text?: string;            // alias por compatibilidad
  language?: string;
  video_url?: string;
  times_used?: number;
  created_at?: string;
}

// Schema FavoriteWordToggle — respuesta del POST toggle
export interface FavoriteWordToggle {
  action: 'added' | 'removed';
  id_lexicalunit: string;
  word_text?: string;
  id_favorite?: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    first_name: string;
    last_name: string;
    phone: string;
    city: string;       // requerido por el backend
    address: string;    // requerido por el backend
    email: string;
    password: string;
    middle_name?: string;
    second_last_name?: string;
    id_region?: string;
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get<UserProfile>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),

  /** Devuelve lista de ciudades colombianas desde el backend.
   *  Soporta dos formatos de respuesta:
   *  - string[]  (e.g. ["Bogotá","Medellín",...])
   *  - {id_region, region_name, department}[]  */
  getCities: () =>
    api.get<string[] | { id_region?: string; region_name?: string; name?: string; city?: string; department?: string }[]>('/auth/cities'),
};

// ── Dashboard ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  admin: () => api.get<AdminDashboardRow[]>('/dashboard/admin'),
  user: () => api.get<UserDashboardRow>('/dashboard/user'),
  stats: () => api.get<SystemStats>('/dashboard/stats'),
  roles: () => api.get<RoleOption[]>('/dashboard/roles'),
  lexicalUnits: () => api.get<LexicalUnit[]>('/dashboard/lexical-units'),
  lexicalUnitsAdmin: () => api.get<LexicalUnitAdmin[]>('/dashboard/lexical-units/admin'),
  createLexicalUnit: (data: { text: string; language: string }) =>
    api.post<LexicalUnitAdmin>('/dashboard/lexical-units', data),
  updateLexicalUnitVideo: (id: string, video_url: string | null) =>
    api.patch<LexicalUnitAdmin>(`/dashboard/lexical-units/${id}/video`, { video_url }),
  deleteLexicalUnit: (id: string) =>
    api.delete(`/dashboard/lexical-units/${id}`),
};

// ── Admin users CRUD ───────────────────────────────────────────────────────

export const adminUsersApi = {
  /** GET /admin/users — lista usuarios, filtro opcional por estado */
  list: (is_active?: boolean) =>
    api.get<AdminDashboardRow[]>('/admin/users', {
      params: is_active !== undefined ? { is_active } : undefined,
    }),

  /**
   * PATCH /dashboard/users/:id/role — cambia el rol usando el nombre del rol.
   * Usa este endpoint (no /admin/users/:id/role) porque acepta { role_name }
   * directamente sin necesitar el UUID del rol.
   */
  updateRole: (id: string, role_name: string) =>
    api.patch(`/dashboard/users/${id}/role`, { role_name }),

  /** PATCH /admin/users/:id/status — activa o desactiva el usuario */
  setActive: (id: string, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }),

  /**
   * GET /admin/users/export — descarga CSV con Authorization Bearer.
   * Devuelve un Blob para forzar la descarga en el cliente.
   */
  exportCsv: () =>
    api.get('/admin/users/export', { responseType: 'blob' }),
};

// ── Translation ────────────────────────────────────────────────────────────

export const translationApi = {
  /**
   * POST /api/traduccion/frame — detecta seña desde frame base64.
   * Campo del backend: "frame_base64" (no "frame").
   * FrameResponse NO devuelve id_session — SignToText no puede vincular feedback.
   */
  signToText: (frame_base64: string, session_id?: string) =>
    api.post<SignToTextResponse>('/api/traduccion/frame', {
      frame_base64,
      ...(session_id ? { session_id } : {}),
    }),

  /**
   * POST /api/traduccion/texto — traduce texto a secuencia de señas LSC.
   * Devuelve id_session — guardarlo en el frontend para feedback.
   */
  textToSign: (texto: string, session_id?: string) =>
    api.post<TextToSignResponse>('/api/traduccion/texto', {
      texto,
      ...(session_id ? { session_id } : {}),
    }),

  /**
   * POST /api/traduccion/voz — traduce texto dictado por voz a señas LSC.
   * Devuelve id_session — guardarlo en el frontend para feedback.
   */
  vozToSign: (texto_dictado: string, session_id?: string, idioma = 'es-CO') =>
    api.post<VozToSignResponse>('/api/traduccion/voz', {
      texto_dictado,
      idioma,
      ...(session_id ? { session_id } : {}),
    }),
};

// ── Feedback ───────────────────────────────────────────────────────────────

export const feedbackApi = {
  /** GET /feedback/my — historial de valoraciones del usuario */
  list: () => api.get<FeedbackItem[]>('/feedback/my'),
  /**
   * POST /feedback — registra feedback para una sesión de traducción o para
   * la traducción de una palabra puntual (envía id_session o id_lexicalunit).
   */
  create: (data: { id_session?: string; id_lexicalunit?: string; rating: number; comment?: string }) =>
    api.post<FeedbackItem>('/feedback', {
      id_session: data.id_session ?? null,
      id_lexicalunit: data.id_lexicalunit ?? null,
      rating: data.rating,
      comment: data.comment ?? null,
    }),
  /** GET /feedback/word/{id}/summary — promedio de estrellas de la traducción de una palabra */
  wordSummary: (id_lexicalunit: string) =>
    api.get<WordRatingSummary>(`/feedback/word/${id_lexicalunit}/summary`),
  /** GET /feedback/all — todas las valoraciones con datos del usuario (rol Soporte/Admin) */
  listAll: () => api.get<FeedbackItemWithUser[]>('/feedback/all'),
  /** GET /feedback/quick-replies — catálogo de respuestas rápidas (rol Soporte/Admin) */
  quickReplies: () => api.get<QuickReply[]>('/feedback/quick-replies'),
  /**
   * PATCH /feedback/{id}/review — marca/desmarca una valoración como revisada (exclusivo Soporte).
   * Para marcar como revisada hay que enviar `response` (manual) o, si el rating es 4-5,
   * `quickReplyKey` (clave del catálogo de respuestas rápidas).
   */
  setReviewed: (id_feedback: string, is_reviewed: boolean, opts?: { response?: string; quickReplyKey?: string }) =>
    api.patch<FeedbackItem>(`/feedback/${id_feedback}/review`, {
      is_reviewed,
      response: opts?.response ?? null,
      quick_reply: opts?.quickReplyKey ?? null,
    }),
  /** DELETE /feedback/{id} — elimina (oculta) una valoración (rol Soporte/Admin) */
  remove: (id_feedback: string) =>
    api.delete(`/feedback/${id_feedback}`),
};

export interface FeedbackItemWithUser extends FeedbackItem {
  user_full_name: string;
  user_email: string;
  is_reviewed?: boolean;
}

// ── Support tickets ────────────────────────────────────────────────────────

export const supportApi = {
  /** GET /support/my — tickets del usuario autenticado */
  list: () => api.get<SupportTicket[]>('/support/my'),
  /**
   * POST /support — crea ticket. Backend espera { subject, message } (no description).
   */
  create: (data: { subject: string; description: string }) =>
    api.post<SupportTicket>('/support', {
      subject: data.subject,
      message: data.description,
    }),
  /** GET /support/all — todos los tickets con datos del usuario (rol Soporte/Admin, solo lectura para Admin) */
  listAll: () => api.get<SupportTicketWithUser[]>('/support/all'),
  /**
   * PATCH /support/{id}/status — cambia el estado de un ticket (exclusivo rol Soporte).
   * Para pasar a 'resolved' es obligatorio enviar `solution` con el texto de la solución.
   */
  updateStatus: (id_support: string, status: 'pending' | 'in_progress' | 'resolved' | 'closed', solution?: string) =>
    api.patch<SupportTicket>(`/support/${id_support}/status`, { status, solution: solution ?? null }),
};

export interface SupportTicketWithUser extends SupportTicket {
  user_full_name: string;
  user_email: string;
}

// ── Favorite words ─────────────────────────────────────────────────────────

export const favoritesApi = {
  /** GET /favorites/my — palabras favoritas del usuario */
  list: () => api.get<FavoriteWord[]>('/favorites/my'),
  /**
   * POST /favorites/:id_lexicalunit — toggle favorito.
   * El backend lo agrega si no existe, o lo elimina si ya existe.
   * Devuelve { action: "added" | "removed", ... }
   */
  toggle: (id_lexicalunit: string) =>
    api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
  // Mantenemos "add" como alias de toggle para compatibilidad
  add: (id_lexicalunit: string) =>
    api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
  /** No existe DELETE — usar toggle() que hace remove si ya es favorito */
  remove: (id_lexicalunit: string) =>
    api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
};

// ── Última sesión de traducción (para feedback general en "Mi Panel") ──────
// Se guarda el id_session real cada vez que VoiceToSign.tsx genera una
// traducción exitosa. UserDashboard.tsx (pestaña Valoraciones) la usa como
// sesión a valorar, ya que ese formulario no tiene contexto de sesión propio.

const LAST_SESSION_KEY = 'lastSessionId';

export const lastSession = {
  get: (): string | null => localStorage.getItem(LAST_SESSION_KEY),
  set: (id: string) => localStorage.setItem(LAST_SESSION_KEY, id),
  clear: () => localStorage.removeItem(LAST_SESSION_KEY),
};

// ═══════════════════════════════════════════════════════════════════════════
// Estadísticas de interacción con el software
// ═══════════════════════════════════════════════════════════════════════════

export interface TopWordRow {
  id_lexicalunit: string;
  word: string;
  times_translated: number;
  video_url?: string | null;
  /** Promedio de estrellas de la traducción de esta palabra (null si nadie la calificó) */
  average_rating?: number | null;
  total_ratings: number;
}

export interface TranslationTypeRow {
  translation_type: string;   // 'texto' | 'voz' | 'sena'
  total: number;
}

export interface ActivityRow {
  day: string;                // YYYY-MM-DD
  total: number;
}

export interface HistorySign {
  word: string;
  video_url?: string | null;
}

export interface HistorySession {
  id_session: string;
  date_time?: string | null;
  translation_type?: string | null;
  signs: HistorySign[];
}

/** Las traducciones de un día, agrupadas por el backend */
export interface HistoryDay {
  day: string;          // YYYY-MM-DD
  total: number;
  sessions: HistorySession[];
}

export interface TicketStatusRow {
  status: string;
  total: number;
}

export interface OldestPendingTicket {
  id_support: string;
  subject: string;
  status: string;
  fecha?: string | null;
  dias: number;
}

/** Panorama de los tickets de soporte para el panel de administración */
export interface TicketSummary {
  total: number;
  por_estado: TicketStatusRow[];
  sin_resolver: number;
  mas_viejo_pendiente?: OldestPendingTicket | null;
  dias_promedio_resolucion?: number | null;
  resueltos_medidos: number;
}

export interface UnusedSign {
  id_lexicalunit: string;
  word: string;
  video_url?: string | null;
}

export interface GoalMilestone {
  numero: number;
  fecha?: string | null;
}

/** Progreso hacia la meta de traducciones. Se deriva del historial, no hay tabla. */
export interface GoalProgress {
  meta: number;
  total_traducciones: number;
  en_ciclo_actual: number;
  metas_completadas: number;
  historial: GoalMilestone[];
}

export interface InteractionSummary {
  total_sessions: number;
  total_words_translated: number;
  distinct_words_used: number;
  /** Señas del diccionario que todavía nadie usó */
  words_not_found: number;
  active_users: number;
  avg_words_per_session: number;
}

/**
 * statsApi — cómo se usa la aplicación.
 * Los endpoints `mis*` son del usuario autenticado; los `*Global(es)` requieren
 * rol Administrador y devuelven 403 para el resto.
 */
export const statsApi = {
  /** GET /stats/mias/palabras — tus señas más traducidas */
  misPalabras: (limite = 10) =>
    api.get<TopWordRow[]>(`/stats/mias/palabras?limite=${limite}`),
  /** GET /stats/mias/actividad — tus traducciones por día */
  miActividad: (dias = 30) =>
    api.get<ActivityRow[]>(`/stats/mias/actividad?dias=${dias}`),
  /** GET /stats/mias/canales — cómo traducís: texto, voz o seña */
  misCanales: () => api.get<TranslationTypeRow[]>('/stats/mias/canales'),
  /** GET /stats/mias/historial — tus traducciones agrupadas por día */
  miHistorial: (dias = 30) => api.get<HistoryDay[]>(`/stats/mias/historial?dias=${dias}`),

  /** GET /stats/globales/palabras — ranking global de señas más usadas (Admin) */
  palabrasGlobales: (limite = 10) =>
    api.get<TopWordRow[]>(`/stats/globales/palabras?limite=${limite}`),
  /** GET /stats/globales/actividad — traducciones por día del sistema (Admin) */
  actividadGlobal: (dias = 30) =>
    api.get<ActivityRow[]>(`/stats/globales/actividad?dias=${dias}`),
  /** GET /stats/globales/canales — uso por canal de entrada (Admin) */
  canalesGlobales: () => api.get<TranslationTypeRow[]>('/stats/globales/canales'),
  /** GET /stats/globales/resumen — indicadores de interacción (Admin) */
  resumenInteraccion: () => api.get<InteractionSummary>('/stats/globales/resumen'),
  /** GET /stats/globales/sin-usar — señas que nadie tradujo (Admin) */
  senasSinUsar: () => api.get<UnusedSign[]>('/stats/globales/sin-usar'),
  /** GET /stats/globales/tickets — desglose de tickets de soporte (Admin) */
  resumenTickets: () => api.get<TicketSummary>('/stats/globales/tickets'),
  /** GET /stats/mias/progreso — tu racha de metas de traducción */
  miProgreso: () => api.get<GoalProgress>('/stats/mias/progreso'),
};

// ═══════════════════════════════════════════════════════════════════════════
// Notificaciones in-app (la campana del menú)
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationType = 'ticket_resolved' | 'feedback_answered';

export interface NotificationItem {
  id_notification: string;
  type: NotificationType | string;
  title: string;
  body?: string | null;
  /** Id del ticket o de la valoración que originó el aviso */
  reference_id?: string | null;
  read_at?: string | null;
  created_at?: string | null;
}

/** notificationsApi — avisos del usuario autenticado. Cada quien ve solo los suyos. */
export const notificationsApi = {
  /** GET /notifications — mis notificaciones, de la más reciente a la más vieja */
  list: (soloSinLeer = false, limite = 20) =>
    api.get<NotificationItem[]>(`/notifications?solo_sin_leer=${soloSinLeer}&limite=${limite}`),
  /** GET /notifications/unread-count — solo el número, para el punto rojo */
  unreadCount: () => api.get<{ unread: number }>('/notifications/unread-count'),
  /** PATCH /notifications/{id}/read */
  markRead: (id: string) => api.patch<NotificationItem>(`/notifications/${id}/read`),
  /** PATCH /notifications/read-all */
  markAllRead: () => api.patch<{ updated: number; unread: number }>('/notifications/read-all'),
  /** DELETE /notifications/{id} — borrado lógico */
  remove: (id: string) => api.delete(`/notifications/${id}`),
};
