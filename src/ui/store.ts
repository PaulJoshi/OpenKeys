import { create } from 'zustand';
import type { Score } from '../core/types';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '../core/settings';
import { kvGet, kvSet } from '../core/progress/db';

export type Screen = 'today' | 'library' | 'practice' | 'course' | 'drills' | 'editor' | 'progress' | 'settings' | 'free';

export interface Toast {
  id: number;
  text: string;
  kind?: 'info' | 'good' | 'warn' | 'bad';
  action?: { label: string; run: () => void };
}

interface AppState {
  screen: Screen;
  settings: Settings;
  settingsLoaded: boolean;
  score: Score | null;
  /** Lesson context for the current practice (to award stars). */
  lessonId: string | null;
  toasts: Toast[];
  audioReady: boolean;
  pianoProgress: number; // 0-1
  calibrationOpen: boolean;
  /** "Practise this" request for the practice screen (loop drill on a range). */
  pendingDrill: { start: number; end: number; tempo: number; reviewId?: string } | null;
  /** Score waiting for the import summary dialog. */
  pendingImport: Score | null;
  go: (s: Screen) => void;
  setScore: (s: Score | null, lessonId?: string | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  toast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void;
  dismissToast: (id: number) => void;
  set: (patch: Partial<AppState>) => void;
}

let toastId = 0;

export const useApp = create<AppState>((set, get) => ({
  screen: 'today',
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  score: null,
  lessonId: null,
  toasts: [],
  audioReady: false,
  pianoProgress: 0,
  calibrationOpen: false,
  pendingDrill: null,
  pendingImport: null,
  go: (screen) => set({ screen }),
  setScore: (score, lessonId = null) => set({ score, lessonId }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void kvSet('settings', settings);
  },
  loadSettings: async () => {
    try {
      const stored = await kvGet<Partial<Settings>>('settings');
      set({ settings: mergeSettings(stored), settingsLoaded: true });
    } catch {
      set({ settingsLoaded: true });
    }
  },
  toast: (text, kind = 'info', action) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, kind, action }] });
    window.setTimeout(() => get().dismissToast(id), action ? 9000 : 5000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  set: (patch) => set(patch),
}));

export const getSettings = () => useApp.getState().settings;
