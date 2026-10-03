import type { InputSource } from './types';
import type { KeyboardRange } from './score/validate';
import { DEFAULT_DETECTOR_PARAMS, type DetectorParams } from './input/mic/params';

export type TimingPreset = 'relaxed' | 'standard' | 'strict';
export type MicPreset = 'laptop' | 'phone' | 'usb' | 'line';
export type ViewMode = 'sheet' | 'falling' | 'both';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  inputSource: InputSource;
  micDeviceId: string | null;
  micPreset: MicPreset;
  midiInputName: string | null;
  midiOutputName: string | null;
  /** 0 = all channels, else 1-16 */
  midiChannel: number;
  /** Send app playback to the keyboard over MIDI out. */
  midiOutPlayback: boolean;
  /** Sound the app piano for MIDI input (off by default: the keyboard has its own speakers). */
  monitorMidi: boolean;
  range: KeyboardRange;
  /** Mic mode: octave offset if the keyboard's octave shift is on. */
  octaveOffset: number;
  timingPreset: TimingPreset;
  theme: Theme;
  view: ViewMode;
  showFingering: boolean;
  /** 'auto' fades note names out as mastery grows. */
  noteNames: 'off' | 'on' | 'auto';
  lookAheadSec: number;
  metronome: boolean;
  metronomeVolume: number;
  metronomeVisualOnly: boolean;
  subdivision: number;
  countInBars: number;
  volume: number;
  /** In practice, the app plays the hand the learner is not practising. */
  accompaniment: boolean;
  /** In mic mode, allow app audio through the speakers anyway (default muted). */
  micAllowSpeakerPlayback: boolean;
  errorSound: boolean;
  /** Listen mode: the on-screen keys go down and up with the notes the app plays. */
  listenKeyAnimation: boolean;
  /** Listen mode: animated keys take their hand's colour (blue right, purple left). */
  listenHandColours: boolean;
  splitPoint: number;
  detector: DetectorParams;
  debug: boolean;
  dailyGoalMin: number;
  chordWindowMs: number;
  /** Map a spare low key (MIDI mode) as a "restart loop" trigger; null = off. */
  restartKey: number | null;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  inputSource: 'virtual',
  micDeviceId: null,
  micPreset: 'laptop',
  midiInputName: null,
  midiOutputName: null,
  midiChannel: 0,
  midiOutPlayback: false,
  monitorMidi: false,
  range: { low: 36, high: 96 },
  octaveOffset: 0,
  timingPreset: 'standard',
  theme: 'system',
  view: 'both',
  showFingering: true,
  noteNames: 'auto',
  lookAheadSec: 3,
  metronome: true,
  metronomeVolume: 0.6,
  metronomeVisualOnly: false,
  subdivision: 1,
  countInBars: 1,
  volume: 0.9,
  accompaniment: true,
  micAllowSpeakerPlayback: false,
  errorSound: false,
  listenKeyAnimation: true,
  listenHandColours: true,
  splitPoint: 60,
  detector: DEFAULT_DETECTOR_PARAMS,
  debug: false,
  dailyGoalMin: 15,
  chordWindowMs: 120,
  restartKey: null,
  onboarded: false,
};

/** Merges stored settings over defaults (new fields get defaults after upgrades). */
export function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  s.detector = { ...DEFAULT_DETECTOR_PARAMS, ...(stored?.detector ?? {}) };
  s.range = { ...DEFAULT_SETTINGS.range, ...(stored?.range ?? {}) };
  return s;
}
