import * as Tone from 'tone';
import type { ClickSink } from './sink';

/** Short, pitched click: accented downbeat, normal beat, quieter subdivision. */
export class Metronome implements ClickSink {
  readonly output: Tone.Gain;
  private readonly synth: Tone.Synth;
  private readonly subSynth: Tone.Synth;
  /** Visual-only metronome: the pulse still fires, the click is silent. */
  visualOnly = false;

  constructor() {
    this.output = new Tone.Gain(0.6);
    this.synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.0005, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -12,
    }).connect(this.output);
    this.subSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.0005, decay: 0.02, sustain: 0, release: 0.01 },
      volume: -20,
    }).connect(this.output);
  }

  set volume(v: number) {
    this.output.gain.value = v;
  }

  click(time: number, accent: boolean, sub: boolean): void {
    if (this.visualOnly) return;
    if (sub) this.subSynth.triggerAttackRelease(1200, 0.02, time, 0.6);
    else this.synth.triggerAttackRelease(accent ? 1760 : 1100, 0.03, time, accent ? 1 : 0.7);
  }
}
