// Autor: @Sebas-p-s · S6 (Front: panel de Soporte)
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { feedbackApi, supportApi } from '../api/client';
import { AuthContext, type AuthContextType } from '../context/auth-context';
import SupportDashboard from './SupportDashboard';

const TICKETS = [
  { id_support: 't1', subject: 'No carga el video', message: 'La seña de Hola no aparece', status: 'pending',
    date: '2026-11-10T10:00:00Z', user_full_name: 'Ana Torres', user_email: 'ana@example.com' },
  { id_support: 't2', subject: 'Cambio de correo', message: 'Quiero cambiarlo', status: 'resolved',
    solution: 'Ya quedó', date: '2026-11-09T10:00:00Z', user_full_name: 'Luis Gómez', user_email: 'luis@example.com' },
];

const VALORACIONES = [
  { id_feedback: 'f1', rating: 5, comment: 'Excelente app', is_reviewed: false,
    user_full_name: 'Ana Torres', user_email: 'ana@example.com', date: '2026-11-10' },
  { id_feedback: 'f2', rating: 1, comment: 'No entendí la seña', is_reviewed: false, id_lexicalunit: 'l1',
    user_full_name: 'Luis Gómez', user_email: 'luis@example.com', date: '2026-11-09' },
  { id_feedback: 'f3', rating: 3, is_reviewed: true, support_response: 'Gracias',
    user_full_name: 'Eva Ruiz', user_email: 'eva@example.com', date: '2026-11-08' },
];

function renderPanel({ soporte = true } = {}) {
  const sesion = {
    token: 't', user: null, role: soporte ? 'Soporte' : 'Administrador', loading: false,
    login: vi.fn(), logout: vi.fn(), isAdmin: !soporte, isSupport: soporte,
  } as unknown as AuthContextType;
  return render(
    <AuthContext.Provider value={sesion}><SupportDashboard /></AuthContext.Provider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(supportApi, 'listAll').mockResolvedValue({ data: TICKETS } as never);
  vi.spyOn(feedbackApi, 'listAll').mockResolvedValue({ data: VALORACIONES } as never);
  vi.spyOn(feedbackApi, 'quickReplies').mockResolvedValue({
    data: [{ key: 'gracias', text: '¡Gracias por tu valoración! Nos alegra que SignBridge te sirva.' }],
  } as never);
});

