/**
 * The built-in course: short lessons, each an explanation card, two or three exercises and one
 * piece. The next lesson "unlocks" at 2 stars, but nothing is hard-locked.
 */
export interface LessonCard {
  title: string;
  /** Short paragraphs; **bold** is supported. */
  body: string[];
  /** Keys to highlight on a small keyboard demo. */
  keys?: number[];
  /** Finger numbers to show on the demo keys (same order as keys). */
  fingers?: number[];
}

export interface LessonExercise {
  id: string;
  title: string;
  hint: string;
  abc: string;
  mode: 'wait' | 'playalong';
  hands?: 'L' | 'R' | 'both';
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  cards: LessonCard[];
  exercises: LessonExercise[];
  piece: { songId: string; variant: 'R' | 'easy' | 'full'; hands: 'L' | 'R' | 'both'; mode: 'wait' | 'playalong' };
  /** Offer the calibration wizard from this lesson. */
  calibration?: boolean;
}

const abc = (title: string, body: string, meta = 'M:4/4\nL:1/4\nQ:1/4=80\nK:C') => `X:1\nT:${title}\n${meta}\n${body}\n`;

export const COURSE: Lesson[] = [
  {
    id: 'L1',
    number: 1,
    title: 'Getting to know the keyboard',
    summary: 'Find your way around, meet middle C and your finger numbers.',
    calibration: true,
    cards: [
      {
        title: 'Black keys come in groups',
        body: [
          'Look at the black keys: they come in **groups of two and three**. That pattern repeats all the way up the keyboard and is how pianists find their way.',
          'The white key just to the **left of every group of two black keys is a C**.',
        ],
        keys: [48, 60, 72],
      },
      {
        title: 'Middle C',
        body: ['The C nearest the middle of your keyboard is **middle C** (C4). Most beginner music starts here. On a 61-key keyboard it is the third C from the left.'],
        keys: [60],
      },
      {
        title: 'Finger numbers',
        body: ['Each hand counts its fingers from the thumb: **thumb = 1, index = 2, middle = 3, ring = 4, little finger = 5**. Music often prints these small numbers above or below the notes.'],
        keys: [60, 62, 64, 65, 67],
        fingers: [1, 2, 3, 4, 5],
      },
      {
        title: 'Posture',
        body: [
          'Sit at the front half of the chair, forearms level with the keys, elbows slightly in front of your body.',
          'Keep your hand **rounded**, as if holding a ball, and play on the fingertips. Shoulders loose!',
        ],
      },
    ],
    exercises: [
      { id: 'L1-cs', title: 'Find the Cs', hint: 'Play every C, from low to high. Look for the groups of two black keys.', abc: abc('Find the Cs', 'C,,4 | C,4 | C4 | c4 | c\'4 |]'), mode: 'wait', hands: 'R' },
      { id: 'L1-fingers', title: 'Fingers 1 to 5', hint: 'Right thumb on middle C. Play one key per finger, up and back.', abc: abc('Fingers 1 to 5', '!1!C !2!D !3!E !4!F | !5!G !4!F !3!E !2!D | !1!C4 |]'), mode: 'wait', hands: 'R' },
    ],
    piece: { songId: 'mary', variant: 'R', hands: 'R', mode: 'wait' },
  },
  {
    id: 'L2',
    number: 2,
    title: 'Five-finger position in C',
    summary: 'Right hand, then left hand, then both together.',
    cards: [
      {
        title: 'The C position',
        body: ['Put the **right-hand thumb on middle C** and let each finger rest on the next white key: C D E F G. That is the C five-finger position.', 'The **left hand** mirrors it an octave lower: **little finger on C3**, thumb on G3.'],
        keys: [48, 50, 52, 53, 55, 60, 62, 64, 65, 67],
        fingers: [5, 4, 3, 2, 1, 1, 2, 3, 4, 5],
      },
      { title: 'Keep it even', body: ['Play slowly and evenly. In **Wait mode** the music waits for you, so take your time to find each note.'] },
    ],
    exercises: [
      { id: 'L2-rh', title: 'Right hand up and down', hint: 'Thumb on middle C.', abc: abc('RH five-finger', 'V:1\nC D E F | G F E D | C E D F | E D C2 |]'), mode: 'wait', hands: 'R' },
      { id: 'L2-lh', title: 'Left hand up and down', hint: 'Little finger on the C below middle C.', abc: abc('LH five-finger', 'V:1 clef=bass\nC, D, E, F, | G, F, E, D, | C, E, D, F, | E, D, C,2 |]'), mode: 'wait', hands: 'L' },
      { id: 'L2-both', title: 'Both hands together', hint: 'Both hands play the same notes an octave apart.', abc: abc('Hands together', 'V:1\nC D E F | G2 C2 |]\nV:2 clef=bass\nC, D, E, F, | G,2 C,2 |]'), mode: 'wait', hands: 'both' },
    ],
    piece: { songId: 'ode', variant: 'R', hands: 'R', mode: 'wait' },
  },
  {
    id: 'L3',
    number: 3,
    title: 'Reading notes and rhythm',
    summary: 'Treble and bass staff; quarter, half and whole notes; rests; counting.',
    cards: [
      {
        title: 'Two staves',
        body: ['Piano music has two staves joined by a brace. The top one, with the **treble clef** (𝄞), is usually the right hand; the bottom one, with the **bass clef** (𝄢), the left.', 'Middle C sits on a little line between them.'],
        keys: [60],
      },
      {
        title: 'Note values',
        body: ['In 4/4 time a bar has four beats. A **quarter note** (♩) lasts one beat, a **half note** two, a **whole note** four. **Rests** are silent beats of the same lengths.', 'Count “1 2 3 4” out loud as you play.'],
      },
      { title: 'Reading drill', body: ['The **note-reading game** in Drills shows one note at a time: a quick way to get fluent.'] },
    ],
    exercises: [
      { id: 'L3-values', title: 'Quarters, halves and wholes', hint: 'Count 1 2 3 4 in every bar.', abc: abc('Note values', 'C D E F | G2 E2 | C4 | G2 G2 | F E D C | D4 | C4 |]'), mode: 'playalong', hands: 'R' },
      { id: 'L3-rests', title: 'Rests', hint: 'Lift your finger on the rests, but keep counting.', abc: abc('Rests', 'C z E z | G2 z2 | E z C z | D4 |]'), mode: 'playalong', hands: 'R' },
      { id: 'L3-bass', title: 'Bass clef reading', hint: 'Left hand in C position.', abc: abc('Bass reading', 'V:1 clef=bass\nC,2 E,2 | G,2 E,2 | D, F, E, D, | C,4 |]'), mode: 'wait', hands: 'L' },
    ],
    piece: { songId: 'aucLair', variant: 'R', hands: 'R', mode: 'playalong' },
  },
  {
    id: 'L4',
    number: 4,
    title: 'Hands together',
    summary: 'Simple, independent patterns in both hands.',
    cards: [
      { title: 'One hand moves, one hand holds', body: ['Start with the left hand holding long notes while the right hand plays the tune. Practise **hands separately** first, then together **slowly**.'] },
      { title: 'Use the tempo slider', body: ['Playing at **60%** with no mistakes beats playing at full speed with many. Speed comes from accuracy.'] },
    ],
    exercises: [
      { id: 'L4-hold', title: 'Melody over long notes', hint: 'Left hand holds whole notes.', abc: abc('Melody and bass', 'V:1\nE D C D | E E E2 | D D E D | C4 |]\nV:2 clef=bass\nC,4 | C,4 | G,,4 | C,4 |]'), mode: 'playalong', hands: 'both' },
      { id: 'L4-contrary', title: 'Contrary motion', hint: 'Hands move away from each other and back.', abc: abc('Contrary motion', 'V:1\nC D E F | G F E D | C4 |]\nV:2 clef=bass\nC, B,, A,, G,, | F,, G,, A,, B,, | C,4 |]'), mode: 'wait', hands: 'both' },
    ],
    piece: { songId: 'ode', variant: 'easy', hands: 'both', mode: 'playalong' },
  },
  {
    id: 'L5',
    number: 5,
    title: 'Major scales and key signatures',
    summary: 'Thumb-under fingering, C and G major, sharps in the key signature.',
    cards: [
      {
        title: 'The thumb passes under',
        body: ['A scale has more notes than fingers. In C major the right hand plays **1 2 3**, then the **thumb passes under** to F and continues **1 2 3 4 5**.', 'Coming down, finger 3 crosses over the thumb.'],
        keys: [60, 62, 64, 65, 67, 69, 71, 72],
        fingers: [1, 2, 3, 1, 2, 3, 4, 5],
      },
      { title: 'Key signatures', body: ['G major has one sharp: **F♯**. The sharp at the start of each line means **every F is played as F♯** (the black key just right of F), unless marked otherwise.'], keys: [66] },
      { title: 'More scales', body: ['The Drills screen generates scales in any key, hands separately or together, with the standard fingering.'] },
    ],
    exercises: [
      { id: 'L5-c', title: 'C major scale, right hand', hint: 'Thumb under after E.', abc: abc('C major scale', '!1!C !2!D !3!E !1!F | !2!G !3!A !4!B !5!c | c B A G | !3!F E D C |]'), mode: 'wait', hands: 'R' },
      { id: 'L5-g', title: 'G major scale, right hand', hint: 'Remember F♯!', abc: abc('G major scale', '!1!G !2!A !3!B !1!c | !2!d !3!e !4!f !5!g | g f e d | !3!c B A G |]', 'M:4/4\nL:1/4\nQ:1/4=80\nK:G') , mode: 'wait', hands: 'R' },
      { id: 'L5-lh', title: 'C major scale, left hand', hint: 'Finger 3 crosses over the thumb going up.', abc: abc('LH C scale', 'V:1 clef=bass\n!5!C, !4!D, !3!E, !2!F, | !1!G, !3!A, !2!B, !1!C |]'), mode: 'wait', hands: 'L' },
    ],
    piece: { songId: 'minuetG', variant: 'R', hands: 'R', mode: 'wait' },
  },
  {
    id: 'L6',
    number: 6,
    title: 'Triads and accompaniment',
    summary: 'Chords, inversions and block, broken and Alberti patterns.',
    cards: [
      { title: 'Triads', body: ['A **triad** is three notes, each a third apart: C–E–G is C major. Play it with fingers **1 3 5**.'], keys: [60, 64, 67], fingers: [1, 3, 5] },
      { title: 'Inversions', body: ['The same notes in a different order are an **inversion**: E–G–C (1st inversion) and G–C–E (2nd). Inversions keep your hand close when chords change.'] },
      { title: 'Accompaniment patterns', body: ['**Block** chords sound all notes together; **broken** chords play them one by one; the **Alberti bass** goes low–high–middle–high (C G E G).'] },
    ],
    exercises: [
      { id: 'L6-block', title: 'Block chords I–IV–V–I', hint: 'Left hand. Keep the fingers close: use inversions.', abc: abc('Block chords', 'V:1 clef=bass\n[C,E,G,]4 | [C,F,A,]4 | [B,,D,G,]4 | [C,E,G,]4 |]'), mode: 'wait', hands: 'L' },
      { id: 'L6-alberti', title: 'Alberti bass', hint: 'C G E G: thumb on the top note.', abc: abc('Alberti bass', 'V:1 clef=bass\nC,/G,/E,/G,/ C,/G,/E,/G,/ C,/A,/F,/A,/ C,/A,/F,/A,/ | B,,/G,/D,/G,/ B,,/G,/D,/G,/ C,/G,/E,/G,/ C,2 |]', 'M:4/4\nL:1/4\nQ:1/4=60\nK:C'), mode: 'playalong', hands: 'L' },
    ],
    piece: { songId: 'twinkle', variant: 'full', hands: 'both', mode: 'playalong' },
  },
  {
    id: 'L7',
    number: 7,
    title: 'Repertoire',
    summary: 'Complete short pieces, with dynamics and phrasing.',
    cards: [
      { title: 'Dynamics', body: ['**p** (piano) means soft, **f** (forte) loud; **mp** and **mf** are in between. A wedge opening up (<) is a **crescendo**: get gradually louder.', 'With a touch-sensitive keyboard (or the microphone), OpenKeys checks your dynamics too.'] },
      { title: 'Phrasing', body: ['Music breathes in phrases, usually 2 or 4 bars long. Shape each phrase: a little growth towards its high point, then relax.'] },
    ],
    exercises: [
      { id: 'L7-dyn', title: 'Soft and loud', hint: 'Play the first bar softly and the second loudly.', abc: abc('Dynamics', '!p!C E G E | !f!C E G E | !p!c4 |]'), mode: 'playalong', hands: 'R' },
    ],
    piece: { songId: 'furElise', variant: 'easy', hands: 'both', mode: 'wait' },
  },
];

export function lessonById(id: string): Lesson | undefined {
  return COURSE.find((l) => l.id === id);
}

/** Lesson progress key for the piece / an exercise. */
export const lessonKey = (lessonId: string, part: string) => `${lessonId}:${part}`;
