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

export interface AdminDashboardRow {
  id_user?: string;
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
  id_lexicalunit?: string;
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

export interface SignToTextResponse {
  detected_sign?: string | null;
  confidence?: number | null;
  message?: string;
}

export interface TextToSignResponse {
  original_text?: string;
  id_session: string;
  signs: SignUnit[];
  untranslated_words?: string[];
  message?: string;
  video_url?: string;
  animation_url?: string;
}

export interface VozToSignResponse {
  texto_reconocido?: string;
  id_session: string;
  signs: SignUnit[];
  untranslated_words?: string[];
  message?: string;
}

export interface SignUnit {
  word: string;
  video_url?: string | null;
  found: boolean;
}

export interface FeedbackItem {
  id_feedback?: string;
  id_session?: string;
  rating: number;
  comment?: string;
  date?: string;
  created_at?: string;
}

export interface SupportTicket {
  id_support?: string;
  id_ticket?: string;
  id_user?: string;
  subject: string;
  message?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  date?: string;
  created_at?: string;
  has_response?: boolean;
}

export interface FavoriteWord {
  id_favorite: string;
  id_lexicalunit: string;
  lexical_unit_id?: string;
  word_text: string;
  text?: string;
  language?: string;
  video_url?: string;
  times_used?: number;
  created_at?: string;
}

export interface FavoriteWordToggle {
  action: 'added' | 'removed';
  id_lexicalunit: string;
  word_text?: string;
  id_favorite?: string;
}

export interface SupportResponseItem {
  id_response: string;
  id_support: string;
  id_responder: string;
  content: string;
  is_auto: boolean;
  created_at: string;
  responder_name?: string;
}

export interface NotificationItem {
  id_notification: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface WordRatingItem {
  id_word_rating: string;
  id_lexicalunit: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface WordRatingStats {
  id_lexicalunit: string;
  word: string;
  language: string;
  total_ratings: number;
  avg_rating: number | null;
  rated_by_users: number;
}

export interface MostUsedPhrase {
  id_lexicalunit: string;
  phrase: string;
  language: string;
  times_used: number;
  unique_users: number;
  video_url?: string;
}

export interface UserInteractionStats {
  id_user: string;
  full_name: string;
  email: string;
  total_sessions: number;
  voice_to_sign_sessions: number;
  sign_to_text_sessions: number;
  favorites_count: number;
  words_translated: number;
  feedbacks_given: number;
  last_session_date?: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    first_name: string;
    last_name: string;
    phone: string;
    city: string;
    address: string;
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
  getCities: () => api.get('/regions'),
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
  list: (is_active?: boolean) =>
    api.get<AdminDashboardRow[]>('/admin/users', {
      params: is_active !== undefined ? { is_active } : undefined,
    }),
  updateRole: (id: string, role_name: string) =>
    api.patch(`/dashboard/users/${id}/role`, { role_name }),
  setActive: (id: string, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }),
  exportCsv: () => api.get('/admin/users/export', { responseType: 'blob' }),
};

// ── Translation ────────────────────────────────────────────────────────────

export const translationApi = {
  signToText: (frame_base64: string, session_id?: string) =>
    api.post<SignToTextResponse>('/api/traduccion/frame', {
      frame_base64,
      ...(session_id ? { session_id } : {}),
    }),
  textToSign: (texto: string, session_id?: string) =>
    api.post<TextToSignResponse>('/api/traduccion/texto', {
      texto,
      ...(session_id ? { session_id } : {}),
    }),
  vozToSign: (texto_dictado: string, session_id?: string, idioma = 'es-CO') =>
    api.post<VozToSignResponse>('/api/traduccion/voz', {
      texto_dictado, idioma,
      ...(session_id ? { session_id } : {}),
    }),
};

// ── Feedback ───────────────────────────────────────────────────────────────

export const feedbackApi = {
  list: () => api.get<FeedbackItem[]>('/feedback/my'),
  create: (data: { id_session: string; rating: number; comment?: string }) =>
    api.post<FeedbackItem>('/feedback', {
      id_session: data.id_session, rating: data.rating, comment: data.comment ?? null,
    }),
  listAll: () => api.get<FeedbackItemWithUser[]>('/feedback/all'),
  setReviewed: (id_feedback: string, is_reviewed: boolean) =>
    api.patch<FeedbackItem>(`/feedback/${id_feedback}/review`, { is_reviewed }),
  remove: (id_feedback: string) => api.delete(`/feedback/${id_feedback}`),
};

export interface FeedbackItemWithUser extends FeedbackItem {
  user_full_name: string;
  user_email: string;
  is_reviewed?: boolean;
}

// ── Support tickets ────────────────────────────────────────────────────────

export const supportApi = {
  list: () => api.get<SupportTicket[]>('/support/my'),
  create: (data: { subject: string; description: string }) =>
    api.post<SupportTicket>('/support', { subject: data.subject, message: data.description }),
  listAll: () => api.get<SupportTicketWithUser[]>('/support/all'),
  updateStatus: (id_support: string, status: 'pending' | 'in_progress' | 'resolved' | 'closed', response?: string) =>
    api.patch<SupportTicket>(`/support/${id_support}/status`, { status, response }),
  getResponses: (id_support: string) =>
    api.get<SupportResponseItem[]>(`/support/${id_support}/responses`),
  respond: (id_support: string, content: string) =>
    api.post<SupportResponseItem>(`/support/${id_support}/respond`, { content }),
  autoRespond: (id_support: string, response_type: string = 'default') =>
    api.post<SupportResponseItem>(`/support/${id_support}/auto-respond`, null, { params: { response_type } }),
};

export interface SupportTicketWithUser extends SupportTicket {
  user_full_name: string;
  user_email: string;
  has_response?: boolean;
}

// ── Favorite words ─────────────────────────────────────────────────────────

export const favoritesApi = {
  list: () => api.get<FavoriteWord[]>('/favorites/my'),
  toggle: (id_lexicalunit: string) => api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
  add: (id_lexicalunit: string) => api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
  remove: (id_lexicalunit: string) => api.post<FavoriteWordToggle>(`/favorites/${id_lexicalunit}`),
};

// ── Notifications ──────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (unread_only = false, limit = 50) =>
    api.get<NotificationItem[]>('/notifications', { params: { unread_only, limit } }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
};

// ── Word Ratings ───────────────────────────────────────────────────────────

export const wordRatingsApi = {
  create: (data: { id_lexicalunit: string; rating: number; comment?: string }) =>
    api.post<WordRatingItem>('/word-ratings', data),
  my: () => api.get<WordRatingItem[]>('/word-ratings/my'),
  stats: () => api.get<WordRatingStats[]>('/word-ratings/stats'),
  statsFor: (id_lexicalunit: string) =>
    api.get<WordRatingStats>(`/word-ratings/stats/${id_lexicalunit}`),
};

// ── Stats ──────────────────────────────────────────────────────────────────

export const statsApi = {
  mostUsedPhrases: (limit = 20) =>
    api.get<MostUsedPhrase[]>('/stats/most-used-phrases', { params: { limit } }),
  userInteraction: () => api.get<UserInteractionStats[]>('/stats/user-interaction'),
  myInteraction: () => api.get<UserInteractionStats>('/stats/my-interaction'),
};

// ── Last session ───────────────────────────────────────────────────────────

const LAST_SESSION_KEY = 'lastSessionId';

export const lastSession = {
  get: (): string | null => localStorage.getItem(LAST_SESSION_KEY),
  set: (id: string) => localStorage.setItem(LAST_SESSION_KEY, id),
  clear: () => localStorage.removeItem(LAST_SESSION_KEY),
};
