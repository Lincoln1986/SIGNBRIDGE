import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos y estado persistente (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

interface A11ySettings {
  bigText: boolean;
  hugeText: boolean;
  highContrast: boolean;
  darkContrast: boolean;
  highlightLinks: boolean;
  textSpacing: boolean;
  lineHeight: boolean;
  stopAnimations: boolean;
  hideImages: boolean;
  dyslexiaFont: boolean;
  bigCursor: boolean;
  alignLeft: boolean;
  grayscale: boolean;
}

const DEFAULT_SETTINGS: A11ySettings = {
  bigText: false,
  hugeText: false,
  highContrast: false,
  darkContrast: false,
  highlightLinks: false,
  textSpacing: false,
  lineHeight: false,
  stopAnimations: false,
  hideImages: false,
  dyslexiaFont: false,
  bigCursor: false,
  alignLeft: false,
  grayscale: false,
};

const STORAGE_KEY = 'signbridge-a11y-settings';

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Construye el <style> global según los ajustes activos
// ─────────────────────────────────────────────────────────────────────────────

function buildCss(s: A11ySettings): string {
  const rules: string[] = [];

  if (s.bigText) {
    rules.push(`html { font-size: 112% !important; }`);
  }
  if (s.hugeText) {
    rules.push(`html { font-size: 128% !important; }`);
  }
  if (s.highContrast) {
    rules.push(`
      html { filter: contrast(1.35) !important; }
    `);
  }
  if (s.darkContrast) {
    rules.push(`
      html { filter: invert(1) hue-rotate(180deg) !important; }
      img, video, iframe, svg image { filter: invert(1) hue-rotate(180deg) !important; }
    `);
  }
  if (s.highlightLinks) {
    rules.push(`
      a, button { outline: 2px solid #F6A623 !important; text-decoration: underline !important; text-underline-offset: 3px !important; }
    `);
  }
  if (s.textSpacing) {
    rules.push(`
      body, p, span, li, td, th, label, h1, h2, h3, h4, h5, h6 {
        letter-spacing: 0.06em !important;
        word-spacing: 0.12em !important;
      }
    `);
  }
  if (s.lineHeight) {
    rules.push(`
      body, p, li, td, th, label { line-height: 2 !important; }
    `);
  }
  if (s.stopAnimations) {
    rules.push(`
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001s !important;
        scroll-behavior: auto !important;
      }
    `);
  }
  if (s.hideImages) {
    rules.push(`
      img, picture, video, svg:not(.a11y-icon) { visibility: hidden !important; }
    `);
  }
  if (s.dyslexiaFont) {
    rules.push(`
      body, p, span, li, td, th, label, input, textarea, button, h1, h2, h3, h4, h5, h6 {
        font-family: 'Verdana', 'Arial', sans-serif !important;
        letter-spacing: 0.04em !important;
      }
    `);
  }
  if (s.bigCursor) {
    rules.push(`
      *, *::before, *::after {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M3 2l18 9-8 2-2 8z" fill="black" stroke="white" stroke-width="1.5"/></svg>') 0 0, auto !important;
      }
    `);
  }
  if (s.alignLeft) {
    rules.push(`
      body, p, div, li, td, th { text-align: left !important; }
    `);
  }
  if (s.grayscale) {
    rules.push(`html { filter: grayscale(1) !important; }`);
  }

  return rules.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectura de página (Web Speech API)
// ─────────────────────────────────────────────────────────────────────────────

function readPageAloud() {
  if (!('speechSynthesis' in window)) {
    alert('Tu navegador no soporta lectura de voz.');
    return;
  }
  window.speechSynthesis.cancel();
  const main = document.querySelector('main') ?? document.body;
  const text = (main.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000);
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CO';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function stopReading() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ─────────────────────────────────────────────────────────────────────────────
// Botón individual del panel
// ─────────────────────────────────────────────────────────────────────────────

function A11yButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={!!active}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
        border: active ? '1.5px solid var(--violet)' : '1.5px solid var(--gray-100)',
        background: active ? 'var(--violet)' : 'var(--white)',
        color: active ? 'white' : 'var(--gray-700)',
        transition: 'all 0.15s', fontFamily: 'var(--font-body)',
        minHeight: 76,
      }}
    >
      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(() => loadSettings());
  const [reading, setReading] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      const tag = document.createElement('style');
      tag.id = 'a11y-widget-styles';
      document.head.appendChild(tag);
      styleRef.current = tag;
    }
    styleRef.current.textContent = buildCss(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (key: keyof A11ySettings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'bigText' && next.bigText) next.hugeText = false;
      if (key === 'hugeText' && next.hugeText) next.bigText = false;
      if (key === 'highContrast' && next.highContrast) next.darkContrast = false;
      if (key === 'darkContrast' && next.darkContrast) next.highContrast = false;
      return next;
    });
  };

  const handleReadToggle = () => {
    if (reading) {
      stopReading();
      setReading(false);
    } else {
      readPageAloud();
      setReading(true);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    stopReading();
    setReading(false);
  };

  const anyActive = Object.values(settings).some(Boolean);

  return (
    <>
      {/* Región para lectores de pantalla: anuncia el estado de la lectura en voz */}
      <div
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {reading ? 'Lectura de página iniciada' : 'Lectura de página detenida'}
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Abrir menú de accesibilidad"
        aria-expanded={open}
        style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 5000,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--violet)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(91,79,207,0.4)',
          color: 'white', fontSize: '1.5rem',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <svg className="a11y-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="4.5" r="1.8" fill="white"/>
          <path d="M4 8.5c3-1 13-1 16 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 8.5v11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 12.5c-1.8 2.5-3.2 4-5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 12.5c1.8 2.5 3.2 4 5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        {anyActive && (
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 12, height: 12,
            borderRadius: '50%', background: 'var(--amber)', border: '2px solid white',
          }} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Menú de accesibilidad"
          style={{
            position: 'fixed', bottom: 152, right: 24, zIndex: 5000,
            width: 340, maxHeight: '75vh', overflowY: 'auto',
            background: 'var(--white)', borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            border: '1px solid var(--gray-100)',
          }}
        >
          <div style={{
            padding: '16px 18px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: 'var(--white)', borderRadius: '16px 16px 0 0',
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--gray-800)', fontFamily: 'var(--font-display)' }}>
                Menú de accesibilidad
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>SignBridge</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú de accesibilidad"
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <A11yButton icon={reading ? '⏹️' : '🔊'} label={reading ? 'Detener lectura' : 'Leer página'} active={reading} onClick={handleReadToggle} />
            <A11yButton icon="A+" label="Texto grande" active={settings.bigText} onClick={() => toggle('bigText')} />
            <A11yButton icon="A++" label="Texto muy grande" active={settings.hugeText} onClick={() => toggle('hugeText')} />
            <A11yButton icon="◐" label="Contraste +" active={settings.highContrast} onClick={() => toggle('highContrast')} />
            <A11yButton icon="◑" label="Contraste oscuro" active={settings.darkContrast} onClick={() => toggle('darkContrast')} />
            <A11yButton icon="🔗" label="Resaltar enlaces" active={settings.highlightLinks} onClick={() => toggle('highlightLinks')} />
            <A11yButton icon="⇔" label="Espaciado de texto" active={settings.textSpacing} onClick={() => toggle('textSpacing')} />
            <A11yButton icon="≡" label="Altura de línea" active={settings.lineHeight} onClick={() => toggle('lineHeight')} />
            <A11yButton icon="⏸" label="Detener animaciones" active={settings.stopAnimations} onClick={() => toggle('stopAnimations')} />
            <A11yButton icon="🖼️" label="Ocultar imágenes" active={settings.hideImages} onClick={() => toggle('hideImages')} />
            <A11yButton icon="Df" label="Apto para dislexia" active={settings.dyslexiaFont} onClick={() => toggle('dyslexiaFont')} />
            <A11yButton icon="⭑" label="Cursor grande" active={settings.bigCursor} onClick={() => toggle('bigCursor')} />
            <A11yButton icon="◀" label="Texto alineado" active={settings.alignLeft} onClick={() => toggle('alignLeft')} />
            <A11yButton icon="◒" label="Escala de grises" active={settings.grayscale} onClick={() => toggle('grayscale')} />
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={handleReset}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: 'var(--violet)', color: 'white', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              🔄 Restablecer todo
            </button>
          </div>
        </div>
      )}
    </>
  );
}