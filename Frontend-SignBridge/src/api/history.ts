import api from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TranslationHistoryEntry {
  id_session: string;
  date_time: string;
  translation_type: string;
  status: string;
  signs_count: number;
  original_text?: string;
}

export interface GoalProgress {
  translations_made: number;
  goal: number;
  streak: number;
  last_goal_date: string | null;
}

// ── API methods ────────────────────────────────────────────────────────────

export const historyApi = {
  /** GET /dashboard/history — historial de traducciones del usuario autenticado */
  list: () =>
    api.get<TranslationHistoryEntry[]>('/dashboard/history'),

  /** GET /dashboard/goal-progress — progreso hacia la meta de traducciones */
  goalProgress: () =>
    api.get<GoalProgress>('/dashboard/goal-progress'),
};
