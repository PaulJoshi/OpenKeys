# Credits

## Sound

- **Salamander Grand Piano V3** by Alexander Holm, licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  OpenKeys self-hosts a trimmed set (4 of 16 velocity layers, samples every minor third).
- MP3 conversion from the `@audio-samples/piano-mp3-velocity*` npm packages by Jan Forst (MIT).

## Libraries

| Library | Licence | Used for |
| --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) | MIT | Sampler, synths, audio context and ticker |
| [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) | BSD-3-Clause | Sheet music rendering and cursor |
| [VexFlow](https://www.vexflow.com/) (via OSMD) | MIT | Music engraving |
| [abcjs](https://www.abcjs.net/) | MIT | ABC parsing and the script editor preview |
| [@tonejs/midi](https://github.com/Tonejs/Midi) | MIT | MIDI file import/export |
| [JSZip](https://stuk.github.io/jszip/) | MIT (dual MIT/GPLv3, used under MIT) | Compressed MusicXML (.mxl) |
| [Dexie](https://dexie.org/) | Apache-2.0 | IndexedDB storage |
| [React](https://react.dev/) | MIT | User interface |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | UI state |
| [Workbox](https://developer.chrome.com/docs/workbox) via vite-plugin-pwa | MIT | Offline support |
| [Basic Pitch](https://github.com/spotify/basic-pitch-ts) (Spotify) | Apache-2.0 | Offline polyphonic transcription (model included) |
| [TensorFlow.js](https://www.tensorflow.org/js) | Apache-2.0 | Runs Basic Pitch locally |
| [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [TypeScript](https://www.typescriptlang.org/) | MIT / Apache-2.0 | Build and tests |

## Design

- [Inter](https://rsms.me/inter/) by Rasmus Andersson and [Bebas Neue](https://github.com/dharmatype/Bebas-Neue) by
  Dharma Type, both SIL Open Font License 1.1, self-hosted in `src/ui/design/fonts`.
- Icons from [Lucide](https://lucide.dev) (ISC).

## Algorithms

- YIN: A. de Cheveigné and H. Kawahara, *YIN, a fundamental frequency estimator for speech and music*, JASA 2002.
- MPM: P. McLeod and G. Wyvill, *A smarter way to find pitch*, ICMC 2005; implementation approach follows the
  [pitchy](https://github.com/ianprime0509/pitchy) library (MIT).
- Onset detection: log-compressed spectral flux with a max-filtered reference (S. Böck and G. Widmer, *Maximum
  filter vibrato suppression for onset detection*, DAFx 2013).
- Piano inharmonicity: H. Fletcher, *Normal vibration frequencies of a stiff piano string*, JASA 1964.
- Scheduling: SM-2 (P. Woźniak) for review items.

## Music

The built-in songs are public-domain compositions (Beethoven, Bach, Petzold, Satie, Pachelbel, Pierpont and
traditional melodies) **arranged by the OpenKeys project** and released under CC0, with these exceptions:

- **Für Elise, full version** (`src/core/content/scores/fur-elise-full.musicxml`): fingered arrangement by
  Verona ([pianolessenassen.nl/bladmuziek](https://pianolessenassen.nl/bladmuziek)), published on
  [MuseScore](https://musescore.com/user/2423821/scores/6647035). Added by the maintainer as free to use; the file
  is bundled unchanged and is not covered by the CC0 dedication above.
- **Gymnopédie No. 1, full version** (`src/core/content/scores/gymnopedie-1-full.musicxml`): notes, dynamics,
  hairpins and slurs from the [Mutopia Project](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37) edition
  typeset by Evin Robertson from the original (Mutopia-2014/12/14-37), placed in the public domain. OpenKeys wrote
  it out in full as in Satie's original, moved the left-hand chords to the bass staff, and added fingering,
  pedalling and a starting dynamic for the left hand; those additions are CC0.
