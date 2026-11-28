import { useState } from 'react';
import { dashboardApi } from '../api/client';
import type { LexicalUnitAdmin } from '../api/client';
import { Alert, Btn, Input } from '../components/UI';

// ── Video modal ────────────────────────────────────────────────────────────

/** Los mismos tipos y tamaño que acepta el backend (app/services/videos.py). */
const TIPOS_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAXIMO_MB = 100;

type Modo = 'archivo' | 'enlace';

export function VideoModal({ unit, onClose, onSave, onUploaded }: {
  unit: LexicalUnitAdmin;
  onClose: () => void;
  onSave: (id: string, url: string | null) => Promise<void>;
  /** Se llama con la palabra ya actualizada después de subir un archivo. */
  onUploaded?: (unit: LexicalUnitAdmin) => void;
}) {
  // Si la palabra ya tiene un enlace externo (YouTube), se abre en "Enlace".
  const tieneEnlace = !!unit.video_url && /^https?:\/\//.test(unit.video_url);
  const [modo, setModo] = useState<Modo>(tieneEnlace ? 'enlace' : 'archivo');
  const [url, setUrl] = useState(tieneEnlace ? unit.video_url ?? '' : '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const elegirArchivo = (f: File | null) => {
    setError('');
    if (f && !TIPOS_VIDEO.includes(f.type)) {
      setError('Solo se aceptan videos MP4, WebM o MOV');
      setArchivo(null);
      return;
    }
    if (f && f.size > MAXIMO_MB * 1024 * 1024) {
      setError(`El video supera el límite de ${MAXIMO_MB} MB`);
      setArchivo(null);
      return;
    }
    setArchivo(f);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modo === 'archivo') {
        if (!archivo) { setError('Elige un archivo de video'); return; }
        const { data } = await dashboardApi.uploadLexicalUnitVideo(unit.id_lexicalunit, archivo);
        onUploaded?.(data);
      } else {
        await onSave(unit.id_lexicalunit, url.trim() || null);
      }
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'No se pudo guardar el video');
    } finally {
      setSaving(false);
    }
  };

  const pestana = (valor: Modo, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === valor}
      onClick={() => { setModo(valor); setError(''); }}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: `1.5px solid ${modo === valor ? 'var(--violet)' : 'var(--gray-200)'}`,
        background: modo === valor ? 'var(--violet-light)' : 'var(--white)',
        color: modo === valor ? 'var(--violet)' : 'var(--gray-600)',
        fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-body)',
      }}
    >
      {texto}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Asignar video a ${unit.text}`}
        style={{
          background: 'var(--white)', borderRadius: 'var(--radius)', padding: 32,
          width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: 6 }}>
          Asignar video de seña
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: 20 }}>
          Palabra: <strong style={{ color: 'var(--violet)' }}>{unit.text}</strong>
        </p>

        <div role="tablist" aria-label="Origen del video" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {pestana('archivo', '📁 Subir video')}
          {pestana('enlace', '🔗 Enlace (YouTube)')}
        </div>

        {error && <div style={{ marginBottom: 14 }}><Alert type="error" message={error} /></div>}

        <div style={{ marginBottom: 20 }}>
          {modo === 'archivo' ? (
            <>
              <label htmlFor="archivo-video" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                Archivo de video
              </label>
              <input
                id="archivo-video"
                type="file"
                accept={TIPOS_VIDEO.join(',')}
                onChange={e => elegirArchivo(e.target.files?.[0] ?? null)}
                style={{ display: 'block', marginTop: 6, fontSize: '0.85rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>
                MP4, WebM o MOV, hasta {MAXIMO_MB} MB. Queda guardado en el servidor y no depende de YouTube.
              </p>
            </>
          ) : (
            <>
              <Input
                label="URL del video (YouTube o enlace directo)"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>
                Acepta YouTube (watch, youtu.be o shorts) y archivos de video directos. Deja vacío para quitar el video.
              </p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn size="sm" loading={saving} onClick={handleSave}>
            {modo === 'archivo' ? 'Subir video' : url.trim() ? 'Guardar video' : 'Quitar video'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── New word modal ─────────────────────────────────────────────────────────

export function NewWordModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (unit: LexicalUnitAdmin) => void;
}) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('es_CO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!text.trim()) { setError('El texto es requerido'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await dashboardApi.createLexicalUnit({ text: text.trim(), language });
      onCreated(data);
      onClose();
    } catch {
      setError('No se pudo crear la palabra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)', padding: 32,
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: 20 }}>
          Nueva palabra
        </h3>

        {error && <div style={{ marginBottom: 14 }}><Alert type="error" message={error} /></div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Palabra *"
            placeholder="Ej: Hola"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>Idioma</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                padding: '10px 14px', border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.9rem',
                background: 'var(--white)', fontFamily: 'var(--font-body)', outline: 'none',
              }}
            >
              <option value="es_CO">Español Colombia (es_CO)</option>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn size="sm" loading={saving} onClick={handleCreate} disabled={!text.trim()}>
            Crear palabra
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────

export function DeleteConfirmModal({ unit, onClose, onConfirm, deleting }: {
  unit: LexicalUnitAdmin;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)', padding: 32,
        maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: 10 }}>
          ¿Eliminar palabra?
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: 24 }}>
          Se eliminará <strong style={{ color: 'var(--violet)' }}>{unit.text}</strong> del vocabulario. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" size="sm" loading={deleting} onClick={onConfirm}>Eliminar</Btn>
        </div>
      </div>
    </div>
  );
}
