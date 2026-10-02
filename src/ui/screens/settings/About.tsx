import { Section } from '../Settings';

export function About() {
  return (
    <div className="col" style={{ gap: 20 }}>
      <Section title="About OpenKeys">
        <p style={{ margin: 0 }}>
          OpenKeys is a free, open-source piano teacher (MIT licence). It runs entirely in your browser: no account, and no audio ever leaves your device.
        </p>
      </Section>
      <Section title="Credits">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            Piano sound: <b>Salamander Grand Piano</b> by Alexander Holm, licensed CC-BY 3.0 (MP3 conversion from the <code>@audio-samples</code> packages by Jan Forst, MIT).
          </li>
          <li>Tone.js (MIT), OpenSheetMusicDisplay (BSD-3-Clause) with VexFlow (MIT), abcjs (MIT), @tonejs/midi (MIT), JSZip (MIT), Dexie (Apache-2.0), React (MIT), Zustand (MIT), Workbox (MIT).</li>
          <li>Offline transcription: Basic Pitch by Spotify (Apache-2.0) on TensorFlow.js (Apache-2.0), running entirely on this device.</li>
          <li>Pitch detection: YIN (de Cheveigné & Kawahara, 2002) and MPM (McLeod & Wyvill, 2005), implemented from the papers; MPM follows the approach of the pitchy library (MIT).</li>
          <li>Built-in songs are public-domain compositions arranged by the OpenKeys project (CC0).</li>
        </ul>
        <p className="small muted" style={{ margin: 0 }}>Full list in CREDITS.md.</p>
      </Section>
    </div>
  );
}
