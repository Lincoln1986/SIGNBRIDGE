// Autor: @Lincoln1986 · S6 (Front: Voz a Señas)
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi, feedbackApi, translationApi } from '../api/client';
import VoiceToSign from './VoiceToSign';

// Doble del reconocimiento de voz: el test decide qué "escuchó" el micrófono.
const voz = vi.hoisted(() => ({
  state: 'idle' as 'idle' | 'listening' | 'processing',
  transcript: '',
  error: null as string | null,
  isSupported: true,
  startListening: vi.fn(),
  stopListening: vi.fn(),
  resetTranscript: vi.fn(),
  onFinalText: undefined as ((t: string) => void) | undefined,
}));

vi.mock('../hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: (opciones: { onFinalText: (t: string) => void }) => {
    voz.onFinalText = opciones.onFinalText;
    return voz;
  },
}));

// El reproductor tiene su propio test; acá solo importa qué señas recibe.
vi.mock('../components/SignSequencePlayer', () => ({
  default: ({ signs }: { signs: { word: string }[] }) => (
    <div data-testid="reproductor">{signs.map(s => s.word).join(',')}</div>
  ),
}));

const RESPUESTA = {
  id_session: 'ses-1',
  signs: [
    { word: 'hola', found: true, video_url: 'https://youtu.be/a' },
    { word: 'amigo', found: false },
  ],
  untranslated_words: ['amigo'],
  message: 'Traducción parcial: 1/2 señas encontradas.',
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  Object.assign(voz, { state: 'idle', transcript: '', error: null, isSupported: true });
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(dashboardApi, 'lexicalUnits').mockResolvedValue({ data: [] } as never);
});

describe('Voz a Señas · texto', () => {
  it('should translate the text and keep the session for the rating', async () => {
    // Arrange
    const traducir = vi.spyOn(translationApi, 'textToSign').mockResolvedValue({ data: RESPUESTA } as never);
    render(<VoiceToSign />);

    // Act
    await userEvent.type(screen.getByPlaceholderText(/Escribe una palabra/), '  hola amigo ');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));

    // Assert
    expect(traducir).toHaveBeenCalledWith('hola amigo', undefined);
    expect(await screen.findByText('amigo (sin seña)')).toBeInTheDocument();
    expect(screen.getByTestId('reproductor')).toHaveTextContent('hola,amigo');
    expect(screen.getByText('Historial de traducciones (1)')).toBeInTheDocument();
    expect(localStorage.getItem('lastSessionId')).toBe('ses-1');
  });

  it('should reuse the session in the next translation and with Ctrl + Enter', async () => {
    const traducir = vi.spyOn(translationApi, 'textToSign').mockResolvedValue({ data: RESPUESTA } as never);
    render(<VoiceToSign />);
    const cuadro = screen.getByPlaceholderText(/Escribe una palabra/);

    await userEvent.type(cuadro, 'hola');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));
    await screen.findByText('Historial de traducciones (1)');
    await userEvent.type(cuadro, ' otra vez{Control>}{Enter}{/Control}');

    expect(traducir).toHaveBeenLastCalledWith('hola otra vez', 'ses-1');
    expect(await screen.findByText('Historial de traducciones (2)')).toBeInTheDocument();
  });

  it('should not translate an empty text', () => {
    render(<VoiceToSign />);

    expect(screen.getByRole('button', { name: 'Traducir a señas' })).toBeDisabled();
    expect(screen.getByText('0 caracteres')).toBeInTheDocument();
  });

  it('should show the backend message when the translation fails', async () => {
    vi.spyOn(translationApi, 'textToSign').mockRejectedValue({
      response: { data: { detail: 'No se encontraron palabras válidas en el texto.' } },
    });
    render(<VoiceToSign />);

    await userEvent.type(screen.getByPlaceholderText(/Escribe una palabra/), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));

    expect(await screen.findByText('No se encontraron palabras válidas en el texto.')).toBeInTheDocument();
  });

  it('should use a generic message when the backend does not answer', async () => {
    vi.spyOn(translationApi, 'textToSign').mockRejectedValue(new Error('Network Error'));
    render(<VoiceToSign />);

    await userEvent.type(screen.getByPlaceholderText(/Escribe una palabra/), 'hola');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));

    expect(await screen.findByText('Error al traducir. Verifica que el backend esté activo.')).toBeInTheDocument();
  });

  it('should clear the text, repeat a translation and clear the history', async () => {
    const traducir = vi.spyOn(translationApi, 'textToSign').mockResolvedValue({ data: RESPUESTA } as never);
    render(<VoiceToSign />);
    await userEvent.type(screen.getByPlaceholderText(/Escribe una palabra/), 'hola');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));
    await screen.findByText('Historial de traducciones (1)');

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByPlaceholderText(/Escribe una palabra/)).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: '🔄 Repetir' }));
    expect(traducir).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Historial de traducciones (2)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar historial' }));
    expect(screen.queryByText(/Historial de traducciones/)).not.toBeInTheDocument();
  });
});

