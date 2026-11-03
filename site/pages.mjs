// Content for the static info pages served next to the app (built by scripts/build-site.mjs).
// Each page answers one search intent ("Yousician alternative", "Synthesia in the browser", ...) with real,
// specific content. Copy rules are the design system's: plain, short, sentence case, numerals, no hype.
// Claims about other apps stay general and dated; check them again before changing COMPARED_ON.

export const SITE = 'https://openkeys.live';
export const COMPARED_ON = 'November 2026';
export const UPDATED = '2026-11-03';

// What OpenKeys is, in one place, so every page says the same thing.
export const FEATURES = [
  ['Listens through your microphone', 'Put a laptop or tablet on the music stand of any piano or keyboard. No cable needed. A setup wizard tunes it to your room in about 2 minutes.'],
  ['Exact with a MIDI keyboard', 'Plug a USB MIDI keyboard into Chrome, Edge or Firefox and every note, its timing and how hard you played it are read exactly.'],
  ['Waits for the right note', 'Wait mode stops until you play the right keys, then tells you what you played instead: "That was E4; try D4, 2 keys lower".'],
  ['Falling notes and sheet music', 'Practise with sheet music, falling notes or both. Notes turn green or red in place, and wrong notes show as ghost noteheads.'],
  ['Loops the bars you miss', 'Results show your top trouble spots bar by bar. One click loops them, and Loop drill raises the tempo 5% after each clean pass.'],
  ['Your own music', 'Import MusicXML (from MuseScore), MIDI and ABC files by drag and drop, or write exercises in the built-in editor.'],
  ['A course and drills', 'A 7-lesson course from finding middle C to playing with both hands, plus scales, arpeggios, chords, sight-reading, rhythm and ear training.'],
  ['Free, with no account', 'No sign-up, no subscription, no ads and no trial. MIT licensed and open source on GitHub.'],
  ['Private and offline', 'Audio never leaves your device. Your progress is stored in the browser, and OpenKeys installs as an app that works offline.'],
];

const OPENKEYS_COLUMN = {
  price: 'Free. No subscription, no ads, no in-app purchases',
  account: 'Not needed',
  where: 'Any modern browser on a computer, tablet or phone; installs as an app',
  mic: 'Yes, with a setup wizard for your room',
  midi: 'Yes, in Chrome, Edge and Firefox (Safari: microphone only)',
  files: 'Yes: MusicXML, MIDI and ABC',
  library: '15 built-in public-domain pieces in graded versions, plus anything you import',
  instruments: 'Piano and keyboard',
  source: 'Open source, MIT licence',
  privacy: 'Audio and progress stay on your device',
};

const ROWS = [
  ['price', 'Price'],
  ['account', 'Account'],
  ['where', 'Where it runs'],
  ['mic', 'Listens through a microphone'],
  ['midi', 'MIDI keyboard'],
  ['files', 'Import your own files'],
  ['library', 'Songs'],
  ['instruments', 'Instruments'],
  ['source', 'Source code'],
  ['privacy', 'Your data'],
];

const SHARED_FAQ = [
  ['Is OpenKeys really free?', 'Yes. There is no subscription, no trial, no ads and nothing to unlock. The code is MIT licensed on GitHub, so it stays available even if the project stops.'],
  ['Do I need to download anything or make an account?', 'No. Open openkeys.live in Chrome, Edge, Firefox or Safari and start playing. You can install it as an app from the browser if you want it offline.'],
  ['Does it work with an acoustic piano?', 'Yes. OpenKeys listens through your device microphone. Single notes are detected precisely; for chords it checks the notes it expects. When it is not sure, it shows "?" and never counts that against you.'],
  ['What do I need to start?', 'A piano or keyboard and a computer, tablet or phone. A USB MIDI cable is the most accurate. With no instrument at all, you can play with the computer keys.'],
];