describe('Panel de Soporte · Tickets', () => {
  it('should count the tickets and show the solution of the resolved ones', async () => {
    renderPanel();

    expect(await screen.findByText('No carga el video')).toBeInTheDocument();
    expect(screen.getByText('Total tickets').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Ya quedó')).toBeInTheDocument();
    expect(screen.getByText(/Ana Torres · ana@example.com/)).toBeInTheDocument();
  });

  it('should filter the tickets by status', async () => {
    renderPanel();
    await screen.findByText('No carga el video');

    await userEvent.click(screen.getByRole('button', { name: 'Resuelto' }));
    expect(screen.queryByText('No carga el video')).not.toBeInTheDocument();
    expect(screen.getByText('Cambio de correo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrado' }));
    expect(screen.getByText('No hay tickets con este filtro.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('No carga el video')).toBeInTheDocument();
  });

  it('should ask for the solution before resolving a ticket', async () => {
    // Arrange
    const actualizar = vi.spyOn(supportApi, 'updateStatus');
    renderPanel();
    await screen.findByText('No carga el video');

    // Act: elige "Resuelto" sin escribir la solución
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'resolved');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    // Assert
    expect(screen.getByText('Para marcar el ticket como resuelto debes escribir la solución.')).toBeInTheDocument();
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('should resolve a ticket with its solution', async () => {
    const actualizar = vi.spyOn(supportApi, 'updateStatus').mockResolvedValue({ data: {} } as never);
    renderPanel();
    await screen.findByText('No carga el video');

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'resolved');
    await userEvent.type(screen.getByPlaceholderText(/Escribe la solución/), '  Se subió el video ');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(actualizar).toHaveBeenCalledWith('t1', 'resolved', 'Se subió el video');
    expect(await screen.findByText('Se subió el video')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('should move a ticket to in progress without a solution', async () => {
    const actualizar = vi.spyOn(supportApi, 'updateStatus').mockResolvedValue({ data: {} } as never);
    renderPanel();
    await screen.findByText('No carga el video');

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'in_progress');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(actualizar).toHaveBeenCalledWith('t1', 'in_progress', undefined);
  });

  it('should show an error when the status cannot be saved', async () => {
    vi.spyOn(supportApi, 'updateStatus').mockRejectedValue(new Error('403'));
    renderPanel();
    await screen.findByText('No carga el video');

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'closed');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/No se pudo actualizar el estado del ticket/)).toBeInTheDocument();
  });

  it('should be read only for an administrator', async () => {
    renderPanel({ soporte: false });

    expect(await screen.findByText(/solo Soporte puede solucionarlos/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByText('Solo lectura')).toHaveLength(2);
  });

  it('should show an error when the tickets cannot be loaded', async () => {
    vi.spyOn(supportApi, 'listAll').mockRejectedValue(new Error('500'));

    renderPanel();

    expect(await screen.findByText('No se pudieron cargar los tickets.')).toBeInTheDocument();
  });
});

describe('Panel de Soporte · Valoraciones', () => {
  const abrirValoraciones = async (opciones?: { soporte?: boolean }) => {
    renderPanel(opciones);
    await userEvent.click(screen.getByRole('button', { name: /Valoraciones/ }));
    await screen.findByText('Excelente app');
  };

  it('should compute the average, pending and low ratings', async () => {
    await abrirValoraciones();

    expect(screen.getByText('3.0 / 5')).toBeInTheDocument();
    const sinRevisar = screen.getAllByText('Sin revisar').find(e => e.tagName !== 'BUTTON')!;
    expect(sinRevisar.parentElement).toHaveTextContent('2');
    expect(screen.getByText('Calificaciones bajas (≤2)').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Valoración de una palabra puntual')).toBeInTheDocument();
  });

  it('should filter reviewed and pending ratings', async () => {
    await abrirValoraciones();

    await userEvent.click(screen.getByRole('button', { name: 'Revisadas' }));
    expect(screen.queryByText('Excelente app')).not.toBeInTheDocument();
    expect(screen.getByText('Gracias')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sin revisar' }));
    expect(screen.getByText('Excelente app')).toBeInTheDocument();
    expect(screen.queryByText('Eva Ruiz')).not.toBeInTheDocument();
  });

  it('should require a written answer to mark a rating as reviewed', async () => {
    const revisar = vi.spyOn(feedbackApi, 'setReviewed');
    await abrirValoraciones();

    await userEvent.click(screen.getAllByRole('button', { name: '✓ Marcar como revisada' })[1]);

    expect(screen.getByText(/Debes escribir una respuesta manual/)).toBeInTheDocument();
    expect(revisar).not.toHaveBeenCalled();
  });

  it('should answer a low rating manually', async () => {
    const revisar = vi.spyOn(feedbackApi, 'setReviewed').mockResolvedValue({
      data: { support_response: 'Revisaremos esa seña' },
    } as never);
    await abrirValoraciones();

    await userEvent.type(screen.getAllByPlaceholderText(/Respuesta manual/)[1], 'Revisaremos esa seña');
    await userEvent.click(screen.getAllByRole('button', { name: '✓ Marcar como revisada' })[1]);

    expect(revisar).toHaveBeenCalledWith('f2', true, { response: 'Revisaremos esa seña', quickReplyKey: undefined });
    expect(await screen.findByText('Revisaremos esa seña', { selector: 'div' })).toBeInTheDocument();
  });

  it('should offer quick replies only for 4 and 5 stars', async () => {
    const revisar = vi.spyOn(feedbackApi, 'setReviewed').mockResolvedValue({
      data: { support_response: '¡Gracias por tu valoración!' },
    } as never);
    await abrirValoraciones();

    // Solo la de 5 estrellas tiene el botón (el texto se corta a 40 caracteres)
    const rapidas = screen.getAllByRole('button', { name: /^¡Gracias por tu valoración!/ });
    expect(rapidas).toHaveLength(1);
    expect(rapidas[0]).toHaveTextContent('…');
    await userEvent.click(rapidas[0]);

    expect(revisar).toHaveBeenCalledWith('f1', true, { response: undefined, quickReplyKey: 'gracias' });
  });

  it('should unmark a reviewed rating', async () => {
    const revisar = vi.spyOn(feedbackApi, 'setReviewed').mockResolvedValue({ data: {} } as never);
    await abrirValoraciones();

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como no revisada' }));

    expect(revisar).toHaveBeenCalledWith('f3', false);
    expect(await screen.findAllByRole('button', { name: '✓ Marcar como revisada' })).toHaveLength(3);
  });

  it('should delete a rating only after confirming', async () => {
    const borrar = vi.spyOn(feedbackApi, 'remove').mockResolvedValue({ data: {} } as never);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await abrirValoraciones();

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    expect(borrar).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(borrar).toHaveBeenCalledWith('f1');
    expect(screen.queryByText('Excelente app')).not.toBeInTheDocument();
  });

  it('should show an error when a rating cannot be deleted', async () => {
    vi.spyOn(feedbackApi, 'remove').mockRejectedValue(new Error('500'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await abrirValoraciones();

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

    expect(await screen.findByText('No se pudo eliminar la valoración.')).toBeInTheDocument();
  });

  it('should let an administrator only read and delete', async () => {
    const respuestas = vi.spyOn(feedbackApi, 'quickReplies');
    await abrirValoraciones({ soporte: false });

    expect(screen.getByText(/revisarlas y responderlas es una acción exclusiva de Soporte/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Respuesta manual/)).not.toBeInTheDocument();
    expect(respuestas).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument();
  });

  it('should show an error when the ratings cannot be loaded', async () => {
    vi.spyOn(feedbackApi, 'listAll').mockRejectedValue(new Error('500'));
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /Valoraciones/ }));

    expect(await screen.findByText('No se pudieron cargar las valoraciones.')).toBeInTheDocument();
  });
});
