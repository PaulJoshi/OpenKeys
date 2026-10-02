import type { AudioClock } from '../core/clock';
import { InputBus } from '../core/input/bus';
import { VirtualInput } from '../core/input/virtual/virtual';
import type { InputPlugin } from '../core/input/types';
import { ensureEngine, getEngine, type AudioEngine } from '../core/playback/engine';
import type { InputSource, NoteEvent } from '../core/types';
import { midiToName } from '../core/music';
import { liveKeys, meter } from './live';
import { useApp, getSettings } from './store';
import { MicInput } from '../core/input/mic/mic';
import type { AnalysisFrame } from '../core/input/mic/frames';
import type { CalibrationData } from '../core/calibration/types';
import { profileKey } from '../core/calibration/types';
import { loadCalibration } from '../core/calibration/store';
import { midiToName as nameOf } from '../core/music';
import { Emitter } from '../core/emitter';
import { MidiInput, MidiOutSink, webMidiSupported } from '../core/input/midi/midi';
import { velocityCurve } from '../core/calibration/compute';

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
  /** Every event from every running input, before source selection (take recording). */
  readonly allEvents = new Emitter<NoteEvent>();
  readonly clock = proxyClock;
  readonly virtual = new VirtualInput(proxyClock);
  private plugins = new Map<InputSource, InputPlugin>();
  private unsubs = new Map<InputSource, () => void>();
  /** Set by the practice session to intercept judged feedback for key colours. */
  judgeHighlights = false;
  mic: MicInput | null = null;
  midi: MidiInput | null = null;
  readonly midiStatus = new Emitter<string>();
  calibration: CalibrationData = {};
  readonly micStatus = new Emitter<string>();
  readonly calibrationChanged = new Emitter<CalibrationData>();
  private meterThrottle = 0;

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
      p.onEvent((e) => {
        this.allEvents.emit(e);
        // Only the selected input (plus the always-available virtual keys/clicks) is judged;
        // other running inputs are recorded (e.g. MIDI as ground truth for mic takes).
        if (e.source === 'virtual' || e.source === getSettings().inputSource) this.bus.push(e);
      }),
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

  /** Profile key for the current input device (calibration is stored per profile). */
  get profile(): string {
    const s = getSettings();
    if (s.inputSource === 'mic') return profileKey('mic', this.mic?.warnings?.label || s.micDeviceId || null);
    if (s.inputSource === 'midi') return profileKey('midi', s.midiInputName);
    return profileKey('virtual', null);
  }

  async reloadCalibration(): Promise<void> {
    this.calibration = await loadCalibration(this.profile);
    this.applyCalibration();
    this.calibrationChanged.emit(this.calibration);
  }

  /** Pushes calibration + settings into the mic tracker/analyzer. */
  applyCalibration(): void {
    const s = getSettings();
    const c = this.calibration;
    const eng = getEngine();
    if (this.midi) {
      this.midi.curve = velocityCurve(c.dynamics);
      this.midi.latency = c.latencySec ?? 0;
      this.midi.channel = s.midiChannel;
    }
    this.applyMidiOut();
    if (this.mic) {
      const defaultLatency = eng ? eng.outputLatency + 0.012 : 0.03;
      this.mic.setTracker({
        a4: 440 * Math.pow(2, (c.tuningCents ?? 0) / 1200),
        octaveOffset: s.octaveOffset + (c.octaveOffset ?? 0),
        latency: c.latencySec ?? defaultLatency,
        medianFrames: s.detector.medianFrames,
        hysteresisCents: s.detector.hysteresisCents,
        pitchWaitMax: s.detector.pitchWaitMax,
        range: s.range,
        dynamics: c.dynamics ? { softSnrDb: c.dynamics.soft, loudSnrDb: c.dynamics.loud } : { softSnrDb: 18, loudSnrDb: 45 },
        clickNear: (t) => getEngine()?.log.clickNear(t) ?? false,
        appSounding: (t) => getEngine()?.log.soundingAt(t) ?? [],
      });
      this.mic.tune({
        yinThreshold: s.detector.yinThreshold,
        pitchAlgorithm: s.detector.pitchAlgorithm,
        mpmK: s.detector.mpmK,
        onsetDelta: s.detector.onsetDelta,
        onsetMultiplier: s.detector.onsetMultiplier,
        onsetMedianFrames: s.detector.onsetMedianFrames,
        onsetMinGap: s.detector.onsetMinGap,
        calibratedFloorDb: c.noiseFloorDb ?? null,
        pitchFrame: s.range.low < 31 ? 4096 : 2048,
      });
    }
  }

  /** Starts the microphone (after the permission explanation, from a user gesture). */
  async startMic(): Promise<MicInput | null> {
    const eng = await this.ensureAudio();
    const s = getSettings();
    this.mic?.stop();
    const mic = new MicInput(eng.ctx, {
      deviceId: s.micDeviceId,
      analyzer: { spectrumEvery: 2, pitchFrame: s.range.low < 31 ? 4096 : 2048 },
      tracker: {},
    });
    this.mic = mic;
    this.register(mic);
    mic.onStatus((st) => this.micStatus.emit(st));
    mic.frames.on((f) => this.onMicFrame(f));
    await mic.start();
    this.micStatus.emit(mic.status);
    if (mic.status === 'running') await this.reloadCalibration();
    return mic;
  }

  /** Raw (pre-curve) MIDI velocity of a noteOn, for dynamics calibration. */
  rawVelocity(e: NoteEvent): number {
    if (e.source === 'midi') return this.midi?.lastRaw.get(e.midi) ?? e.velocity ?? 0.5;
    return e.velocity ?? 0.5;
  }

  /** Requests Web MIDI access (after the explanation, from a user gesture). */
  async startMidi(): Promise<MidiInput | null> {
    if (!webMidiSupported()) {
      this.midiStatus.emit('unsupported');
      return null;
    }
    await this.ensureAudio();
    if (!this.midi) {
      const midi = new MidiInput(this.clock);
      this.midi = midi;
      this.register(midi);
      midi.onStatus((st) => this.midiStatus.emit(st));
      midi.hotplug.on(({ name, connected, isInput }) => {
        if (!isInput) return;
        useApp.getState().toast(connected ? `${name} connected` : `${name} disconnected; plug it back in to continue`, connected ? 'good' : 'warn');
      });
      midi.deviceChanged.on((name) => {
        meter.set({ ...meter.value, source: 'midi', deviceName: name, active: !!name });
        if (name && name !== getSettings().midiInputName) useApp.getState().updateSettings({ midiInputName: name });
        void this.reloadCalibration();
      });
    }
    this.midi.wanted = getSettings().midiInputName;
    await this.midi.start();
    this.midiStatus.emit(this.midi.status);
    await this.reloadCalibration();
    return this.midi;
  }

  /** Routes scheduled playback to the keyboard over MIDI out when enabled. */
  applyMidiOut(): void {
    const eng = getEngine();
    if (!eng) return;
    const s = getSettings();
    const out = s.midiOutPlayback && this.midi ? this.midi.output(s.midiOutputName) : null;
    eng.setRoute(out ? new MidiOutSink(out, this.clock) : null, false);
  }

  stopMic(): void {
    this.mic?.stop();
    this.micStatus.emit('idle');
  }

  private onMicFrame(f: AnalysisFrame): void {
    const now = performance.now();
    if (now - this.meterThrottle < 33) return;
    this.meterThrottle = now;
    const live = this.mic?.tracker.live;
    const has = !!live && live.midi > 0;
    const octave = (getSettings().octaveOffset + (this.calibration.octaveOffset ?? 0)) * 12;
    meter.set({
      ...meter.value,
      source: 'mic',
      levelDb: f.levelDb,
      floorDb: f.floorDb,
      noteName: has ? nameOf(Math.round(live.midi) - octave) : null,
      cents: has ? live.cents : null,
      confidence: has ? live.clarity : 0,
      active: true,
    });
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

// Re-apply calibration/detector settings whenever settings change.
useApp.subscribe((st, prev) => {
  if (st.settings !== prev.settings) runtime.applyCalibration();
});
