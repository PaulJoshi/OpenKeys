import { useState } from 'react';
import { runtime } from '../runtime';
import { computeNoiseFloor } from '../../core/calibration/compute';
import { midiToName } from '../../core/music';
import { useApp } from '../store';
import { Result } from './CalibrationWizard';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 10-second quick check, offered when the device changed, the room got noisier or many notes
 * were unclear: 3 s of silence, then middle C three times.
 */
export function QuickCheck({ onClose }: { onClose: () => void }) {
  const set = useApp((s) => s.set);
  const [phase, setPhase] = useState<'idle' | 'quiet' | 'play' | 'done'>('idle');
  const [advice, setAdvice] = useState<{ kind: 'good' | 'warn'; text: string }[]>([]);

  const run = async () => {
    const mic = runtime.mic ?? (await runtime.startMic());
    if (!mic || mic.status !== 'running') return;
    const out: { kind: 'good' | 'warn'; text: string }[] = [];
    setPhase('quiet');
    const levels: number[] = [];
    const off = mic.frames.on((f) => levels.push(f.levelDb));
    await sleep(3000);
    off();
    const noise = computeNoiseFloor(levels);
    const stored = runtime.calibration.noiseFloorDb;
    if (noise.tooNoisy) out.push({ kind: 'warn', text: `The room is noisy (${Math.round(noise.floorDb)} dB). Close windows, turn off fans, or move the microphone closer to the keyboard.` });
    else if (stored !== undefined && noise.floorDb > stored + 8) out.push({ kind: 'warn', text: `The room is ${Math.round(noise.floorDb - stored)} dB noisier than when you calibrated.` });
    else out.push({ kind: 'good', text: 'Background noise is fine.' });
    setPhase('play');
    const notes: { midi: number; conf: number; snr: number }[] = [];
    const offN = runtime.bus.events.on((e) => {
      if (e.kind === 'noteOn' && e.source === 'mic') notes.push({ midi: e.midi, conf: e.confidence, snr: mic.tracker.lastOnsetSnrDb });
    });
    const t0 = performance.now();
    while (performance.now() - t0 < 7000 && notes.length < 3) await sleep(100);
    offN();
    if (notes.length === 0) out.push({ kind: 'warn', text: "I didn't hear middle C. Is the keyboard's volume up, and is the right microphone selected?" });
    else {
      const right = notes.filter((n) => n.midi === 60).length;
      const conf = notes.reduce((s, n) => s + n.conf, 0) / notes.length;
      const snr = notes.reduce((s, n) => s + n.snr, 0) / notes.length;
      if (right < notes.length) out.push({ kind: 'warn', text: `Middle C was heard as ${notes.map((n) => midiToName(n.midi)).join(', ')}. Check the keyboard's transpose and octave shift, then re-run tuning and range in the setup.` });
      if (snr < 20) out.push({ kind: 'warn', text: 'Your notes are quite quiet for the microphone: turn the keyboard up or move the device closer to its speakers.' });
      if (conf < 0.6) out.push({ kind: 'warn', text: 'Notes sound unclear. A line cable from the headphone output gives the most reliable results.' });
      if (right === notes.length && snr >= 20 && conf >= 0.6) out.push({ kind: 'good', text: 'Middle C came through loud and clear.' });
    }
    setAdvice(out);
    setPhase('done');
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Quick check">
      <div className="modal">
        <h2>Quick check</h2>
        {phase === 'idle' && <p>Ten seconds: stay quiet for three seconds, then play middle C three times.</p>}
        {phase === 'quiet' && <p className="big-number">Shh…</p>}
        {phase === 'play' && <p className="big-number">Play middle C ×3</p>}
        {advice.map((a, i) => (
          <Result key={i} kind={a.kind}>
            {a.text}
          </Result>
        ))}
        <div className="row" style={{ marginTop: 16 }}>
          {phase === 'idle' && (
            <button className="btn primary big" onClick={() => void run()}>
              Start
            </button>
          )}
          {phase === 'done' && advice.some((a) => a.kind === 'warn') && (
            <button
              className="btn"
              onClick={() => {
                onClose();
                set({ calibrationOpen: true });
              }}
            >
              Open full setup
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
