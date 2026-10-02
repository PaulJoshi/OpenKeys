import { useEffect, useState, type ReactNode } from 'react';
import { useApp, type Screen } from './store';
import { runtime } from './runtime';
import { registerPwa } from './pwa';
import { FreePlay } from './screens/FreePlay';
import { Toasts } from './components/Toasts';

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀' },
  { id: 'library', label: 'Library', icon: '♫' },
  { id: 'practice', label: 'Practice', icon: '▶' },
  { id: 'course', label: 'Course', icon: '◎' },
  { id: 'drills', label: 'Drills', icon: '⟳' },
  { id: 'free', label: 'Free play', icon: '♪' },
  { id: 'editor', label: 'Script editor', icon: '✎' },
  { id: 'progress', label: 'Progress', icon: '↗' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

export function App() {
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);
  const theme = useApp((s) => s.settings.theme);
  const loadSettings = useApp((s) => s.loadSettings);
  const [screens, setScreens] = useState<Partial<Record<Screen, () => ReactNode>>>({});

  useEffect(() => {
    void loadSettings();
    void registerPwa();
    // Screens are loaded lazily so the shell paints fast.
    void import('./screens/index').then((m) => setScreens(m.SCREENS));
  }, [loadSettings]);

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global virtual-input keyboard handling.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey && !e.repeat) return; // Shift+letter = practice shortcuts
      if (runtime.virtual.keyDown(e.code, e.timeStamp, e.repeat)) {
        e.preventDefault();
        void runtime.ensureAudio();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (runtime.virtual.keyUp(e.code, e.timeStamp)) e.preventDefault();
    };
    const gesture = () => void runtime.ensureAudio();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', gesture, { once: true });
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', gesture);
    };
  }, []);

  const render = screens[screen] ?? (screen === 'free' ? () => <FreePlay /> : null);

  return (
    <div className="app">
      <nav className="nav" aria-label="Main">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          OpenKeys
        </div>
        {NAV.map((n) => (
          <button key={n.id} aria-current={screen === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <span aria-hidden="true">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="spacer" />
        <div className="small">Free &amp; open source · MIT</div>
      </nav>
      <main className="main" id="main">
        {render ? render() : <div className="page muted">Loading…</div>}
      </main>
      <Toasts />
    </div>
  );
}
