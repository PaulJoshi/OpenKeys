# OpenKeys Design System

**OpenKeys** — learn piano: simple, effective, free and open-source.

This system dresses OpenKeys in a stark, editorial, black-and-white visual language: towering uppercase display lockups for campaign moments, quiet Inter for everything else, pill-shaped controls, flat square cards on a soft-grey "stage", and no shadows. Chromatic energy is saved for the few moments that must signal — in OpenKeys that's the piano itself: **blue = play this key, green = correct, red = wrong**.

## Sources
- `uploads/DESIGN.md` — a DESIGN.md spec named **"Brut"** (commerce design system: tokens, type scale, radii, spacing, component specs, do's/don'ts, responsive rules). It is the single source of visual truth here. No codebase, Figma, logo, imagery or product screenshots were provided.
- Where the source is internally inconsistent, we followed its prose:
  - Front matter names Futura / Helvetica Now; prose names **Bebas Neue / Inter** (Google Fonts, OFL). We ship Bebas Neue + Inter.
  - Front matter puts CTAs on `rounded.full`; prose says `rounded.lg` (30px). At 48px tall these render identically; tokens use `--radius-button: 30px`.
- Commerce concepts were mapped to OpenKeys: product-card → **SongCard**, member-benefit-card → **BenefitCard**, PLP → song library, PDP → song detail, sale red → wrong-note red, price row → duration/progress row.

## Products / surfaces
1. **Website** (`ui_kits/website/`) — marketing home + "Why free" page.
2. **Learning app** (`ui_kits/app/`) — Learn home, Songs library, Song detail, playable Lesson player.

Both are *applications* of the source patterns — no real OpenKeys UI existed to recreate.

---

## CONTENT FUNDAMENTALS
- **Voice:** plain, short, confident. Say the thing, stop. "Learn piano. For free." / "Play slowly first. Speed comes later."
- **Person:** address the learner as **you**. The project speaks as **we/OpenKeys** only in mission copy ("Our pledge"). Never "I".
- **Casing:** Sentence case for headings, buttons, nav, labels ("Start lesson", "Start with these"). UPPERCASE only inside the display face (campaign headlines) — that's the font's job, author in normal case.
- **Buttons:** verb-first, 1–2 words: Start lesson, Resume, Listen first, Play again, Next song, Explore.
- **Metadata:** dot-separated, terse: "Beethoven · Beginner · Right hand · 4 min".
- **Status:** container-less words, not icons: "Completed" (green), "3 missed notes" (red), "60% complete" (ink).
- **Mission tone:** factual about free/open: "No ads, no trials, no paywall." "MIT licensed." Avoid hype, exclamation marks and growth-speak ("unlock", "supercharge").
- **Emoji:** never. **Unicode:** only "·" separators and "/" in breadcrumbs.
- **Numbers:** numerals always ("3 min", "Note 4 of 15").

