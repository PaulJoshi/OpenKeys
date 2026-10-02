# Contributing to OpenKeys

Thanks for helping! OpenKeys is a static, client-only TypeScript app.

## Setup

```sh
npm install
npm run dev
```

Node 20+ is recommended. `npm install` copies the piano samples and the Basic Pitch model into `public/`
(they come from npm packages, not from this repository).

## Before you open a pull request

```sh
npm run typecheck   # strict TypeScript, no `any` in src/core
npm test            # unit tests + quick accuracy guards
npm run e2e         # needs Playwright's Chromium (set CHROMIUM_PATH to use a preinstalled one)
```

If you touch microphone detection (`src/core/input/mic`), also run `npm run accuracy` (needs `ffmpeg`) and
include the before/after numbers from `docs/ACCURACY.md` in the PR. Detection changes are judged by data,
not by feel; the most important number is the **false-wrong rate**.

## Code layout and rules

- `src/core` is plain TypeScript: **no React, no DOM rendering**, so it can be tested with recorded event streams.
  Browser APIs (Web Audio, Web MIDI, getUserMedia) are confined to the input plugins and the audio engine.
- One clock: `AudioContext.currentTime`. Every event carries a latency-corrected timestamp on it.
- Score time is in **beats**; convert to seconds only through `TempoMap`.
- Real-time audio analysis runs in the AudioWorklet (`src/worklets`). Never use `ScriptProcessorNode`.
- New dependencies must be open source with a licence compatible with MIT; add them to `CREDITS.md`.
- Record design decisions in `docs/DECISIONS.md`.

## Adding a built-in song

Only public-domain compositions, arranged by you (or by the project) and contributed under CC0. Add the ABC to
`src/core/content/songs.ts`; `tests/score/songs.test.ts` checks that it parses, both hands line up and the
range fits a 61-key keyboard. Never add files downloaded from score-sharing sites.

## Adding real-instrument test data

Record labelled takes in the dev panel (`?debug` → Takes, microphone + USB MIDI at the same time) and add the
downloaded WAV + JSON to `tests/fixtures/takes/` with a short note about the instrument, microphone and room.
