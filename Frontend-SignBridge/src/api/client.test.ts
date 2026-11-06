import { beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea axios antes de importar el cliente: cada llamada queda registrada
// y se puede verificar la ruta + método sin salir de la red.
vi.mock('axios', () => {
  const instance = {
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return { default: { create: vi.fn(() => instance) } };
});

import api, {
  adminUsersApi,
  authApi,
  dashboardApi,
  favoritesApi,
  feedbackApi,
  lastSession,
  notificationsApi,
  statsApi,
  supportApi,
  translationApi,
} from './client';
import { historyApi } from './history';

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const patch = vi.mocked(api.patch);
const del = vi.mocked(api.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authApi', () => {
  it('register postea a /auth/register', async () => {
    await authApi.register({
      first_name: 'Ana', last_name: 'Torres', phone: '3001234567',
      city: 'Bogotá', address: 'Calle 1', email: 'a@a.co', password: 'Password1!',
    });
    expect(post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ email: 'a@a.co' }));
  });

  it('login postea credenciales', async () => {
    await authApi.login('a@a.co', 'Password1!');
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@a.co', password: 'Password1!' });
  });

  it('me, forgotPassword y resetPassword usan sus rutas', async () => {
    await authApi.me();
    expect(get).toHaveBeenCalledWith('/auth/me');
    await authApi.forgotPassword('a@a.co');
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@a.co' });
    await authApi.resetPassword('tok', 'Password2!');
    expect(post).toHaveBeenCalledWith('/auth/reset-password', { token: 'tok', new_password: 'Password2!' });
  });

  it('getCities llama al catálogo', async () => {
    await authApi.getCities();
    expect(get).toHaveBeenCalledWith('/auth/cities');
  });
});

describe('dashboardApi', () => {
  it('usa las rutas de dashboard', async () => {
    await dashboardApi.admin();
    expect(get).toHaveBeenCalledWith('/dashboard/admin');
    await dashboardApi.user();
    expect(get).toHaveBeenCalledWith('/dashboard/user');
    await dashboardApi.stats();
    expect(get).toHaveBeenCalledWith('/dashboard/stats');
    await dashboardApi.roles();
    expect(get).toHaveBeenCalledWith('/dashboard/roles');
    await dashboardApi.lexicalUnits();
    expect(get).toHaveBeenCalledWith('/dashboard/lexical-units');
    await dashboardApi.lexicalUnitsAdmin();
    expect(get).toHaveBeenCalledWith('/dashboard/lexical-units/admin');
  });

  it('create/update/delete de unidades léxicas', async () => {
    await dashboardApi.createLexicalUnit({ text: 'casa', language: 'es_Co' });
    expect(post).toHaveBeenCalledWith('/dashboard/lexical-units', { text: 'casa', language: 'es_Co' });
    await dashboardApi.updateLexicalUnitVideo('id-1', 'v.mp4');
    expect(patch).toHaveBeenCalledWith('/dashboard/lexical-units/id-1/video', { video_url: 'v.mp4' });
    await dashboardApi.deleteLexicalUnit('id-1');
    expect(del).toHaveBeenCalledWith('/dashboard/lexical-units/id-1');
  });
});

describe('adminUsersApi', () => {
  it('list filtra por estado cuando se indica', async () => {
    await adminUsersApi.list(true);
    expect(get).toHaveBeenCalledWith('/admin/users', { params: { is_active: true } });
    await adminUsersApi.list();
    expect(get).toHaveBeenCalledWith('/admin/users', { params: undefined });
  });

  it('updateRole, setActive y exportCsv', async () => {
    await adminUsersApi.updateRole('u1', 'Soporte');
    expect(patch).toHaveBeenCalledWith('/dashboard/users/u1/role', { role_name: 'Soporte' });
    await adminUsersApi.setActive('u1', false);
    expect(patch).toHaveBeenCalledWith('/admin/users/u1/status', { is_active: false });
    await adminUsersApi.exportCsv();
    expect(get).toHaveBeenCalledWith('/admin/users/export', { responseType: 'blob' });
  });
});

describe('translationApi', () => {
  it('signToText solo envía session_id si viene', async () => {
    await translationApi.signToText('base64');
    expect(post).toHaveBeenCalledWith('/api/traduccion/frame', { frame_base64: 'base64' });
    await translationApi.signToText('base64', 's1');
    expect(post).toHaveBeenCalledWith('/api/traduccion/frame', { frame_base64: 'base64', session_id: 's1' });
  });

  it('textToSign y vozToSign', async () => {
    await translationApi.textToSign('buenas noches');
    expect(post).toHaveBeenCalledWith('/api/traduccion/texto', { texto: 'buenas noches' });
    await translationApi.vozToSign('hola', 's1', 'es-CO');
    expect(post).toHaveBeenCalledWith('/api/traduccion/voz', { texto_dictado: 'hola', session_id: 's1', idioma: 'es-CO' });
  });
});

