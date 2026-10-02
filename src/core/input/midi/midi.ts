import type { NoteEvent } from '../../types';
import type { InputPlugin, InputStatus } from '../types';
import type { AudioClock } from '../../clock';
import type { NoteSink } from '../../playback/sink';
import { Emitter } from '../../emitter';
import { parseMidiMessage, type MidiMessage } from './parse';

export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export interface MidiMonitorEntry {
  bytes: number[];
  perfMs: number;
  audioTime: number;
  parsed: MidiMessage | null;
  device: string;
}

/** Web MIDI is missing on Safari/iOS (and some privacy modes). */
export function webMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as Navigator & { requestMIDIAccess?: unknown }).requestMIDIAccess === 'function';
}

/**
 * MIDI keyboard input over Web MIDI: exact notes, timing, velocity and pedal. Timestamps are
 * mapped from the performance.now() clock to the AudioContext clock (never "time received").
 */
export class MidiInput implements InputPlugin {
  readonly source = 'midi' as const;
  status: InputStatus = 'idle';
  statusMessage?: string;
  access: MIDIAccess | null = null;
  readonly ports = new Emitter<{ inputs: MidiPortInfo[]; outputs: MidiPortInfo[] }>();
  readonly hotplug = new Emitter<{ name: string; connected: boolean; isInput: boolean }>();
  readonly monitor = new Emitter<MidiMonitorEntry>();
  readonly deviceChanged = new Emitter<string | null>();
  /** Preferred input name (remembered); null = first available. */
  wanted: string | null = null;
  /** 0 = all channels */
  channel = 0;
  /** Per-user velocity curve from dynamics calibration. */
  curve: (v: number) => number = (v) => v;
  /** Judging offset from calibration (s), usually ~0 for MIDI. */
  latency = 0;
  current: MIDIInput | null = null;
  lastRaw = new Map<number, number>();
  private readonly ev = new Emitter<NoteEvent>();
  private readonly st = new Emitter<InputStatus>();

  constructor(private readonly clock: AudioClock) {}

  onEvent(cb: (e: NoteEvent) => void) {
    return this.ev.on(cb);
  }

  onStatus(cb: (s: InputStatus) => void) {
    return this.st.on(cb);
  }

  private setStatus(s: InputStatus, msg?: string) {
    this.status = s;
    this.statusMessage = msg;
    this.st.emit(s);
  }

  async start(): Promise<void> {
    if (!webMidiSupported()) {
      this.setStatus('unsupported', 'This browser has no Web MIDI (Safari and iOS). Use Chrome, Edge or Firefox for a MIDI keyboard, or the microphone.');
      return;
    }
    this.setStatus('starting');
    try {
      this.access = this.access ?? (await navigator.requestMIDIAccess({ sysex: false }));
    } catch (e) {
      const name = (e as DOMException).name;
      this.setStatus(name === 'SecurityError' || name === 'NotAllowedError' ? 'denied' : 'error', name === 'SecurityError' || name === 'NotAllowedError' ? 'MIDI access was blocked.' : (e as Error).message);
      return;
    }
    this.access.onstatechange = (e: Event) => {
      const port = (e as MIDIConnectionEvent).port;
      if (!port) return;
      const connected = port.state === 'connected';
      this.hotplug.emit({ name: port.name ?? 'MIDI device', connected, isInput: port.type === 'input' });
      this.emitPorts();
      if (port.type === 'input') {
        if (!connected && this.current?.id === port.id) {
          this.detach();
          this.deviceChanged.emit(null);
        } else if (connected && !this.current) this.attach();
      }
    };
    this.emitPorts();
    this.attach();
    this.setStatus('running');
  }

  inputs(): MidiPortInfo[] {
    const out: MidiPortInfo[] = [];
    this.access?.inputs.forEach((p) => out.push({ id: p.id, name: p.name ?? 'MIDI input', manufacturer: p.manufacturer ?? '', state: p.state }));
    return out;
  }

