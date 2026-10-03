# Design decisions

Where the brief was ambiguous, OpenKeys picks the option that gives the learner the **most accurate and least
frustrating feedback**. This file records those choices and why.

## Platform and audio

1. **Piano samples come from npm, copied at build time.** The Salamander Grand Piano MP3s are taken from the
   `@audio-samples/piano-mp3-velocity{4,8,12,16}` packages by `scripts/copy-samples.mjs` into `public/samples`.
   The repository stays small, the site self-hosts them, and no CDN is needed at runtime. Four of the sixteen
   velocity layers (soft → very loud), every minor third, A0–C8 (~22 MB).
2. **Samples are cached on first use, not precached.** The service worker precaches the app shell, songs and
   code; samples (and the Basic Pitch model) use a CacheFirst runtime cache. The sampler requests every sample at
   start-up, so one session with sound makes them available offline, without forcing a 22 MB install on first visit.
   The medium layer loads first; a light synth plays until it is ready.
3. **One clock.** Everything is timestamped on `AudioContext.currentTime`. MIDI and DOM events
   (`performance.now()` clock) are mapped with `AudioContext.getOutputTimestamp()`, median-filtered and re-sampled
   every second. Because `getOutputTimestamp().contextTime` is the time of the sample *currently being heard*, a
   key pressed in time with what the learner hears lands exactly on the scheduled time: output latency is
   compensated automatically for MIDI and computer keys. MIDI's default judging offset is therefore 0.
4. **Microphone latency default.** Before calibration, mic events are corrected by output latency + 12 ms
   (sound travels out, then back in). The tap-along calibration replaces this with a measured median.
5. **No `SharedArrayBuffer`.** Analysis frames leave the worklet as transferable `Float32Array`s via `postMessage`
   (batched every ~2 hops) so the app works on static hosts that can't send cross-origin-isolation headers.
6. **Own lookahead scheduler.** Practice needs loops with a tempo change at every wrap (loop-drill ramp),
   count-ins, hand muting and a log of everything the app made audible (for mic leak control), so playback uses a
   small lookahead scheduler driven by Tone.js's worker-based ticker rather than `Tone.Transport`.

## Scores

7. **Ties are merged** into one held note at import; the `tiedFromPrevious` flag remains in the type for formats
   that can't be merged. **Grace notes** are placed just *before* the beat (1/8 beat each) and judged leniently.
8. **Repeat unrolling**: voltas follow the pass number; after a D.C./D.S. jump repeats are not taken and the
   *last* ending is played; "To Coda" and "Fine" only act after the jump (the common engraving convention).
9. **One sheet renderer for every format.** Non-MusicXML scores (MIDI, ABC, JSON, generated drills) are converted
   to MusicXML for OpenSheetMusicDisplay with display-only quantisation (16th/triplet grid). Imported MusicXML is
   rendered as written, repeats included; performance-order events are mapped to cursor visits of each written
   measure (n-th occurrence → n-th visit, falling back to the last visit).
10. **Hands**: two MIDI tracks → by average pitch; one track → split at a user-adjustable point (default middle C),
    smoothed by hand continuity (a melody dipping to B3 stays in the right hand) and wide chords split at the
    largest gap. A single ABC voice in bass clef is the left hand; a treble melody above E3 is the right hand.
11. **Out-of-range notes warn, never fail**: the import summary offers "move the piece by octaves" (when the span
    fits) or "fold the out-of-range notes".

## Judging

12. **Wait mode is first-try graded.** A note struck with no wrong note before it at that event is *perfect*;
    otherwise it is *wrong* (recording the first wrong pitch, for coaching). Wrong notes never advance. A chord is
    complete when all notes were struck within the chord window (default 120 ms) **or are still held**, so
    beginners can find chord notes one at a time.
13. **Play-along judging is two-pass.** Live feedback uses greedy nearest-in-time matching; the final verdicts
    re-solve the whole take with a per-pitch dynamic-programming alignment (optimal, each expected note matched once),
    then pair leftovers as *wrong pitch* (nearest in time). Extra notes count half a note against accuracy, so a
    stray touch doesn't dominate the score.
14. **Timing windows** (Relaxed/Standard/Strict as specified) widen in proportion at practice tempos below 100 %
    but never narrow above it; +20 ms in mic mode; extra tolerance for grace notes and arpeggiated chords. The
    match window is twice the OK window: inside it a right pitch is *early/late*, outside it *missed*.
15. **Notes the learner never reached are not judged** when a take is stopped early.
16. **Dynamics are relative.** Each note's played level relative to the learner's own median is compared with the
    written level relative to the piece's median, with the learner's spread rescaled to the written spread. A piece
    with a single marking throughout (e.g. only *mf*) isn't judged for dynamics, and neither is the computer
    keyboard (no touch sensitivity). Hairpins must actually rise or fall.
17. **Stars**: 3 = notes ≥ 95 % and timing ≥ 75 %; 2 = notes ≥ 85 %; 1 = notes ≥ 60 %. A lesson is done at 2 stars.
18. **Follow-me** uses a small HMM-like search over score positions (stay / advance / skip 1–2 / jump back),
    checking a restart *first* (three matching notes in the last measures are stronger evidence than one skipped
    note) and judging timing against an exponentially smoothed local tempo with relaxed windows, so rubato is fine.
