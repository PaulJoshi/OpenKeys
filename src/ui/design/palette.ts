/**
 * Design-system colours as literal values, for canvas and SVG drawing where CSS variables don't
 * resolve (2D canvas, OSMD fills). Mirrors docs/design-system/tokens/colors.css; keep in sync.
 */
export const OK = {
  ink: '#111111',
  white: '#ffffff',
  softCloud: '#f5f5f5',
  charcoal: '#39393b',
  ash: '#4b4b4d',
  mute: '#707072',
  stone: '#9e9ea0',
  hairline: '#cacacb',
  hairlineSoft: '#e5e5e5',
  red: '#d30005',
  green: '#007d48',
  greenBright: '#1eaa52',
  blue: '#1151ff',
  purpleSoft: '#beaffd',
} as const;

/** Surfaces and marks for the piano-roll style canvases, in light and inverted (dark) themes. */
export function canvasColors(dark: boolean) {
  return {
    bg: dark ? OK.ink : OK.white,
    lane: dark ? OK.charcoal : OK.softCloud,
    line: dark ? OK.ash : OK.hairlineSoft,
    text: dark ? OK.stone : OK.mute,
    head: dark ? OK.white : OK.ink,
    /** Right hand = "play this" blue; left hand = soft purple accent. */
    R: OK.blue,
    L: OK.purpleSoft,
  };
}
