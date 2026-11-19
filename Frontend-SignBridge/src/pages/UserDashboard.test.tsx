// Autor: @javierperez14 · S6 (Front: panel del usuario)
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi, favoritesApi, feedbackApi, supportApi } from '../api/client';
import { historyApi } from '../api/history';
import { AuthContext, type AuthContextType } from '../context/auth-context';
import UserDashboard from './UserDashboard';

const USUARIA = {
  id_user: 'u1', full_name: 'Ana Torres', email: 'ana@example.com',
  role: 'Cliente', phone: '3001234567', city: 'Bogotá',
};

const PANEL = {
  full_name: 'Ana Torres', email: 'ana@example.com',
  translations_made: 4, favorite_words: 2, average_rating: 3.6, support_requests: 1,
};

function renderPanel({ isAdmin = false } = {}) {
  const sesion = {
    token: 't', user: USUARIA, role: 'Cliente', loading: false,
    login: vi.fn(), logout: vi.fn(), isAdmin, isSupport: false,
  } as unknown as AuthContextType;
  return render(
    <AuthContext.Provider value={sesion}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/vocabulary" element={<p>Página de vocabulario</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

const pestana = (nombre: RegExp) => screen.getByRole('button', { name: nombre });

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(dashboardApi, 'user').mockResolvedValue({ data: PANEL } as never);
  vi.spyOn(historyApi, 'goalProgress').mockResolvedValue(
    { data: { translations_made: 4, goal: 10, streak: 2, last_goal_date: null } } as never
  );
  vi.spyOn(historyApi, 'list').mockResolvedValue({ data: [] } as never);
  vi.spyOn(favoritesApi, 'list').mockResolvedValue({ data: [] } as never);
  vi.spyOn(supportApi, 'list').mockResolvedValue({ data: [] } as never);
  vi.spyOn(feedbackApi, 'list').mockResolvedValue({ data: [] } as never);
});

describe('Panel del usuario · Mi panel', () => {
  it('should greet with the first name and show the counters', async () => {
    // Act
    renderPanel();

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hola, Ana');
    expect(await screen.findByText('Traducciones realizadas')).toBeInTheDocument();
    expect(screen.getByText('3.6')).toBeInTheDocument();
    expect(screen.getByText('3001234567')).toBeInTheDocument();
  });

  it('should show the goal progress and the streak', async () => {
    renderPanel();

    expect(await screen.findByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText('Te faltan 6 traducciones para tu próxima meta')).toBeInTheDocument();
    expect(screen.getByText('Racha: 2')).toBeInTheDocument();
  });

  it('should fall back to the dashboard numbers when the goal endpoint fails', async () => {
    vi.spyOn(historyApi, 'goalProgress').mockRejectedValue(new Error('404'));
    vi.spyOn(dashboardApi, 'user').mockResolvedValue({ data: { ...PANEL, translations_made: 12 } } as never);

    renderPanel();

    expect(await screen.findByText('🎉 ¡Meta alcanzada! Sigue así.')).toBeInTheDocument();
  });

  it('should show an error when the panel cannot be loaded', async () => {
    vi.spyOn(dashboardApi, 'user').mockRejectedValue(new Error('500'));

    renderPanel();

    expect(await screen.findByText('No se pudo cargar el panel')).toBeInTheDocument();
  });

  it('should go to the vocabulary from the quick actions', async () => {
    renderPanel();

    await userEvent.click(await screen.findByRole('button', { name: /Ver vocabulario/ }));

    expect(screen.getByText('Página de vocabulario')).toBeInTheDocument();
  });

  it('should hide the support tab from an administrator', () => {
    renderPanel({ isAdmin: true });

    expect(screen.queryByRole('button', { name: /Soporte/ })).not.toBeInTheDocument();
    expect(pestana(/Favoritos/)).toBeInTheDocument();
  });
});

