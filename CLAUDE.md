# OpenKeys

Browser piano teacher (Vite + TypeScript + React). See `CONTRIBUTING.md` for setup, checks and code rules.

## Design system (mandatory for all UI)

Every screen, component, canvas and asset must follow the **OpenKeys Design System** in
`docs/design-system/` (start with `docs/design-system/readme.md`; foundations in `guidelines/`, component
specs in `components/*/*.prompt.md`). It stays the rule until the project replaces it.

- Tokens: use the CSS variables from `src/ui/design/tokens.css` (a copy of `docs/design-system/tokens`), via
  `src/ui/styles.css`. Canvas/SVG code uses `src/ui/design/palette.ts`. No raw hex anywhere else.
- Colour: ink `#111111`, white, soft cloud `#f5f5f5` carry the surface. Colour only signals on the piano:
  blue = play this key, green = correct, red = wrong. Left hand uses the soft purple accent.
- Type: Inter 400/500 only (no bold); Bebas Neue uppercase display for hero moments only. Sentence case.
- Shape: controls are pills (`--radius-button` 30px, inputs 24px, icon buttons round); cards, tiles, keys
  and dialogs are square. No shadows, no gradients, no hover tints. Press = the "tap collapse".
- One ink (primary) pill per view; secondary is soft cloud (white on a soft-cloud card).
- Icons: Lucide via `src/ui/components/Icon.tsx`, currentColor, never filled. No emoji, no unicode icons
  (only "·" and "/").
- Copy: plain, short, verb-first buttons, numerals, no exclamation marks or hype.
- Dark theme is the system inverted using only its neutrals (the system itself is light-only).
