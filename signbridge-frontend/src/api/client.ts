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
      window.location.href = '/login';
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
  full_name: string;
  email: string;
  role_name: string;
  region: string;
  total_translations: number;
  support_tickets: number;
  feedback_count: number;
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

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    first_name: string; last_name: string;
    phone: string; city?: string; email: string; password: string;
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get<UserProfile>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
};

// ── Dashboard ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  admin: () => api.get<AdminDashboardRow[]>('/dashboard/admin'),
  user: () => api.get<UserDashboardRow>('/dashboard/user'),
  stats: () => api.get<SystemStats>('/dashboard/stats'),
  lexicalUnits: () => api.get<LexicalUnit[]>('/dashboard/lexical-units'),
  lexicalUnitsAdmin: () => api.get<LexicalUnitAdmin[]>('/dashboard/lexical-units/admin'),
  createLexicalUnit: (data: { text: string; language: string }) =>
    api.post<LexicalUnitAdmin>('/dashboard/lexical-units', data),
  updateLexicalUnitVideo: (id: string, video_url: string | null) =>
    api.patch<LexicalUnitAdmin>(`/dashboard/lexical-units/${id}/video`, { video_url }),
  deleteLexicalUnit: (id: string) =>
    api.delete(`/dashboard/lexical-units/${id}`),
};
