import { useState } from 'react';
import { dashboardApi } from '../api/client';
import type { LexicalUnitAdmin } from '../api/client';
import { Alert, Btn, Input } from '../components/UI';

// ── Video modal ────────────────────────────────────────────────────────────

export function VideoModal({ unit, onClose, onSave }: {
  unit: LexicalUnitAdmin;
  onClose: () => void;
  onSave: (id: string, url: string | null) => Promise<void>;
}) {
  const [url, setUrl] = useState(unit.video_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await onSave(unit.id_lexicalunit, url.trim() || null);
      onClose();
    } catch {
      setError('No se pudo guardar el video');
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
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: 6 }}>
          Asignar video de seña
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: 20 }}>
          Palabra: <strong style={{ color: 'var(--violet)' }}>{unit.text}</strong>
        </p>

        {error && <div style={{ marginBottom: 14 }}><Alert type="error" message={error} /></div>}

        <div style={{ marginBottom: 20 }}>
          <Input
            label="URL del video (YouTube o enlace directo)"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>
            Acepta URLs de YouTube (watch o youtu.be) y archivos de video directos. Deja vacío para quitar el video.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn size="sm" loading={saving} onClick={handleSave}>
            {url.trim() ? 'Guardar video' : 'Quitar video'}
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
