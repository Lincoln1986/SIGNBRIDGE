// Autor: @juan-soto350 · S6 (Front: panel de administración)
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminUsersApi, dashboardApi, statsApi } from '../api/client';
import { AuthContext, type AuthContextType } from '../context/auth-context';
import AdminDashboard from './AdminDashboard';

// Las gráficas ya tienen su propio test (StatsCharts.test.tsx). Acá solo
// importa que el panel les pase los datos, así que se reemplazan por stubs.
vi.mock('../components/StatsCharts', () => {
  const stub = (nombre: string) => () => <div data-testid={nombre} />;
  return {
    MetricsBarChart: stub('metricas'), RatingGauge: stub('valoracion'),
    RoleDistributionChart: stub('roles'), RegionDistributionChart: stub('regiones'),
    TopWordsChart: stub('palabras'), ChannelUsageChart: stub('canales'), ActivityChart: stub('actividad'),
  };
});

const usuario = (n: number, extra = {}) => ({
  id_user: `u${n}`, full_name: `Persona ${n}`, email: `p${n}@example.com`,
  role_name: 'Cliente', region: 'Bogotá', is_active: true, ...extra,
});

// 10 personas: la tabla muestra 8 por página
const USUARIOS = [
  usuario(1, { full_name: 'Admin Uno', role_name: 'Administrador' }),
  usuario(2, { full_name: 'Sofía Soporte', role_name: 'Soporte' }),
  ...Array.from({ length: 8 }, (_, i) => usuario(i + 3)),
];

const ESTADISTICAS = {
  total_users: 10, total_translations: 42, total_support_requests: 3,
  total_feedback: 5, average_rating: 4.25,
};

function renderPanel() {
  const sesion = {
    token: 't', user: { id_user: 'u1', full_name: 'Admin Uno', email: 'p1@example.com', role: 'Administrador' },
    role: 'Administrador', loading: false, login: vi.fn(), logout: vi.fn(), isAdmin: true, isSupport: false,
  } as unknown as AuthContextType;
  return render(
    <AuthContext.Provider value={sesion}>
      <MemoryRouter><AdminDashboard /></MemoryRouter>
    </AuthContext.Provider>
  );
}

const fila = (nombre: string) => screen.getByText(nombre).closest('tr')!;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(adminUsersApi, 'list').mockResolvedValue({ data: USUARIOS } as never);
  vi.spyOn(dashboardApi, 'stats').mockResolvedValue({ data: ESTADISTICAS } as never);
  vi.spyOn(dashboardApi, 'admin').mockResolvedValue({
    data: [{ email: 'p3@example.com', total_translations: 7, support_tickets: 2, feedback_count: 1 }],
  } as never);
  vi.spyOn(dashboardApi, 'lexicalUnitsAdmin').mockResolvedValue({
    data: [
      { id_lexicalunit: 'l1', text: 'Hola', language: 'es_CO', video_url: 'https://youtu.be/abc' },
      { id_lexicalunit: 'l2', text: 'Gracias', language: 'es_CO' },
    ],
  } as never);
  for (const metodo of ['resumenInteraccion', 'palabrasGlobales', 'canalesGlobales', 'actividadGlobal'] as const) {
    vi.spyOn(statsApi, metodo).mockResolvedValue({ data: [] } as never);
  }
});