describe('Panel del usuario · Favoritos', () => {
  it('should invite to the vocabulary when there are no favorites', async () => {
    renderPanel();

    await userEvent.click(pestana(/Favoritos/));

    expect(await screen.findByText('Aun no tienes favoritos')).toBeInTheDocument();
  });

  it('should remove a favorite right away and call the API', async () => {
    // Arrange
    vi.spyOn(favoritesApi, 'list').mockResolvedValue({
      data: [{ id_favorite: 'f1', id_lexicalunit: 'l1', word_text: 'Hola' }],
    } as never);
    const toggle = vi.spyOn(favoritesApi, 'toggle').mockResolvedValue({ data: {} } as never);
    renderPanel();
    await userEvent.click(pestana(/Favoritos/));

    // Act
    await userEvent.click(await screen.findByTitle('Quitar de favoritos'));

    // Assert
    expect(toggle).toHaveBeenCalledWith('l1');
    expect(screen.queryByText('Hola')).not.toBeInTheDocument();
  });

  it('should put the favorite back if the API fails', async () => {
    vi.spyOn(favoritesApi, 'list').mockResolvedValue({
      data: [{ id_favorite: 'f1', id_lexicalunit: 'l1', word_text: 'Hola' }],
    } as never);
    vi.spyOn(favoritesApi, 'toggle').mockRejectedValue(new Error('500'));
    renderPanel();
    await userEvent.click(pestana(/Favoritos/));

    await userEvent.click(await screen.findByTitle('Quitar de favoritos'));

    expect(await screen.findByText('No se pudo eliminar el favorito')).toBeInTheDocument();
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });

  it('should show an error when favorites cannot be loaded', async () => {
    vi.spyOn(favoritesApi, 'list').mockRejectedValue(new Error('500'));
    renderPanel();

    await userEvent.click(pestana(/Favoritos/));

    expect(await screen.findByText('No se pudieron cargar los favoritos')).toBeInTheDocument();
  });
});

describe('Panel del usuario · Historial', () => {
  it('should group the translations by day', async () => {
    vi.spyOn(historyApi, 'list').mockResolvedValue({
      data: [
        { id_session: 's1', date_time: '2026-11-10T15:00:00Z', translation_type: 'voz', status: 'active', signs_count: 1, original_text: 'hola' },
        { id_session: 's2', date_time: '2026-11-10T16:00:00Z', translation_type: 'texto', status: 'active', signs_count: 3 },
      ],
    } as never);
    renderPanel();

    await userEvent.click(pestana(/Historial/));

    expect(await screen.findByText('2 traducciones')).toBeInTheDocument();
    expect(screen.getByText('en 1 día')).toBeInTheDocument();
    expect(screen.getByText('Traducción por voz')).toBeInTheDocument();
    expect(screen.getByText(/1 seña encontrada — "hola"/)).toBeInTheDocument();
    expect(screen.getByText(/3 señas encontradas/)).toBeInTheDocument();
  });

  it('should say when there are no translations yet', async () => {
    renderPanel();

    await userEvent.click(pestana(/Historial/));

    expect(await screen.findByText('Aún no tienes traducciones')).toBeInTheDocument();
  });

  it('should show an error when the history cannot be loaded', async () => {
    vi.spyOn(historyApi, 'list').mockRejectedValue(new Error('500'));
    renderPanel();

    await userEvent.click(pestana(/Historial/));

    expect(await screen.findByText('No se pudo cargar el historial de traducciones')).toBeInTheDocument();
  });
});

