import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp, type Screen } from './store';
import { runtime } from './runtime';
import { registerPwa } from './pwa';
import { FreePlay } from './screens/FreePlay';
import { Toasts } from './components/Toasts';
import { ImportSummary } from './components/ImportSummary';
import { importFiles } from './importer';
import { CalibrationWizard } from './calibration/CalibrationWizard';
import { DevPanel } from './dev/DevPanel';
import { QuickCheck } from './calibration/QuickCheck';
import { Icon } from './components/Icon';

const NAV: { id: Screen; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'library', label: 'Library' },
  { id: 'practice', label: 'Practice' },
  { id: 'course', label: 'Course' },
  { id: 'drills', label: 'Drills' },
  { id: 'free', label: 'Free play' },
  { id: 'editor', label: 'Script editor' },
  { id: 'progress', label: 'Progress' },
  { id: 'settings', label: 'Settings' },
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
  const pendingImport = useApp((s) => s.pendingImport);
  const calibrationOpen = useApp((s) => s.calibrationOpen);
  const quickCheckOpen = useApp((s) => s.quickCheckOpen);
  const setApp = useApp((s) => s.set);
  const debug = useApp((s) => s.settings.debug) || new URLSearchParams(location.search).has('debug');
  const [dragging, setDragging] = useState(false);
  // Practice with a piece open hides the nav to give the sheet music the height.
  const immersive = useApp((s) => s.screen === 'practice' && !!s.score);
  const navOpen = useApp((s) => s.navOpen);
  const navRef = useRef<HTMLElement>(null);

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
      if (e.shiftKey) return; // Shift+letter = practice shortcuts
      // Computer keys play notes only when the virtual input is selected (clicks always work).
      if (useApp.getState().settings.inputSource !== 'virtual') return;
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

  // Auto-hiding nav: the mouse at the top edge or a swipe down from the top brings it back.
  useEffect(() => {
    if (!immersive) {
      setApp({ navOpen: false });
      return;
    }
    const open = (v: boolean) => {
      if (useApp.getState().navOpen !== v) setApp({ navOpen: v });
    };
    const inNav = (t: EventTarget | null) => !!navRef.current && t instanceof Node && navRef.current.contains(t);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (e.clientY <= 8) open(true);
      else if (useApp.getState().navOpen && !inNav(e.target)) {
        const bottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
        if (e.clientY > bottom + 24) open(false);
      }
    };
    const leave = (e: MouseEvent) => {
      if (e.clientY <= 0) open(true);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && !inNav(e.target) && !(e.target as Element | null)?.closest?.('.nav-handle')) open(false);
    };
    let swipeY: number | null = null;
    const touchStart = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? Infinity;
      swipeY = e.touches.length === 1 && y < 32 ? y : null;
    };
    const touchMove = (e: TouchEvent) => {
      if (swipeY === null) return;
      if ((e.touches[0]?.clientY ?? 0) - swipeY > 30) {
        swipeY = null;
        open(true);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') open(false);
    };
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('mouseleave', leave);
    window.addEventListener('pointerdown', down);
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('keydown', key);
    };
  }, [immersive, setApp]);

  // Drag-and-drop import anywhere.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) void importFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const render = screens[screen] ?? (screen === 'free' ? () => <FreePlay /> : null);

  return (
    <div className={`app${screen === 'practice' ? ' practicing' : ''}${immersive ? ' immersive' : ''}${immersive && navOpen ? ' nav-open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="nav" ref={navRef}>
        <div className="brand">OpenKeys</div>
        <nav className="nav-links" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} aria-current={screen === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="nav-end">
          <a className="icon-btn" href="https://github.com/PaulJoshi/OpenKeys" target="_blank" rel="noreferrer" aria-label="OpenKeys on GitHub" title="Free and open source, MIT licensed">
            <Icon name="github" />
          </a>
        </div>
      </header>
      <main className="main" id="main" tabIndex={-1}>
        {render ? render() : <div className="page muted">Loading…</div>}
      </main>
      <Toasts />
      {pendingImport && <ImportSummary key={pendingImport.id} initial={pendingImport} existing={false} />}
      {dragging && <div className="drag-overlay">Drop to import</div>}
      {debug && <DevPanel />}
      {quickCheckOpen && <QuickCheck onClose={() => setApp({ quickCheckOpen: false })} />}
      {calibrationOpen && <CalibrationWizard onClose={() => setApp({ calibrationOpen: false })} />}
    </div>
  );
}
