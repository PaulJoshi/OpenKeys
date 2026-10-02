import type { AudioClock } from '../core/clock';
import { InputBus } from '../core/input/bus';
import { VirtualInput } from '../core/input/virtual/virtual';
import type { InputPlugin } from '../core/input/types';
import { ensureEngine, getEngine, type AudioEngine } from '../core/playback/engine';
import type { InputSource, NoteEvent } from '../core/types';
import { midiToName } from '../core/music';
import { liveKeys, meter } from './live';
import { useApp, getSettings } from './store';

export const SAMPLE_BASE = `${import.meta.env.BASE_URL}samples/piano/`;

/** Clock that works before the AudioContext exists (falls back to performance.now()). */
const proxyClock: AudioClock = {
  now: () => getEngine()?.now() ?? performance.now() / 1000,
  perfToAudio: (ms) => getEngine()?.perfToAudio(ms) ?? ms / 1000,
  audioToPerf: (s) => getEngine()?.audioToPerf(s) ?? s * 1000,
};

/**
 * The app runtime: owns the audio engine and the input plugins, merges inputs into one
 * InputBus, and drives monitoring sound and live key highlights. Framework-free; React
 * components talk to it through `runtime` and the zustand store.
 */
class Runtime {
  readonly bus = new InputBus();
  readonly clock = proxyClock;
  readonly virtual = new VirtualInput(proxyClock);
  private plugins = new Map<InputSource, InputPlugin>();
  private unsubs = new Map<InputSource, () => void>();
  /** Set by the practice session to intercept judged feedback for key colours. */
  judgeHighlights = false;

  constructor() {
    this.register(this.virtual);
    this.bus.events.on((e) => this.onEvent(e));
    void this.virtual.start();
  }

  get engine(): AudioEngine | null {
    return getEngine();
  }

  register(p: InputPlugin): void {
    this.plugins.get(p.source)?.stop();
    this.unsubs.get(p.source)?.();
    this.plugins.set(p.source, p);
    this.unsubs.set(
      p.source,
      p.onEvent((e) => this.bus.push(e)),
    );
  }

  plugin<T extends InputPlugin>(source: InputSource): T | undefined {
    return this.plugins.get(source) as T | undefined;
  }

  /** Must be called from a user gesture the first time. */
  async ensureAudio(): Promise<AudioEngine> {
    const had = !!getEngine();
    const e = await ensureEngine(SAMPLE_BASE);
    if (!had) {
      const s = getSettings();
      e.setVolume(s.volume);
      e.metronome.volume = s.metronomeVolume;
      e.metronome.visualOnly = s.metronomeVisualOnly;
      e.loadProgress.on((p) => useApp.getState().set({ pianoProgress: p.loaded / p.total }));
      useApp.getState().set({ audioReady: true });
    }
    return e;
  }

  private onEvent(e: NoteEvent): void {
    const s = getSettings();
    const eng = getEngine();
    if (e.kind === 'noteOn') {
      // Monitoring: the virtual keyboard has no sound of its own; MIDI keyboards do.
      if (eng && (e.source === 'virtual' || (e.source === 'midi' && s.monitorMidi))) {
        eng.piano.noteOn(e.midi, e.velocity ?? 0.7, Math.max(eng.now(), e.time));
      }
      if (!this.judgeHighlights) {
        if (e.source === 'mic') liveKeys.flash(e.midi, 'down', 300);
        else liveKeys.press(e.midi, 'down');
      }
      meter.set({
        ...meter.value,
        source: e.source,
        noteName: e.source === 'mic' ? meter.value.noteName : midiToName(e.midi),
        lastVelocity: e.velocity ?? null,
        active: true,
      });
    } else if (e.kind === 'noteOff') {
      if (eng && (e.source === 'virtual' || (e.source === 'midi' && s.monitorMidi))) eng.piano.noteOff(e.midi, Math.max(eng.now(), e.time));
      if (e.source !== 'mic') liveKeys.release(e.midi);
    }
  }
}

export const runtime = new Runtime();

// Exposed for end-to-end tests and the dev console.
(globalThis as unknown as { __openkeys: unknown }).__openkeys = { runtime, useApp };