19. **Loop-drill tempo ramp**: start at 60 % (or lower if the target is lower), +5 % after a clean pass (≥ 95 %, no
    misses), −5 % after two failed passes, stop at the target. The pass is evaluated ~0.2 s before the wrap (the
    scheduler must know the next tempo ahead of time), so a note in the last 0.2 s of a pass can't change the ramp.

## Microphone

20. **Honesty first.** Every mic verdict carries a confidence; below the threshold the verdict is "?" and never
    counts against the learner. If a wrong-note candidate pairs with an expected note that had *some* evidence,
    the verdict becomes "?" rather than "wrong". Wrong-note candidates in chords require a fresh attack, a strong
    fundamental and at least two strong partials that no expected note explains. The judge prefers missing a
    mistake to marking a correct note wrong.
21. **Onsets** combine log spectral flux with two level terms (21 ms level rise, and a short-term hop transient)
    because piano bass re-strikes barely change the flux. Peak picking is two-tier: weak onsets only count when the
    pitch differs from the sounding note. The onset *time* comes from the RMS dip just before the rise (no window
    taper delay), giving ~3 ms median timing error on the test set.
22. **Noise floor** uses minimum statistics over ~6 s, so it doesn't creep up while music plays continuously; the
    calibrated floor caps it.
23. **Pitch**: YIN with an FFT difference function; when no dip passes the threshold, the *first* local minimum near
    the global minimum is chosen (the global minimum alone causes octave and twelfth errors in the treble). The
    sub-octave is preferred only with a clear improvement; otherwise "octave uncertain" lowers confidence.
    Hysteresis is small (12 cents beyond the semitone midpoint): it stops flicker without overriding a fresh onset.
24. **Score-informed detection** asks "are the expected notes sounding, freshly struck?": inharmonic templates
    (B scaled by register), partials must be real spectral peaks within ~50 dB of the strongest, freshness is a
    ≥ 2 dB rise of the note's own partials, octave traps use the odd partials of the lower octave (not in the bass,
    and never for octave doublings), and a stronger fresh neighbour 1–2 semitones away suppresses the expected note.
    For a single expected note, a confident monophonic pitch confirms it; the mono tracker never decides a wrong
    note on its own (a ringing left hand can fool it). Expected notes with no detected onset are checked at their
    expected time (soft notes in reverberant rooms).
25. **The app's own sound**: in mic mode the app's accompaniment is muted by default (Listen mode still plays).
    If the learner enables speaker playback, the pitches the app is sounding are excluded from wrong-note
    detection; metronome clicks are gated out of onset detection in a −15/+60 ms window.
26. **Basic Pitch is offline only** (free play "transcribe", lazy-loaded). Real-time judging never uses it.

## Inputs and UI

27. **Only the selected input is judged.** Other running inputs are still recorded, which is what makes "MIDI as
    ground truth for the mic" recording possible.
28. **Computer keys play notes only when the virtual input is selected** (clicking the on-screen piano always
    works). In that mode letter shortcuts (L, H) need **Shift** because A–' are piano keys; Space, arrows and +/−
    never clash.
29. **Rhythm drills accept any key** and judge only timing.
30. **Note names fade** with per-bar mastery in *auto* mode (fully hidden at 70 % piece mastery). Mastery is an
    exponential moving average per bar, scaled by tempo (practising at 50 % counts less).
31. **Adaptive sight-reading**: the level goes up after ≥ 90 % notes and ≥ 60 % timing, down below 60 %.
32. **Difficulty (1–10)** is a weighted sum of notes per second, range, largest leap, chord density, accidentals,
    rhythmic variety, two-handedness and hand independence; weights are tuned on the bundled songs.
33. **Accuracy is reported, not promised.** `docs/ACCURACY.md` is generated from real Salamander recordings and a
    simulated laptop-mic chain; real CT-S1 numbers will be added from labelled takes.
34. **The OpenKeys Design System is the visual source of truth** (`docs/design-system/`, rules summarised in
    `CLAUDE.md`). The app keeps its own CSS classes but every value comes from the system's tokens. Two
    extensions the system doesn't cover: a dark theme built by inverting its neutrals (ink canvas, charcoal
    stage, white text), and the left hand drawn in the soft purple accent so it stays distinct from the
    blue "play this" right hand and the green/red verdict colours.
35. **Practice gives the score the height.** With a piece open, the toolbar is one line of button groups
    (mode, hands, tempo + metronome, view) and the top nav slides away. It comes back when the mouse reaches the
    top edge, on a swipe down from the top, from the toolbar's menu button on touch screens, or on keyboard
    focus. Below 1000 px wide the toolbar wraps to two short lines rather than hiding controls off-screen.
36. **Note names on the sheet are hand-coloured pills** (blue right hand, soft purple left hand, as on the
    keyboard and falling notes) in a row under each staff, so they never read as part of the black engraving
    (or its inverted dark version). Chords stack in pitch order, and the engraving reserves room for the row.
