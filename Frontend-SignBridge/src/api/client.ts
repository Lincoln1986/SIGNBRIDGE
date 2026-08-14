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
  rating: number;         // 1-5
  comment?: string;
  date?: string;          // el backend devuelve "date", no "created_at"
  created_at?: string;    // alias por compatibilidad
}

export interface SupportTicket {
  id_support?: string;    // el backend devuelve "id_support"
  id_ticket?: string;     // alias por compatibilidad
  id_user?: string;
  subject: string;
  message?: string;       // el backend usa "message", no "description"
  description?: string;   // alias por compatibilidad
  status?: 'open' | 'in_progress' | 'closed' | string;
  date?: string;          // el backend devuelve "date"
  created_at?: string;    // alias por compatibilidad
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
   * POST /feedback — registra feedback para una sesión de traducción.
   * id_session es obligatorio y debe venir de la respuesta de /api/traduccion/texto
   * o /api/traduccion/voz — no se genera artificialmente.
   */
  create: (data: { id_session: string; rating: number; comment?: string }) =>
    api.post<FeedbackItem>('/feedback', {
      id_session: data.id_session,
      rating: data.rating,
      comment: data.comment ?? null,
    }),
};

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
};

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