describe('feedbackApi', () => {
  it('create envía id_session o id_lexicalunit como null si faltan', async () => {
    await feedbackApi.create({ rating: 5 });
    expect(post).toHaveBeenCalledWith('/feedback', {
      id_session: null, id_lexicalunit: null, rating: 5, comment: null,
    });
    await feedbackApi.create({ id_lexicalunit: 'lu1', rating: 3, comment: 'ok' });
    expect(post).toHaveBeenCalledWith('/feedback', {
      id_session: null, id_lexicalunit: 'lu1', rating: 3, comment: 'ok',
    });
  });

  it('list, listAll, wordSummary, quickReplies, setReviewed y remove', async () => {
    await feedbackApi.list();
    expect(get).toHaveBeenCalledWith('/feedback/my');
    await feedbackApi.listAll();
    expect(get).toHaveBeenCalledWith('/feedback/all');
    await feedbackApi.wordSummary('lu1');
    expect(get).toHaveBeenCalledWith('/feedback/word/lu1/summary');
    await feedbackApi.quickReplies();
    expect(get).toHaveBeenCalledWith('/feedback/quick-replies');
    await feedbackApi.setReviewed('f1', true, { quickReplyKey: 'gracias' });
    expect(patch).toHaveBeenCalledWith('/feedback/f1/review', {
      is_reviewed: true, response: null, quick_reply: 'gracias',
    });
    await feedbackApi.remove('f1');
    expect(del).toHaveBeenCalledWith('/feedback/f1');
  });
});

describe('supportApi', () => {
  it('create mapea description a message', async () => {
    await supportApi.create({ subject: 'Hola', description: 'Ayuda' });
    expect(post).toHaveBeenCalledWith('/support', { subject: 'Hola', message: 'Ayuda' });
  });

  it('list, listAll y updateStatus', async () => {
    await supportApi.list();
    expect(get).toHaveBeenCalledWith('/support/my');
    await supportApi.listAll();
    expect(get).toHaveBeenCalledWith('/support/all');
    await supportApi.updateStatus('s1', 'resolved', 'Solucionado');
    expect(patch).toHaveBeenCalledWith('/support/s1/status', { status: 'resolved', solution: 'Solucionado' });
    await supportApi.updateStatus('s1', 'pending');
    expect(patch).toHaveBeenCalledWith('/support/s1/status', { status: 'pending', solution: null });
  });
});

describe('favoritesApi', () => {
  it('toggle, add y remove apuntan al mismo POST (toggle del backend)', async () => {
    await favoritesApi.toggle('lu1');
    expect(post).toHaveBeenCalledWith('/favorites/lu1');
    await favoritesApi.add('lu1');
    expect(post).toHaveBeenCalledWith('/favorites/lu1');
    await favoritesApi.remove('lu1');
    expect(post).toHaveBeenCalledWith('/favorites/lu1');
    await favoritesApi.list();
    expect(get).toHaveBeenCalledWith('/favorites/my');
  });
});

describe('statsApi', () => {
  it('endpoints personales', async () => {
    await statsApi.misPalabras(5);
    expect(get).toHaveBeenCalledWith('/stats/mias/palabras?limite=5');
    await statsApi.miActividad(7);
    expect(get).toHaveBeenCalledWith('/stats/mias/actividad?dias=7');
    await statsApi.misCanales();
    expect(get).toHaveBeenCalledWith('/stats/mias/canales');
    await statsApi.miHistorial(14);
    expect(get).toHaveBeenCalledWith('/stats/mias/historial?dias=14');
    await statsApi.miProgreso();
    expect(get).toHaveBeenCalledWith('/stats/mias/progreso');
  });

  it('endpoints globales (admin)', async () => {
    await statsApi.palabrasGlobales();
    expect(get).toHaveBeenCalledWith('/stats/globales/palabras?limite=10');
    await statsApi.actividadGlobal();
    expect(get).toHaveBeenCalledWith('/stats/globales/actividad?dias=30');
    await statsApi.canalesGlobales();
    expect(get).toHaveBeenCalledWith('/stats/globales/canales');
    await statsApi.resumenInteraccion();
    expect(get).toHaveBeenCalledWith('/stats/globales/resumen');
    await statsApi.senasSinUsar();
    expect(get).toHaveBeenCalledWith('/stats/globales/sin-usar');
    await statsApi.resumenTickets();
    expect(get).toHaveBeenCalledWith('/stats/globales/tickets');
  });
});

describe('notificationsApi', () => {
  it('list, unreadCount, markRead, markAllRead y remove', async () => {
    await notificationsApi.list(true, 5);
    expect(get).toHaveBeenCalledWith('/notifications?solo_sin_leer=true&limite=5');
    await notificationsApi.unreadCount();
    expect(get).toHaveBeenCalledWith('/notifications/unread-count');
    await notificationsApi.markRead('n1');
    expect(patch).toHaveBeenCalledWith('/notifications/n1/read');
    await notificationsApi.markAllRead();
    expect(patch).toHaveBeenCalledWith('/notifications/read-all');
    await notificationsApi.remove('n1');
    expect(del).toHaveBeenCalledWith('/notifications/n1');
  });
});

describe('historyApi', () => {
  it('list y goalProgress', async () => {
    await historyApi.list();
    expect(get).toHaveBeenCalledWith('/dashboard/history');
    await historyApi.goalProgress();
    expect(get).toHaveBeenCalledWith('/dashboard/goal-progress');
  });
});

describe('lastSession (localStorage)', () => {
  it('guarda, lee y limpia el id de sesión', () => {
    expect(lastSession.get()).toBeNull();
    lastSession.set('s-1');
    expect(lastSession.get()).toBe('s-1');
    lastSession.clear();
    expect(lastSession.get()).toBeNull();
  });
});
