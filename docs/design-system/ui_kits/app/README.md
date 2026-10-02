# OpenKeys app — UI kit

Click-through of the learning app. Open `index.html`.

Flow: **Learn** (home: continue card, start-with-these grid, skill strip) → **Songs** (library: SubNav, FilterSidebar, chips, 3-up SongCard grid) → **Song detail** (soft-cloud media square, arrangement swatches, Start/Listen pills, disclosure rows) → **Lesson player** (playable: press the blue key; green = correct, red = wrong; completion state).

Files: `data.js` (songs + note sequences), `Shared.jsx` (nav, KeysPreview, helpers), `HomeScreen.jsx`, `LibraryScreen.jsx`, `SongScreen.jsx`, `PlayerScreen.jsx`.

Note: no OpenKeys product UI was supplied. These screens apply the source page patterns (category home → Learn, PLP → Songs, PDP → Song detail) to the OpenKeys domain; the lesson player is an extrapolation built from the same vocabulary. Song media uses the PianoKeyboard component in place of photography.