  outputs(): MidiPortInfo[] {
    const out: MidiPortInfo[] = [];
    this.access?.outputs.forEach((p) => out.push({ id: p.id, name: p.name ?? 'MIDI output', manufacturer: p.manufacturer ?? '', state: p.state }));
    return out;
  }

  private emitPorts() {
    this.ports.emit({ inputs: this.inputs(), outputs: this.outputs() });
  }

  /** Selects an input by name (remembered so it is re-selected when it comes back). */
  select(name: string | null): void {
    this.wanted = name;
    this.detach();
    this.attach();
  }

  private attach() {
    if (!this.access) return;
    let chosen: MIDIInput | null = null;
    this.access.inputs.forEach((p) => {
      if (p.state !== 'connected') return;
      if (this.wanted ? p.name === this.wanted : !chosen) chosen = p;
    });
    if (!chosen && this.wanted) return; // wait for the remembered device
    const input = chosen as MIDIInput | null;
    if (!input) return;
    this.current = input;
    input.onmidimessage = (m: MIDIMessageEvent) => this.onMessage(m, input.name ?? 'MIDI');
    this.deviceChanged.emit(input.name ?? null);
  }

  private detach() {
    if (this.current) this.current.onmidimessage = null;
    this.current = null;
  }

  private onMessage(m: MIDIMessageEvent, device: string) {
    const data = m.data;
    if (!data) return;
    // MIDIMessageEvent.timeStamp is on the performance.now() clock.
    const perf = m.timeStamp || performance.now();
    const time = this.clock.perfToAudio(perf) - this.latency;
    const parsed = parseMidiMessage(data);
    this.monitor.emit({ bytes: Array.from(data), perfMs: perf, audioTime: time, parsed, device });
    if (!parsed) return;
    if (this.channel && parsed.channel !== this.channel) return;
    if (parsed.type === 'noteOn') {
      const raw = parsed.velocity / 127;
      this.lastRaw.set(parsed.note, raw);
      this.ev.emit({ kind: 'noteOn', midi: parsed.note, time, velocity: this.curve(raw), confidence: 1, source: 'midi' });
    } else if (parsed.type === 'noteOff') {
      this.ev.emit({ kind: 'noteOff', midi: parsed.note, time, velocity: parsed.velocity / 127, confidence: 1, source: 'midi' });
    } else if (parsed.type === 'cc' && (parsed.controller === 64 || parsed.controller === 66 || parsed.controller === 67)) {
      this.ev.emit({ kind: 'pedal', midi: parsed.controller, time, velocity: parsed.value / 127, confidence: 1, source: 'midi' });
    }
  }

  stop(): void {
    this.detach();
    if (this.access) this.access.onstatechange = null;
    if (this.status === 'running') this.setStatus('idle');
  }

  output(name: string | null): MIDIOutput | null {
    let out: MIDIOutput | null = null;
    this.access?.outputs.forEach((p) => {
      if (p.state === 'connected' && (name ? p.name === name : !out)) out = p;
    });
    return out;
  }
}

/** Sends scheduled playback to the keyboard itself (it plays through its own speakers). */
export class MidiOutSink implements NoteSink {
  private active = new Set<number>();
  constructor(
    private readonly out: MIDIOutput,
    private readonly clock: AudioClock,
    private readonly channel = 1,
  ) {}

  play(midi: number, velocity: number, time: number, duration: number): void {
    const ch = (this.channel - 1) & 0x0f;
    const on = Math.max(performance.now(), this.clock.audioToPerf(time));
    const off = Math.max(on + 5, this.clock.audioToPerf(time + duration));
    this.out.send([0x90 | ch, midi, Math.max(1, Math.min(127, Math.round(velocity * 127)))], on);
    this.out.send([0x80 | ch, midi, 64], off);
    this.active.add(midi);
  }

  stopAll(): void {
    const ch = (this.channel - 1) & 0x0f;
    // Cancel scheduled messages where supported, then silence.
    (this.out as MIDIOutput & { clear?: () => void }).clear?.();
    for (const m of this.active) this.out.send([0x80 | ch, m, 0]);
    this.out.send([0xb0 | ch, 123, 0]); // all notes off
    this.active.clear();
  }
}