describe('Voz a Señas · valoración de la sesión', () => {
  const traducirAlgo = async () => {
    vi.spyOn(translationApi, 'textToSign').mockResolvedValue({ data: RESPUESTA } as never);
    render(<VoiceToSign />);
    await userEvent.type(screen.getByPlaceholderText(/Escribe una palabra/), 'hola');
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));
    await userEvent.click(await screen.findByRole('button', { name: '⭐ Valorar sesión' }));
  };

  it('should send the rating of the current session', async () => {
    const crear = vi.spyOn(feedbackApi, 'create').mockResolvedValue({ data: {} } as never);
    await traducirAlgo();

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    await userEvent.click(screen.getAllByRole('button', { name: '★' })[3]);
    await userEvent.type(screen.getByPlaceholderText('Comentario opcional…'), ' Muy clara ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(crear).toHaveBeenCalledWith({ id_session: 'ses-1', rating: 4, comment: 'Muy clara' });
    expect(await screen.findByText('✅ ¡Gracias por tu valoración!')).toBeInTheDocument();
  });

  it('should warn when the rating cannot be sent', async () => {
    vi.spyOn(feedbackApi, 'create').mockRejectedValue(new Error('409'));
    await traducirAlgo();

    await userEvent.click(screen.getAllByRole('button', { name: '★' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('❌ No se pudo enviar. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('should close the rating form with cancel', async () => {
    await traducirAlgo();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: '⭐ Valorar sesión' })).toBeInTheDocument();
  });
});

describe('Voz a Señas · dictado', () => {
  it('should start listening and translate by voice when the phrase ends', async () => {
    // Arrange
    const traducir = vi.spyOn(translationApi, 'vozToSign').mockResolvedValue({ data: RESPUESTA } as never);
    render(<VoiceToSign />);
    await userEvent.click(screen.getByRole('button', { name: '🎙️ Dictado por voz' }));
    expect(screen.getByText('Presiona el micrófono para hablar')).toBeInTheDocument();

    // Act: presiona el micrófono y el reconocimiento entrega la frase final
    await userEvent.click(screen.getByRole('button', { name: '🎙️' }));
    await act(async () => { voz.onFinalText?.('buenas noches'); });

    // Assert
    expect(voz.startListening).toHaveBeenCalled();
    expect(traducir).toHaveBeenCalledWith('buenas noches', undefined, 'es-CO');
    expect(await screen.findByText('Historial de traducciones (1)')).toBeInTheDocument();
  });

  it('should show the recognized text and stop while listening', async () => {
    voz.state = 'listening';
    voz.transcript = 'hola mundo';
    render(<VoiceToSign />);

    await userEvent.click(screen.getByRole('button', { name: '🎙️ Dictado por voz' }));

    expect(screen.getByText('Escuchando… habla ahora')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '🎙️' }));
    expect(voz.stopListening).toHaveBeenCalled();
  });

  it('should let the person translate the dictated text again', async () => {
    const traducir = vi.spyOn(translationApi, 'vozToSign').mockResolvedValue({ data: RESPUESTA } as never);
    const { rerender } = render(<VoiceToSign />);
    await userEvent.click(screen.getByRole('button', { name: '🎙️ Dictado por voz' }));

    // Act: llega el dictado y la persona pide traducirlo
    voz.transcript = 'gracias amigo';
    rerender(<VoiceToSign />);
    await userEvent.click(screen.getByRole('button', { name: 'Traducir a señas' }));

    // Assert
    expect(screen.getByText('Texto reconocido')).toBeInTheDocument();
    expect(traducir).toHaveBeenCalledWith('gracias amigo', undefined, 'es-CO');
  });

  it('should show a spinner while processing the audio', async () => {
    voz.state = 'processing';
    render(<VoiceToSign />);

    await userEvent.click(screen.getByRole('button', { name: '🎙️ Dictado por voz' }));

    expect(screen.getByText('Procesando…')).toBeInTheDocument();
  });

  it('should explain when the browser cannot recognize voice', async () => {
    voz.isSupported = false;
    render(<VoiceToSign />);

    await userEvent.click(screen.getByRole('button', { name: '🎙️ Dictado por voz' }));

    expect(screen.getByText(/Tu navegador no soporta reconocimiento de voz/)).toBeInTheDocument();
  });

  it('should show the microphone error', () => {
    voz.error = 'Permiso de micrófono denegado';

    render(<VoiceToSign />);

    expect(screen.getByText('Permiso de micrófono denegado')).toBeInTheDocument();
  });
});