## VISUAL FOUNDATIONS
- **Palette:** ink `#111111`, white, soft cloud `#f5f5f5` carry ~95% of surface. Text greys charcoal/ash/mute/stone. Hairlines `#cacacb` / `#e5e5e5`. Feedback red `#d30005`, green `#007d48`, blue `#1151ff`. Category accents (pink, purple soft/pale, teal, pink deep) only in swatch dots, soft tiles, and editorial backgrounds — never chrome or text.
- **Type:** two tiers with almost no middle. Display: Bebas Neue 96/0.9 uppercase (64 tablet, 48 mobile) — campaign heroes only. Everything else: Inter 400/500 — headings 32/24/16, body 16/1.5, captions 14/12, legal 9. Letter-spacing 0.
- **Spacing:** 8px-based scale 2/4/8/12/18/24/30/48. Sections stack at 48px (32 tablet, 24 mobile). Grid gutters 8px. Card metadata rows 8px apart. Disclosure rows 24px vertical padding. Filter groups 18px.
- **Layout:** max content 1440px, 48px desktop gutters (80px ultrawide). Library: 220px filter rail + 3-up grid → 2-up @1023 → 1-up @599. Sticky header only; nothing else fixed. Sections butt together — whitespace separates, it doesn't decorate.
- **Backgrounds:** flat white. Full-bleed photography in campaign/benefit tiles (none supplied — ink or accent fills stand in). No gradients, patterns, textures or illustrations.
- **Imagery vibe:** cinematic, high-contrast athletic-editorial photography in the source; for OpenKeys, hands-on-keys/real-room photography would fit. Product-style imagery sits on soft cloud with no surrounding padding. In kits, the PianoKeyboard component itself plays the "product shot".
- **Corner radii:** containers 0 (cards, tiles, images, nav, footer). Controls are pills: buttons/chips/badges 30px, search 24px, icon buttons & dots full circle, 18px for icon containers only.
- **Cards:** no border, no shadow, no radius, no padding. Media full-bleed on soft cloud; title (16 medium), subtitle (14 mute), meta row below.
- **Borders:** 1px `#cacacb` dividers between filter groups, disclosure rows, footer. Filter chips and promo badges carry a 1px hairline outline.
- **Shadows/elevation:** none. The only "shadow" is `inset 0 -1px 0 #e5e5e5` under sticky bars. Focus on search = 2px ink border + 12px soft-cloud halo.
- **Transparency/blur:** not used. No glass, no scrims (headline color is chosen per image instead of protection gradients).
- **Hover:** none documented by policy. Do not invent hover tints.
- **Press:** signature "tap collapse" — `scale(0.5)` + `opacity 0.5`, 200ms `cubic-bezier(0.4,0,0.2,1)` (`.ok-press`). Applied to buttons, chips, icon buttons.
- **Selected states:** full inversion (chip → ink), 2px ink underline (nav), concentric ring (swatch dot), 1px underline (filter option).
- **Animation:** minimal — press collapse, chevron rotation, progress-bar width, key color fades (120ms). No bounces, no entrance animations.
- **Hierarchy rule:** one ink pill per viewport; pair with soft-cloud secondary at most.

## ICONOGRAPHY
- The source defines no icon set. **Substitution: [Lucide](https://lucide.dev) (ISC)** — 2px stroke, round caps, 24px grid — matches the system's thin, neutral, monochrome chrome. 50 icons copied programmatically into `assets/icons/*.svg` and bundled in the `Icon` component (`components/core/Icon.jsx`).
- Icons are always ink/currentColor, 20–24px in chrome, 48px (1.5 stroke) in CategoryIconCards. Never colored, never filled.
- Used for: nav cluster (search, user, github), icon buttons (arrow-left, heart, share-2, play, skip-back, repeat, plus/minus), chevrons on disclosure rows / sort, sliders-horizontal for filters.
- No emoji. No icon font. No PNG icons. Unicode only for "·" and "/".
- **Logo:** none supplied. The wordmark is "OpenKeys" set in Inter Medium (20px in nav). Do not draw a mark.

## Intentional additions
- **Icon** — wrapper for the Lucide glyph set (source has no icon system).
- **PianoKeyboard** — the core OpenKeys learning surface; built from the system's flat ink/white vocabulary and feedback colors.

## Components
`window.OpenKeysDesignSystem_dedd02` (load `_ds_bundle.js`).
- `components/buttons/` — **Button** (primary / secondary / onImage; sm/md/lg), **IconButton** (soft / ghost / onImage / inverse), **FilterChip**
- `components/forms/` — **SearchPill**
- `components/badges/` — **Badge** (promo / success / error / muted), **SwatchDot**
- `components/cards/` — **SongCard**, **CampaignTile**, **BenefitCard**, **CategoryIconCard**
- `components/disclosure/` — **DisclosureRow** (detail / faq)
- `components/navigation/` — **UtilityBar**, **PrimaryNav**, **SubNav**, **FilterSidebar**, **Footer**
- `components/core/` — **Icon** (+ `ICON_NAMES`), **PianoKeyboard**

## Index
- `styles.css` — global entry (imports only)
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `shape.css` (radii, elevation, motion), `base.css` (element defaults + `.ok-*` type classes, `.ok-press`)
- `assets/fonts/` — Bebas Neue, Inter (woff2, OFL) · `assets/icons/` — Lucide SVGs
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Shape, Brand)
- `components/` — see above; each has `.jsx`, `.d.ts`, `.prompt.md`, plus one card per folder
- `ui_kits/website/`, `ui_kits/app/` — click-through screens (see their READMEs)
- `thumbnail.html` — project tile · `SKILL.md` — agent skill entry
- `uploads/DESIGN.md` — original source spec

## Known gaps (inherited from source)
Mobile layouts, hover states, dialogs/modals, form fields beyond search, and count badges on icons are not specified.
