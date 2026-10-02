import { useEffect, useState } from 'react';
import { getDb, type TakeRecord } from '../../core/progress/db';
import { takeRecorder, encodeWav, type TakeMeta } from './recorder';
import { runtime } from '../runtime';
import { analyzeOffline } from '../../core/input/mic/offline';
import { evaluate, type TranscriptionMetrics } from '../../core/input/mic/evaluate';
import { useApp } from '../store';
import { downloadText } from '../importer';
import { Icon } from '../components/Icon';

/** Record takes (mic audio + MIDI ground truth), list them, evaluate the detector on them. */
export function TakesTab() {
  const [recording, setRecording] = useState(takeRecorder.recording);
  const [takes, setTakes] = useState<TakeRecord[]>([]);
  const [metrics, setMetrics] = useState<Record<number, TranscriptionMetrics | string>>({});
  const detector = useApp((s) => s.settings.detector);
  const refresh = () => void getDb().takes.orderBy('createdAt').reverse().limit(20).toArray().then(setTakes);
  useEffect(refresh, []);
  useEffect(() => takeRecorder.changed.on(setRecording), []);
  const bothConnected = runtime.mic?.status === 'running' && !!runtime.midi?.current;

  const evaluateTake = async (t: TakeRecord) => {
    const meta = t.meta as TakeMeta;
    if (!t.audio || !t.id) return;
    const audio = new Float32Array(await t.audio.arrayBuffer());
    const truth = meta.midiTruth.filter((e) => e.kind === 'noteOn').map((e) => ({ midi: e.midi, start: e.time }));
    if (!truth.length) {
      setMetrics((m) => ({ ...m, [t.id!]: 'No MIDI ground truth in this take.' }));
      return;
    }
    const { events } = analyzeOffline(audio, t.sampleRate, meta.audioStartTime, {
      yinThreshold: detector.yinThreshold,
      pitchAlgorithm: detector.pitchAlgorithm,
      onsetDelta: detector.onsetDelta,
      onsetMultiplier: detector.onsetMultiplier,
    }, { ...runtime.mic?.tracker.opts, latency: meta.micLatency, clickNear: undefined, appSounding: undefined });
    // MIDI truth times are on the output-mapped clock; mic events are latency-corrected: comparable.
    setMetrics((m) => ({ ...m, [t.id!]: evaluate(truth, events, 0.05) }));
  };

  return (
    <div className="col" style={{ marginTop: 8 }}>
      <p className="small muted" style={{ margin: 0 }}>
        Records the raw microphone audio with the detected notes{bothConnected ? ' and the MIDI keyboard as ground truth (labelled data set)' : ''}. Connect both the microphone and the USB
        MIDI cable to build a labelled test set in one click.
      </p>
      <div className="row">
        {!recording ? (
          <button className="btn primary small" onClick={() => takeRecorder.start()} disabled={!runtime.mic && !runtime.midi}>
            <Icon name="circle" size={14} /> {bothConnected ? 'Record labelled take' : 'Record take'}
          </button>
        ) : (
          <button
            className="btn small"
            onClick={async () => {
              await takeRecorder.stop();
              refresh();
            }}
          >
            <Icon name="square" size={14} /> Stop and save
          </button>
        )}
      </div>
      <table className="table small">
        <tbody>
          {takes.map((t) => {
            const meta = t.meta as TakeMeta;
            const m = t.id ? metrics[t.id] : undefined;
            return (
              <tr key={t.id}>
                <td>
                  {t.title}
                  <div className="muted">
                    {meta.detected.filter((e) => e.kind === 'noteOn').length} detected · {meta.midiTruth.filter((e) => e.kind === 'noteOn').length} MIDI · {t.audio ? `${((t.audio.size / 4 / t.sampleRate) | 0)} s audio` : 'no audio'}
                  </div>
                  {m && (typeof m === 'string' ? <div>{m}</div> : <div>F1 {m.f1.toFixed(3)} · P {m.precision.toFixed(3)} · R {m.recall.toFixed(3)} · false-wrong {(m.falseWrongRate * 100).toFixed(1)}% · onset {m.onsetErrorMedianMs.toFixed(1)}/{m.onsetErrorP95Ms.toFixed(1)} ms</div>)}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small" onClick={() => void evaluateTake(t)}>
                    Evaluate
                  </button>
                  <button
                    className="btn small"
                    onClick={async () => {
                      if (t.audio) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(encodeWav(new Float32Array(await t.audio.arrayBuffer()), t.sampleRate));
                        a.download = `take-${t.id}.wav`;
                        a.click();
                      }
                      downloadText(`take-${t.id}.json`, JSON.stringify(meta));
                    }}
                  >
                    Download
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={async () => {
                      if (t.id) await getDb().takes.delete(t.id);
                      refresh();
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