describe('Administración · Usuarios', () => {
  it('should list the users with their metrics and paginate by 8', async () => {
    // Act
    renderPanel();

    // Assert
    expect(await screen.findByText('Mostrando 1–8 de 10')).toBeInTheDocument();
    expect(within(fila('Persona 3')).getByText('7')).toBeInTheDocument(); // traducciones
    expect(screen.queryByText('Persona 9')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('Mostrando 9–10 de 10')).toBeInTheDocument();
    expect(screen.getByText('Persona 9')).toBeInTheDocument();
  });

  it('should search by name, email or role', async () => {
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre, correo o rol...'), 'soporte');

    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
    expect(screen.getByText('Sofía Soporte')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText('Buscar por nombre, correo o rol...'));
    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre, correo o rol...'), 'nadie');
    expect(screen.getAllByText('Sin resultados')).toHaveLength(2);
  });

  it('should still show the users when the metrics view fails', async () => {
    vi.spyOn(dashboardApi, 'admin').mockRejectedValue(new Error('500'));

    renderPanel();

    expect(await screen.findByText('Mostrando 1–8 de 10')).toBeInTheDocument();
  });

  it('should show an error when the users cannot be loaded', async () => {
    vi.spyOn(adminUsersApi, 'list').mockRejectedValue(new Error('500'));

    renderPanel();

    expect(await screen.findByText('No se pudieron cargar los datos')).toBeInTheDocument();
  });

  it('should not let the administrator change their own role', async () => {
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    expect(within(fila('Admin Uno')).getByTitle('No puedes cambiar tu propio rol')).toBeDisabled();
  });

  it('should change the role of another user', async () => {
    // Arrange
    vi.spyOn(dashboardApi, 'roles').mockResolvedValue({
      data: [{ id_role: 'r1', role_name: 'Cliente' }, { id_role: 'r3', role_name: 'Soporte' }],
    } as never);
    const cambiar = vi.spyOn(adminUsersApi, 'updateRole').mockResolvedValue({ data: {} } as never);
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    // Act
    await userEvent.click(within(fila('Persona 3')).getByTitle('Cambiar rol'));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled(); // mismo rol
    await userEvent.click(await screen.findByRole('radio', { name: 'Soporte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    // Assert
    expect(cambiar).toHaveBeenCalledWith('u3', 'Soporte');
    expect(await screen.findByText('✅ Rol actualizado a "Soporte"')).toBeInTheDocument();
    expect(within(fila('Persona 3')).getByText('Soporte')).toBeInTheDocument();
  });

  it('should show the backend message when the role cannot be changed', async () => {
    vi.spyOn(dashboardApi, 'roles').mockRejectedValue(new Error('404')); // usa roles por defecto
    vi.spyOn(adminUsersApi, 'updateRole').mockRejectedValue({
      response: { data: { detail: 'Debe quedar al menos un administrador' } },
    });
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(within(fila('Persona 3')).getByTitle('Cambiar rol'));
    await userEvent.click(await screen.findByRole('radio', { name: 'Administrador' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Debe quedar al menos un administrador')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Cambiar rol')).not.toBeInTheDocument();
  });

  it('should deactivate a user and mark them as inactive', async () => {
    const baja = vi.spyOn(adminUsersApi, 'setActive').mockResolvedValue({ data: {} } as never);
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(within(fila('Persona 4')).getByTitle('Desactivar usuario'));

    expect(baja).toHaveBeenCalledWith('u4', false);
    expect(await screen.findByText('✅ Usuario desactivado')).toBeInTheDocument();
    expect(within(fila('Persona 4')).getByText('Inactivo')).toBeInTheDocument();
    expect(within(fila('Persona 4')).getByTitle('Activar usuario')).toBeInTheDocument();
  });

  it('should warn when the status cannot be changed', async () => {
    vi.spyOn(adminUsersApi, 'setActive').mockRejectedValue(new Error('500'));
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(within(fila('Persona 4')).getByTitle('Desactivar usuario'));

    expect(await screen.findByText('❌ No se pudo cambiar el estado')).toBeInTheDocument();
  });

  it('should download the users as CSV', async () => {
    // Arrange: jsdom no crea URLs de blobs
    vi.spyOn(adminUsersApi, 'exportCsv').mockResolvedValue({ data: 'nombre,correo' } as never);
    URL.createObjectURL = vi.fn(() => 'blob:usuarios');
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    // Act
    await userEvent.click(screen.getByTitle('Exportar usuarios a CSV'));

    // Assert
    expect(clic).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:usuarios');
    expect(await screen.findByText('✅ CSV descargado')).toBeInTheDocument();
  });

  it('should warn when the CSV cannot be exported', async () => {
    vi.spyOn(adminUsersApi, 'exportCsv').mockRejectedValue(new Error('500'));
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(screen.getByTitle('Exportar usuarios a CSV'));

    expect(await screen.findByText('❌ No se pudo exportar el CSV')).toBeInTheDocument();
  });
});

describe('Administración · Vocabulario', () => {
  const abrirVocabulario = async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Vocabulario/ }));
    await screen.findByText('Hola');
  };

  it('should list the words, count the videos and search', async () => {
    await abrirVocabulario();

    expect(screen.getByText('Unidades léxicas (2)')).toBeInTheDocument();
    expect(screen.getByText('1 con video asignado')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Buscar palabra...'), 'gra');
    expect(screen.getByText('Unidades léxicas (1)')).toBeInTheDocument();
  });

  it('should create a new word and put it first', async () => {
    const crear = vi.spyOn(dashboardApi, 'createLexicalUnit').mockResolvedValue({
      data: { id_lexicalunit: 'l3', text: 'Familia', language: 'es' },
    } as never);
    await abrirVocabulario();

    await userEvent.click(screen.getByRole('button', { name: '+ Nueva palabra' }));
    await userEvent.type(screen.getByLabelText('Palabra *'), '  Familia ');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'es');
    await userEvent.click(screen.getByRole('button', { name: 'Crear palabra' }));

    expect(crear).toHaveBeenCalledWith({ text: 'Familia', language: 'es' });
    expect(await screen.findByText('Unidades léxicas (3)')).toBeInTheDocument();
  });

  it('should show an error when the word cannot be created', async () => {
    vi.spyOn(dashboardApi, 'createLexicalUnit').mockRejectedValue(new Error('409'));
    await abrirVocabulario();

    await userEvent.click(screen.getByRole('button', { name: '+ Nueva palabra' }));
    await userEvent.type(screen.getByLabelText('Palabra *'), 'Hola');
    await userEvent.click(screen.getByRole('button', { name: 'Crear palabra' }));

    expect(await screen.findByText('No se pudo crear la palabra')).toBeInTheDocument();
  });

  it('should assign a video to a word without one', async () => {
    const guardar = vi.spyOn(dashboardApi, 'updateLexicalUnitVideo').mockResolvedValue({ data: {} } as never);
    await abrirVocabulario();

    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    await userEvent.click(screen.getByRole('tab', { name: '🔗 Enlace (YouTube)' }));
    await userEvent.type(screen.getByLabelText('URL del video (YouTube o enlace directo)'), 'https://youtu.be/xyz');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar video' }));

    expect(guardar).toHaveBeenCalledWith('l2', 'https://youtu.be/xyz');
    expect(await screen.findByText('✅ Video asignado correctamente')).toBeInTheDocument();
    expect(screen.getByText('2 con video asignado')).toBeInTheDocument();
  });

  it('should remove a video when the URL is left empty', async () => {
    vi.spyOn(dashboardApi, 'updateLexicalUnitVideo').mockResolvedValue({ data: {} } as never);
    await abrirVocabulario();

    await userEvent.click(within(fila('Hola')).getByRole('button', { name: '✏️ Editar' }));
    await userEvent.clear(screen.getByLabelText('URL del video (YouTube o enlace directo)'));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar video' }));

    expect(await screen.findByText('✅ Video eliminado')).toBeInTheDocument();
  });

  it('should keep the video window open when saving fails', async () => {
    vi.spyOn(dashboardApi, 'updateLexicalUnitVideo').mockRejectedValue(new Error('422'));
    await abrirVocabulario();

    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    await userEvent.click(screen.getByRole('tab', { name: '🔗 Enlace (YouTube)' }));
    await userEvent.type(screen.getByLabelText('URL del video (YouTube o enlace directo)'), 'no-es-url');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar video' }));

    expect(await screen.findByText('No se pudo guardar el video')).toBeInTheDocument();
  });

  it('should upload a video file for a word', async () => {
    const subir = vi.spyOn(dashboardApi, 'uploadLexicalUnitVideo').mockResolvedValue({
      data: { id_lexicalunit: 'l2', text: 'Gracias', language: 'es_CO', video_url: '/media/subidos/x.mp4' },
    } as never);
    await abrirVocabulario();
    const video = new File(['mp4'], 'gracias.mp4', { type: 'video/mp4' });

    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    await userEvent.upload(screen.getByLabelText('Archivo de video'), video);
    await userEvent.click(screen.getByRole('button', { name: 'Subir video' }));

    expect(subir).toHaveBeenCalledWith('l2', video);
    expect(await screen.findByText('✅ Video subido correctamente')).toBeInTheDocument();
    expect(screen.getByText('2 con video asignado')).toBeInTheDocument();
  });

  it('should ask for a file before uploading', async () => {
    const subir = vi.spyOn(dashboardApi, 'uploadLexicalUnitVideo');
    await abrirVocabulario();

    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Subir video' }));

    expect(await screen.findByText('Elige un archivo de video')).toBeInTheDocument();
    expect(subir).not.toHaveBeenCalled();
  });

  it('should refuse files that are not videos or are too big', async () => {
    await abrirVocabulario();
    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    const entrada = screen.getByLabelText('Archivo de video');

    await userEvent.upload(entrada, new File(['<html>'], 'x.html', { type: 'text/html' }), { applyAccept: false });
    expect(screen.getByText('Solo se aceptan videos MP4, WebM o MOV')).toBeInTheDocument();

    const grande = new File(['x'], 'grande.mp4', { type: 'video/mp4' });
    Object.defineProperty(grande, 'size', { value: 101 * 1024 * 1024 });
    await userEvent.upload(entrada, grande);
    expect(screen.getByText('El video supera el límite de 100 MB')).toBeInTheDocument();
  });

  it('should show the reason the server gives when the upload fails', async () => {
    vi.spyOn(dashboardApi, 'uploadLexicalUnitVideo').mockRejectedValue({
      response: { data: { detail: 'El archivo no es un video válido.' } },
    });
    await abrirVocabulario();

    await userEvent.click(within(fila('Gracias')).getByRole('button', { name: '▶ Agregar' }));
    await userEvent.upload(screen.getByLabelText('Archivo de video'), new File(['x'], 'v.mp4', { type: 'video/mp4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Subir video' }));

    expect(await screen.findByText('El archivo no es un video válido.')).toBeInTheDocument();
  });

  it('should delete a word only after confirming', async () => {
    const borrar = vi.spyOn(dashboardApi, 'deleteLexicalUnit').mockResolvedValue({ data: {} } as never);
    await abrirVocabulario();

    await userEvent.click(within(fila('Hola')).getByRole('button', { name: '🗑 Eliminar' }));
    expect(screen.getByText('¿Eliminar palabra?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(borrar).toHaveBeenCalledWith('l1');
    expect(await screen.findByText('✅ Palabra eliminada')).toBeInTheDocument();
    expect(screen.queryByText('Hola')).not.toBeInTheDocument();
  });

  it('should warn when the word cannot be deleted', async () => {
    vi.spyOn(dashboardApi, 'deleteLexicalUnit').mockRejectedValue(new Error('500'));
    await abrirVocabulario();

    await userEvent.click(within(fila('Hola')).getByRole('button', { name: '🗑 Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('❌ No se pudo eliminar')).toBeInTheDocument();
  });
});

describe('Administración · Estadísticas', () => {
  it('should show the system numbers and the charts', async () => {
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(screen.getByRole('button', { name: /Estadísticas/ }));

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('4.3 / 5')).toBeInTheDocument();
    expect(screen.getByTestId('roles')).toBeInTheDocument();
    expect(screen.getByTestId('valoracion')).toBeInTheDocument();
    expect(screen.getByText('Cómo se está usando SignBridge')).toBeInTheDocument();
  });

  it('should show the usage cards when the summary arrives', async () => {
    vi.spyOn(statsApi, 'resumenInteraccion').mockResolvedValue({
      data: { total_words_translated: 120, distinct_words_used: 30, words_not_found: 4, avg_words_per_session: 2.5 },
    } as never);
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(screen.getByRole('button', { name: /Estadísticas/ }));

    expect(await screen.findByText('Palabras traducidas')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('should explain when the stats endpoint is not available', async () => {
    vi.spyOn(dashboardApi, 'stats').mockResolvedValue({ data: null } as never);
    renderPanel();
    await screen.findByText('Mostrando 1–8 de 10');

    await userEvent.click(screen.getByRole('button', { name: /Estadísticas/ }));

    expect(screen.getByText(/estarán disponibles cuando el endpoint/)).toBeInTheDocument();
  });
});
