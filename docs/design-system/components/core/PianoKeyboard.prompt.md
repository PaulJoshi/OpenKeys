Interactive on-screen piano keyboard; use in lessons, practice screens and anywhere notes need to be shown or played.

```jsx
<PianoKeyboard startOctave={4} octaves={2} keyStates={{ E4: 'target', C4: 'correct', D4: 'wrong' }} onKeyPress={n => console.log(n)} />
```

- `keyStates`: `target` (blue — play this next), `correct` (green), `wrong` (red), `pressed`.
- `showLabels`: `'c'` (default, "C4" etc.), `'all'`, `'none'`.
- Square corners, no shadows — keys sit on an ink bed with 1px gaps.