export const PAGES = [
  {
    slug: 'learn-piano-free',
    nav: 'Learn free',
    title: 'Learn piano online for free, in your browser · OpenKeys',
    description:
      'OpenKeys is a free piano teacher that runs in your browser. It listens through your microphone or MIDI keyboard, waits on the right note and loops the bars you miss. No account, no download.',
    h1: 'Learn piano online for free, in your browser',
    lede: 'OpenKeys listens while you play and tells you what went well and what to fix. No account, no subscription, nothing to install.',
    intro: [
      'Most piano apps are free to download and then ask for a subscription. OpenKeys is free all the way through: every lesson, drill and practice mode, with no limits on how long you play.',
      'It works with the instrument you already have. Play an acoustic piano or a keyboard into the microphone, connect a MIDI keyboard over USB, or use the computer keys if you have no instrument yet.',
    ],
    sections: [
      {
        h2: 'How it works',
        html: `<div class="tiles">
<div class="tile"><h3>1. Choose how you play</h3><p>Microphone, MIDI keyboard or computer keys. The setup wizard checks room noise, timing and tuning.</p></div>
<div class="tile"><h3>2. Pick a lesson or a piece</h3><p>Start the 7-lesson course, or open Ode to Joy, Für Elise, Minuet in G and more in graded versions.</p></div>
<div class="tile"><h3>3. Play and get feedback</h3><p>OpenKeys plays the piece first, then follows you, marks each note and shows exactly what to practise next.</p></div>
</div>`,
      },
      {
        h2: 'Practice modes',
        html: `<ul class="plain">
<li><b>Listen</b> plays the piece with a grand piano sound while the notes light up.</li>
<li><b>Wait</b> stops on every note until you play it. The best way to learn a new piece.</li>
<li><b>Play along</b> keeps time at 25% to 150% of the tempo, with a metronome if you want one.</li>
<li><b>Follow me</b> has no fixed tempo: OpenKeys follows you, pauses and restarts included.</li>
<li><b>Loop drill</b> repeats a few bars and raises the tempo 5% after each clean pass.</li>
</ul>
<p>Practise hands separately or together. OpenKeys can play the other hand for you.</p>`,
      },
    ],
    faq: [
      ['Can I learn piano with an app alone?', 'An app can teach you to read music, find notes, keep time and practise efficiently, and it is a good start. A teacher is still the best way to fix posture and technique, so OpenKeys works well between lessons too.'],
      ['Which songs are included?', 'Twinkle Twinkle, Ode to Joy, Für Elise, Gymnopédie No. 1, Bach\'s Prelude in C, Minuet in G, Canon in D, Greensleeves, Amazing Grace and more, each in easy and fuller versions. You can import any MusicXML, MIDI or ABC file.'],
      ...SHARED_FAQ,
    ],
  },
  {
    slug: 'alternatives',
    nav: 'Compare',
    title: 'Free piano learning apps compared: Yousician, Synthesia, Simply Piano, flowkey · OpenKeys',
    description:
      'How OpenKeys, a free and open-source piano teacher in the browser, compares with Yousician, Synthesia, Simply Piano and flowkey: price, account, microphone and MIDI, your own files.',
    h1: 'Piano learning apps compared',
    lede: 'OpenKeys is a free, open-source piano teacher that runs in your browser. Here is how it compares with the apps you may already know.',
    intro: [
      'Yousician, Simply Piano and flowkey are polished apps with large licensed song libraries, paid by subscription. Synthesia is a falling-notes app with a one-time unlock. OpenKeys is free and open source, runs in any browser, needs no account and keeps your audio on your device.',
      'OpenKeys has fewer built-in songs than any of them. It makes up for that by importing the MusicXML, MIDI and ABC files you already have.',
    ],
    table: {
      cols: ['OpenKeys', 'Yousician', 'Synthesia', 'Simply Piano', 'flowkey'],
      rows: [
        ['Price', 'Free', 'Subscription, limited free tier', 'Free with a few songs, one-time unlock', 'Subscription, limited free tier', 'Subscription, a few free songs'],
        ['Account', 'Not needed', 'Needed', 'Not needed', 'Needed', 'Needed'],
        ['Runs in a web browser', 'Yes', 'Mainly apps', 'No, installed app', 'No, phone and tablet app', 'Yes, and apps'],
        ['Listens through a microphone', 'Yes', 'Yes', 'No, MIDI keyboard', 'Yes', 'Yes'],
        ['MIDI keyboard', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
        ['Import your own MIDI or MusicXML', 'Yes', 'No', 'MIDI, after unlock', 'No', 'No'],
        ['Open source', 'Yes, MIT', 'No', 'No', 'No', 'No'],
      ],
    },
    sections: [],
    faq: [
      ['What is the best free alternative to Yousician or Simply Piano?', 'If you want to learn piano without a subscription, OpenKeys is free with no limits, runs in the browser and listens through your microphone or a MIDI keyboard. It has fewer built-in songs, but you can import your own.'],
      ['Is there a web version of Synthesia?', 'Synthesia itself is an installed app. OpenKeys gives you falling notes, sheet music and your own MIDI files in the browser, for free. See the Synthesia comparison below.'],
      ...SHARED_FAQ,
    ],
  },
  {
    slug: 'yousician-alternative',
    nav: 'Yousician',
    title: 'Free Yousician alternative for piano, open source · OpenKeys',
    description:
      'Looking for a free Yousician alternative? OpenKeys is an open-source piano teacher in your browser. It listens through your mic or MIDI keyboard, with no account, no subscription and no daily limit.',
    h1: 'A free, open-source Yousician alternative for piano',
    lede: 'OpenKeys listens to you play, like Yousician, but it is free with no daily limit, runs in your browser and needs no account.',
    intro: [
      'Yousician teaches guitar, piano, bass, ukulele and singing, with a large library of licensed songs and a subscription for full access. If you only want piano and do not want to pay monthly, OpenKeys covers the core of it: it listens through your microphone or MIDI keyboard, marks every note and tells you what to practise next.',
      'OpenKeys is open source. There is no account, no paywall and no limit on how long you practise each day. Your audio never leaves your device.',
    ],
    them: {
      name: 'Yousician',
      price: 'Subscription for full access; a limited free tier',
      account: 'Needed',
      where: 'Apps for phone, tablet and computer',
      mic: 'Yes',
      midi: 'Yes',
      files: 'No, its own catalogue',
      library: 'Large licensed catalogue, including pop songs',
      instruments: 'Guitar, piano, bass, ukulele and singing',
      source: 'Closed source',
      privacy: 'Account and progress stored by the service',
    },
    better: [
      'You want to learn piano without a subscription or a daily time limit.',
      'You want to play your own pieces: import MusicXML from MuseScore, or MIDI and ABC files.',
      'You prefer to practise in the browser on any computer, with no account and no tracking.',
      'You want specific feedback: wrong notes shown as ghost noteheads, timing per hand and a bar-by-bar heatmap.',
    ],
    worse: [
      'Yousician has far more songs, including licensed pop music. OpenKeys has 15 public-domain pieces plus your imports.',
      'Yousician teaches guitar, bass, ukulele and singing too. OpenKeys is piano only.',
      'Yousician has video lessons and a bigger structured curriculum. OpenKeys has a 7-lesson course and generated drills.',
    ],
    faq: [
      ['Is there a free version of Yousician?', 'Yousician has a free tier with limits; full access is a subscription. OpenKeys is a different app that is free with no limits for piano.'],
      ['Is there an open-source Yousician?', 'OpenKeys is an open-source piano teacher in the same spirit: it listens to you play and gives feedback. The code is on GitHub under the MIT licence.'],
      ['Does OpenKeys work like Yousician with a microphone?', 'Yes. Put your device near the piano, run the 2-minute setup wizard and play. OpenKeys follows you note by note.'],
      ...SHARED_FAQ,
    ],
  },
  {
    slug: 'synthesia-alternative',
    nav: 'Synthesia',
    title: 'Synthesia alternative in your browser, free and online · OpenKeys',
    description:
      'Looking for Synthesia online or a web version? OpenKeys runs in the browser with falling notes, sheet music, your own MIDI files, MIDI keyboard and microphone input. Free and open source.',
    h1: 'Falling notes in your browser. A free Synthesia alternative.',
    lede: 'Open a MIDI file, watch the notes fall and play along on your keyboard. In the browser, free, with no download.',
    intro: [
      'Synthesia made falling-notes piano popular: load a MIDI file, watch the notes come down and play them on a MIDI keyboard. It is an installed app with a free set of songs and a one-time unlock for the rest.',
      'OpenKeys does the same in a web browser, for free. It also shows the sheet music, listens through a microphone if you have no MIDI keyboard, and gives feedback on every note: right, wrong, early, late or held too short.',
    ],
    them: {
      name: 'Synthesia',
      price: 'Free with a set of songs; one-time unlock for the rest and your own MIDI files',
      account: 'Not needed',
      where: 'Installed app for computer, tablet and phone',
      mic: 'No, made for MIDI keyboards',
      midi: 'Yes',
      files: 'MIDI, after unlock',
      library: 'Built-in songs plus any MIDI file',
      instruments: 'Piano and keyboard',
      source: 'Closed source',
      privacy: 'Runs on your device',
    },
    better: [
      'You want falling notes without installing anything, on any computer with a browser.',
      'You have an acoustic piano or a keyboard without USB: OpenKeys listens through the microphone.',
      'You want to learn to read music: sheet music and falling notes can show side by side.',
      'You want to import MIDI and MusicXML files for free, and record your playing back to MIDI.',
    ],
    worse: [
      'Synthesia\'s falling-notes view is its whole focus and is very polished; OpenKeys splits its attention between sheet music and falling notes.',
      'Synthesia has a large built-in song set. OpenKeys has 15 pieces, plus any file you import.',
      'Safari cannot use MIDI keyboards (no Web MIDI), so on a Mac or iPad with Safari OpenKeys uses the microphone. Chrome, Edge and Firefox support MIDI.',
    ],
    faq: [
      ['Is there a web version of Synthesia?', 'Synthesia is an installed app. If you want falling notes in the browser, OpenKeys does it for free: open openkeys.live, import a MIDI file and play.'],
      ['Can I play Synthesia-style MIDI files in OpenKeys?', 'Yes. Drag a .mid file onto the Library page. OpenKeys splits the hands, shows sheet music and falling notes, and judges your playing.'],
      ['Do I need a MIDI keyboard?', 'No. A MIDI keyboard over USB is the most accurate, but OpenKeys also listens through a microphone, and you can play with the computer keys.'],
      ...SHARED_FAQ,
    ],
  },
  {
    slug: 'simply-piano-alternative',
    nav: 'Simply Piano',
    title: 'Free Simply Piano alternative with no subscription · OpenKeys',
    description:
      'A free alternative to Simply Piano: OpenKeys is an open-source piano teacher in your browser that listens through your mic or MIDI keyboard. No subscription, no account, works on a laptop.',
    h1: 'A free Simply Piano alternative, with no subscription',
    lede: 'OpenKeys listens to your piano and guides you note by note, like Simply Piano, but it is free and runs in a browser on any computer.',
    intro: [
      'Simply Piano is a well-made app for phones and tablets that listens to you play and walks you through songs, with a subscription for most of its content. OpenKeys does the listening and the guidance for free, in the browser, on a laptop, tablet or phone.',
      'There is no sign-up and no trial to cancel. Everything, from the course to the drills, is open from the first minute.',
    ],
    them: {
      name: 'Simply Piano',
      price: 'Subscription for full access; a few songs free',
      account: 'Needed',
      where: 'Phone and tablet app',
      mic: 'Yes',
      midi: 'Yes',
      files: 'No, its own catalogue',
      library: 'Large licensed catalogue, including pop songs',
      instruments: 'Piano',
      source: 'Closed source',
      privacy: 'Account and progress stored by the service',
    },
    better: [
      'You want to learn piano without a subscription or a trial.',
      'You want to practise on a laptop or desktop browser, with a bigger view of the music.',
      'You want to import your own pieces as MusicXML, MIDI or ABC.',
      'You want detailed feedback: per-hand timing, a bar-by-bar heatmap and loops of the bars you miss.',
    ],
    worse: [
      'Simply Piano has many more songs, including licensed pop music. OpenKeys has 15 public-domain pieces plus your imports.',
      'Simply Piano has a longer guided course. OpenKeys has a 7-lesson course plus generated drills.',
    ],
    faq: [
      ['Is there a free Simply Piano alternative?', 'Yes. OpenKeys is free with no subscription. It listens through your microphone or MIDI keyboard and runs in the browser.'],
      ['Does OpenKeys work on a laptop?', 'Yes. OpenKeys runs in Chrome, Edge, Firefox and Safari on Windows, macOS, Linux and ChromeOS, and on tablets and phones.'],
      ...SHARED_FAQ,
    ],
  },
  {
    slug: 'flowkey-alternative',
    nav: 'flowkey',
    title: 'Free flowkey alternative, open source, in your browser · OpenKeys',
    description:
      'A free alternative to flowkey: OpenKeys is an open-source piano teacher in your browser with sheet music, Wait mode, microphone and MIDI input. No account and no subscription.',
    h1: 'A free, open-source flowkey alternative',
    lede: 'Sheet music, a mode that waits for the right note, and feedback through your microphone or MIDI keyboard. Free, in your browser.',
    intro: [
      'flowkey teaches with sheet music next to video of a real pianist\'s hands, and waits for you to play the right notes. Full access is a subscription. OpenKeys also runs in the browser and waits for the right notes, and it is free and open source.',
      'OpenKeys goes further on feedback: notes are marked in place on the sheet music, wrong notes appear as ghost noteheads, and your trouble spots become short loops you can drill.',
    ],
    them: {
      name: 'flowkey',
      price: 'Subscription for full access; a few songs free',
      account: 'Needed',
      where: 'Web browser and apps',
      mic: 'Yes',
      midi: 'Yes',
      files: 'No, its own catalogue',
      library: 'Large catalogue, including pop and film music',
      instruments: 'Piano',
      source: 'Closed source',
      privacy: 'Account and progress stored by the service',
    },
    better: [
      'You want Wait mode and sheet-music practice without a subscription or account.',
      'You want to import your own scores from MuseScore (MusicXML), MIDI or ABC.',
      'You want detailed feedback after each take, and loops of the bars you miss.',
      'You want your audio and progress to stay on your device.',
    ],
    worse: [
      'flowkey has video of a pianist\'s hands for each song. OpenKeys shows notes on the sheet, falling notes and an on-screen keyboard, but no video.',
      'flowkey has a much larger song catalogue. OpenKeys has 15 public-domain pieces plus your imports.',
    ],
    faq: [
      ['Is there a free flowkey alternative?', 'Yes. OpenKeys is free with no subscription, runs in the browser and waits for the right notes like flowkey does.'],
      ...SHARED_FAQ,
    ],
  },
];

// Fill each competitor page's two-column table from the shared rows.
for (const p of PAGES) {
  if (!p.them) continue;
  p.table = {
    cols: ['OpenKeys', p.them.name],
    rows: ROWS.map(([k, label]) => [label, OPENKEYS_COLUMN[k], p.them[k]]),
  };
}