describe('Panel del usuario · Soporte', () => {
  it('should ask to fill every field before sending a ticket', async () => {
    const crear = vi.spyOn(supportApi, 'create');
    renderPanel();
    await userEvent.click(pestana(/Soporte/));
    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo ticket' }));

    await userEvent.type(screen.getByPlaceholderText('Describe brevemente el problema'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar ticket' }));

    expect(screen.getByText('Completa todos los campos')).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
  });

  it('should send a ticket with trimmed text and list it first', async () => {
    // Arrange
    vi.spyOn(supportApi, 'list').mockResolvedValue({
      data: [{ id_support: 't0', subject: 'Viejo', message: 'Ya resuelto', status: 'resolved', date: '2026-11-01' }],
    } as never);
    const crear = vi.spyOn(supportApi, 'create').mockResolvedValue({
      data: { id_support: 't1', subject: 'No carga', message: 'El video no sale', status: 'pending' },
    } as never);
    renderPanel();
    await userEvent.click(pestana(/Soporte/));
    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo ticket' }));

    // Act
    await userEvent.type(screen.getByPlaceholderText('Describe brevemente el problema'), '  No carga ');
    await userEvent.type(screen.getByPlaceholderText(/mayor detalle/), 'El video no sale');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar ticket' }));

    // Assert
    expect(crear).toHaveBeenCalledWith({ subject: 'No carga', description: 'El video no sale' });
    expect(await screen.findByText('Ticket enviado correctamente. Te responderemos pronto.')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Resuelto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tickets de soporte/ })).toHaveTextContent('(2)');
  });

  it('should keep the form open with an error when sending fails', async () => {
    vi.spyOn(supportApi, 'create').mockRejectedValue(new Error('500'));
    renderPanel();
    await userEvent.click(pestana(/Soporte/));
    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo ticket' }));

    await userEvent.type(screen.getByPlaceholderText('Describe brevemente el problema'), 'Asunto');
    await userEvent.type(screen.getByPlaceholderText(/mayor detalle/), 'Detalle');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar ticket' }));

    expect(await screen.findByText('No se pudo enviar el ticket. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('should show an error when the tickets cannot be loaded', async () => {
    vi.spyOn(supportApi, 'list').mockRejectedValue(new Error('500'));
    renderPanel();

    await userEvent.click(pestana(/Soporte/));

    expect(await screen.findByText('No se pudieron cargar los tickets')).toBeInTheDocument();
  });
});

describe('Panel del usuario · Valoraciones', () => {
  it('should block rating until the person translates something', async () => {
    renderPanel();

    await userEvent.click(pestana(/Valoraciones/));

    expect(await screen.findByRole('button', { name: 'Traduce algo primero' })).toBeDisabled();
    expect(screen.getByText('Aun no has dejado valoraciones')).toBeInTheDocument();
  });

  it('should rate the last session and update the average', async () => {
    // Arrange: hubo una traducción y una valoración previa de 5
    localStorage.setItem('lastSessionId', 'ses-1');
    vi.spyOn(feedbackApi, 'list').mockResolvedValue({
      data: [{ id_feedback: 'f0', rating: 5, comment: 'Muy útil', date: '2026-11-01' }],
    } as never);
    const crear = vi.spyOn(feedbackApi, 'create').mockResolvedValue({
      data: { id_feedback: 'f1', rating: 2 },
    } as never);
    renderPanel();
    await userEvent.click(pestana(/Valoraciones/));
    expect(await screen.findByText('Promedio de 1 valoracion')).toBeInTheDocument();

    // Act: elige 2 estrellas y envía
    await userEvent.click(screen.getByRole('button', { name: '+ Nueva valoracion' }));
    const formulario = screen.getByRole('heading', { name: 'Valorar sesion' }).parentElement!;
    await userEvent.click(within(formulario).getAllByRole('button', { name: '★' })[1]);
    expect(screen.getByText('Malo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar valoracion' }));

    // Assert
    expect(crear).toHaveBeenCalledWith({ id_session: 'ses-1', rating: 2, comment: undefined });
    expect(await screen.findByText('Gracias por tu valoracion!')).toBeInTheDocument();
    expect(screen.getByText('Promedio de 2 valoraciones')).toBeInTheDocument();
    expect(screen.getByText('“Muy útil”')).toBeInTheDocument();
  });

  it('should show an error when the rating cannot be sent', async () => {
    localStorage.setItem('lastSessionId', 'ses-1');
    vi.spyOn(feedbackApi, 'create').mockRejectedValue(new Error('409'));
    renderPanel();
    await userEvent.click(pestana(/Valoraciones/));
    await userEvent.click(await screen.findByRole('button', { name: '+ Nueva valoracion' }));

    const formulario = screen.getByRole('heading', { name: 'Valorar sesion' }).parentElement!;
    await userEvent.click(within(formulario).getAllByRole('button', { name: '★' })[4]);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar valoracion' }));

    expect(await screen.findByText('No se pudo enviar la valoracion. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('should show an error when the ratings cannot be loaded', async () => {
    vi.spyOn(feedbackApi, 'list').mockRejectedValue(new Error('500'));
    renderPanel();

    await userEvent.click(pestana(/Valoraciones/));

    expect(await screen.findByText('No se pudo cargar el historial de valoraciones')).toBeInTheDocument();
  });
});
