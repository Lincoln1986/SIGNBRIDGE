import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { statsApi } from '../api/client';
import TranslationHistory from './TranslationHistory';

const hoy = new Date().toISOString().split('T')[0];

const HISTORIAL = [{
  day: hoy, total: 2, sessions: [
    { id_session: 's1', date_time: `${hoy}T15:00:00Z`, translation_type: 'texto',
      signs: [{ word: 'hola' }, { word: 'amigo' }] },
    { id_session: 's2', date_time: `${hoy}T16:00:00Z`, translation_type: 'sena',
      signs: [], generated_text: 'vida' },
  ],
}];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(statsApi, 'miHistorial').mockResolvedValue({ data: HISTORIAL } as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TranslationHistory', () => {
  it('should show today with each translation', async () => {
    render(<TranslationHistory />);

    expect(await screen.findByText('📅 Hoy')).toBeInTheDocument();
    expect(screen.getAllByText('2 traducciones')).toHaveLength(2); // resumen y encabezado del día
    expect(screen.getByText('en 1 día')).toBeInTheDocument();
    expect(screen.getByText('amigo')).toBeInTheDocument();
    expect(screen.getByText('"vida"')).toBeInTheDocument();
  });

  it('should search by word after the user stops typing', async () => {
    render(<TranslationHistory />);
    await screen.findByText('📅 Hoy');
    const buscar = vi.spyOn(statsApi, 'miHistorial').mockResolvedValue({ data: [] } as never);
    buscar.mockClear(); // olvida la carga inicial
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText('Buscar en el historial'), { target: { value: 'casa' } });
    expect(buscar).not.toHaveBeenCalled(); // todavía no pasaron los 400 ms
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(buscar).toHaveBeenCalledWith(30, 'casa');
    expect(screen.getByText('No se encontraron traducciones')).toBeInTheDocument();
    expect(screen.getByText('Sin resultados para "casa".')).toBeInTheDocument();
  });

  it('should clear the search with the ✕ button', async () => {
    render(<TranslationHistory />);
    await screen.findByText('📅 Hoy');

    await userEvent.type(screen.getByLabelText('Buscar en el historial'), 'ho');
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

    expect(screen.getByLabelText('Buscar en el historial')).toHaveValue('');
  });

  it('should delete a translation after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const borrar = vi.spyOn(statsApi, 'eliminarDeHistorial').mockResolvedValue({} as never);
    render(<TranslationHistory />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar vida del historial' }));

    expect(borrar).toHaveBeenCalledWith('s2');
    await waitFor(() => expect(screen.queryByText('"vida"')).not.toBeInTheDocument());
    expect(screen.getAllByText('1 traducción')).toHaveLength(2);
  });

  it('should not delete when the user cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const borrar = vi.spyOn(statsApi, 'eliminarDeHistorial');
    render(<TranslationHistory />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar vida del historial' }));

    expect(borrar).not.toHaveBeenCalled();
  });

  it('should show an error when the delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(statsApi, 'eliminarDeHistorial').mockRejectedValue(new Error('500'));
    render(<TranslationHistory />);

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Texto → Señas del historial' }));

    expect(await screen.findByText('No se pudo eliminar la traducción del historial')).toBeInTheDocument();
    expect(screen.getByText('amigo')).toBeInTheDocument();
  });

  it('should download the PDF', async () => {
    const exportar = vi.spyOn(statsApi, 'exportarHistorialPDF').mockResolvedValue({ data: 'pdf' } as never);
    const crearUrl = vi.fn(() => 'blob:x');
    const soltarUrl = vi.fn();
    Object.assign(window.URL, { createObjectURL: crearUrl, revokeObjectURL: soltarUrl });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<TranslationHistory />);

    await userEvent.click(await screen.findByRole('button', { name: /Exportar PDF/ }));

    expect(exportar).toHaveBeenCalledWith(30, undefined);
    expect(clic).toHaveBeenCalled();
    expect(soltarUrl).toHaveBeenCalledWith('blob:x');
  });

  it('should show an error when the PDF fails', async () => {
    vi.spyOn(statsApi, 'exportarHistorialPDF').mockRejectedValue(new Error('500'));
    render(<TranslationHistory />);

    await userEvent.click(await screen.findByRole('button', { name: /Exportar PDF/ }));

    expect(await screen.findByText('No se pudo generar el PDF')).toBeInTheDocument();
  });

  it('should say when there is nothing yet', async () => {
    vi.spyOn(statsApi, 'miHistorial').mockResolvedValue({ data: [] } as never);
    render(<TranslationHistory />);

    expect(await screen.findByText('Aún no tienes traducciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar PDF/ })).toBeDisabled();
  });
});
