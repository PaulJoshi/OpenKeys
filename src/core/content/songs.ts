/**
 * Built-in songs: compositions in the public domain, arranged by the OpenKeys project
 * (arrangements released under CC0 / MIT with the code). Written in ABC; graded versions:
 * "Right hand" (derived), "Easy" (two hands, simple left hand) and sometimes "Full".
 * Never add files downloaded from score-sharing sites here.
 */
export interface BuiltInSong {
  id: string;
  title: string;
  composer: string;
  /** Short note shown in the library. */
  blurb: string;
  easy: string;
  full?: string;
  tags: string[];
}

export const SONG_LICENSE = 'Public-domain composition; arrangement © OpenKeys contributors, CC0';

const H = (t: string, extra = '') => `X:1\nT:${t}\n${extra}`;

export const BUILT_IN_SONGS: BuiltInSong[] = [
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    composer: 'Traditional',
    blurb: 'Five-finger position in C with one stretch to A.',
    tags: ['beginner', 'C major'],
    easy: H('Twinkle, Twinkle, Little Star', 'C:Traditional\nM:4/4\nL:1/4\nQ:1/4=96\nK:C\n') +
      `V:1 clef=treble\n!1!C C !5!G G | !6!A A !5!G2 | !4!F F E E | D D !1!C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2 |]\n` +
      `V:2 clef=bass\nC,4 | F,2 C,2 | F,2 C,2 | G,,2 C,2 | C,2 F,2 | C,2 G,,2 | C,2 F,2 | C,2 G,,2 | C,4 | F,2 C,2 | F,2 C,2 | G,,2 C,2 |]\n`,
    full: H('Twinkle, Twinkle, Little Star', 'C:Traditional\nM:4/4\nL:1/4\nQ:1/4=96\nK:C\n') +
      `V:1 clef=treble\nC C G G | A A G2 | F F E E | D D C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2 |]\n` +
      `V:2 clef=bass\n[C,E,G,]4 | [F,A,C]2 [E,G,C]2 | [F,A,C]2 [E,G,C]2 | [G,,B,,D,]2 [C,E,G,]2 | [E,G,C]2 [F,A,C]2 | [E,G,C]2 [G,B,D]2 | [E,G,C]2 [F,A,C]2 | [E,G,C]2 [G,B,D]2 | [C,E,G,]4 | [F,A,C]2 [E,G,C]2 | [F,A,C]2 [E,G,C]2 | [G,,B,,D,]2 [C,E,G,]2 |]\n`,
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditional',
    blurb: 'Three notes, steady quarter notes.',
    tags: ['beginner', 'C major'],
    easy: H('Mary Had a Little Lamb', 'C:Traditional\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\n') +
      `V:1 clef=treble\n!3!E !2!D !1!C D | E E E2 | D D D2 | E G G2 | E D C D | E E E E | D D E D | C4 |]\n` +
      `V:2 clef=bass\nC,4 | C,4 | G,,4 | C,4 | C,4 | C,4 | G,,4 | C,4 |]\n`,
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    blurb: 'The theme from the Ninth Symphony, in C.',
    tags: ['beginner', 'C major'],
    easy: H('Ode to Joy', 'C:Ludwig van Beethoven\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\n') +
      `V:1 clef=treble\n!mf!!3!E E !4!F !5!G | G F E D | !1!C C D E | E3/2 D/ D2 | E E F G | G F E D | C C D E | D3/2 C/ C2 | D D E C | D E/F/ E C | D E/F/ E D | C D G,2 | E E F G | G F E D | C C D E | D3/2 C/ C2 |]\n` +
      `V:2 clef=bass\nC,4 | G,,4 | C,4 | G,,2 G,,2 | C,4 | G,,4 | C,4 | G,,2 C,2 | G,,4 | C,2 G,,2 | C,2 G,,2 | C,2 G,,2 | C,4 | G,,4 | C,4 | G,,2 C,2 |]\n`,
    full: H('Ode to Joy', 'C:Ludwig van Beethoven\nM:4/4\nL:1/8\nQ:1/4=100\nK:C\n') +
      `V:1 clef=treble\n!mf!E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | E3 D D4 | E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | D3 C C4 | !p!D2 D2 E2 C2 | D2 EF E2 C2 | D2 EF E2 D2 | C2 D2 G,4 | !f!E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | D3 C C4 |]\n` +
      `V:2 clef=bass\nC,G,E,G, C,G,E,G, | B,,G,D,G, B,,G,D,G, | C,G,E,G, C,G,E,G, | B,,G,D,G, B,,G,D,G, | C,G,E,G, C,G,E,G, | B,,G,D,G, B,,G,D,G, | C,G,E,G, C,G,E,G, | B,,G,D,G, C,G,E,G, | B,,G,D,G, C,G,E,G, | B,,G,D,G, C,G,E,G, | B,,G,D,G, C,G,E,G, | C,G,E,G, B,,G,D,G, | C,G,E,G, C,G,E,G, | B,,G,D,G, B,,G,D,G, | C,G,E,G, C,G,E,G, | B,,G,D,G, C,4 |]\n`,
  },
  {
    id: 'aucLair',
    title: 'Au clair de la lune',
    composer: 'Traditional (French)',
    blurb: 'A gentle tune with a stepwise middle section.',
    tags: ['beginner', 'C major'],
    easy: H('Au clair de la lune', 'C:Traditional\nM:4/4\nL:1/4\nQ:1/4=92\nK:C\n') +
      `V:1 clef=treble\nC C C D | E2 D2 | C E D D | C4 | C C C D | E2 D2 | C E D D | C4 | D D D D | A,2 A,2 | D C B, A, | G,4 | C C C D | E2 D2 | C E D D | C4 |]\n` +
      `V:2 clef=bass\nC,4 | G,,4 | C,2 G,,2 | C,4 | C,4 | G,,4 | C,2 G,,2 | C,4 | G,,4 | D,4 | G,,4 | G,,4 | C,4 | G,,4 | C,2 G,,2 | C,4 |]\n`,
  },
  {
    id: 'frere',
    title: 'Frère Jacques',
    composer: 'Traditional (French)',
    blurb: 'Eighth notes and a leap down to G.',
    tags: ['beginner', 'C major'],
    easy: H('Frère Jacques', 'C:Traditional\nM:4/4\nL:1/8\nQ:1/4=100\nK:C\n') +
      `V:1 clef=treble\nC2 D2 E2 C2 | C2 D2 E2 C2 | E2 F2 G4 | E2 F2 G4 | GAGF E2 C2 | GAGF E2 C2 | C2 G,2 C4 | C2 G,2 C4 |]\n` +
      `V:2 clef=bass\nC,4 G,,4 | C,4 G,,4 | C,4 C,4 | C,4 C,4 | C,4 G,,4 | C,4 G,,4 | C,4 C,4 | C,4 C,4 |]\n`,
  },
  {
    id: 'rowboat',
    title: 'Row, Row, Row Your Boat',
    composer: 'Traditional',
    blurb: 'Lilting 6/8 time.',
    tags: ['beginner', 'C major', '6/8'],
    easy: H('Row, Row, Row Your Boat', 'C:Traditional\nM:6/8\nL:1/8\nQ:3/8=60\nK:C\n') +
      `V:1 clef=treble\nC3 C3 | C2 D E3 | E2 D E2 F | G6 | ccc GGG | EEE CCC | G2 F E2 D | C6 |]\n` +
      `V:2 clef=bass\nC,6 | C,6 | C,6 | C,6 | C,6 | C,6 | G,,6 | C,6 |]\n`,
  },
  {
    id: 'jingle',
    title: 'Jingle Bells (chorus)',
    composer: 'James Lord Pierpont',
    blurb: 'Repeated notes: keep them even.',
    tags: ['beginner', 'C major'],
    easy: H('Jingle Bells (chorus)', 'C:James Lord Pierpont\nM:4/4\nL:1/4\nQ:1/4=112\nK:C\n') +
      `V:1 clef=treble\nE E E2 | E E E2 | E G C3/2 D/ | E4 | F F F3/2 F/ | F E E E/E/ | E D D E | D2 G2 | E E E2 | E E E2 | E G C3/2 D/ | E4 | F F F F | F E E E/E/ | G G F D | C4 |]\n` +
      `V:2 clef=bass\nC,4 | C,4 | C,4 | C,4 | F,4 | C,4 | G,,4 | G,,4 | C,4 | C,4 | C,4 | C,4 | F,4 | C,4 | G,,4 | C,4 |]\n`,
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    composer: 'Traditional',
    blurb: 'Starts after the beat: count the rest.',
    tags: ['beginner', 'C major'],
    easy: H('When the Saints Go Marching In', 'C:Traditional\nM:4/4\nL:1/4\nQ:1/4=110\nK:C\n') +
      `V:1 clef=treble\nz C E F | G4 | z C E F | G4 | z C E F | G2 E2 | C2 E2 | D4 | z E E D | C3 C | E2 G2 | G F3 | z E F G | E2 C2 | D2 D2 | C4 |]\n` +
      `V:2 clef=bass\nC,4 | C,4 | C,4 | C,4 | C,4 | C,4 | C,4 | G,,4 | G,,4 | C,4 | C,4 | F,4 | C,4 | C,4 | G,,4 | C,4 |]\n`,
  },
  {
    id: 'amazing',
    title: 'Amazing Grace',
    composer: 'Traditional (New Britain)',
    blurb: '3/4 with a pickup note.',
    tags: ['beginner', 'C major', '3/4'],
    easy: H('Amazing Grace', 'C:Traditional\nM:3/4\nL:1/4\nQ:1/4=84\nK:C\n') +
      `V:1 clef=treble\nG, | C2 E/C/ | E2 D | C2 A, | G,2 G, | C2 E/C/ | E2 D/E/ | G3- | G2 E | G2 E/C/ | E2 D | C2 A, | G,2 G, | C2 E/C/ | E2 D | C3- | C2 |]\n` +
      `V:2 clef=bass\nz | C,3 | C,3 | F,3 | C,3 | C,3 | C,3 | G,,3 | G,,3 | C,3 | C,3 | F,3 | C,3 | C,3 | G,,3 | C,3 | C,2 |]\n`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Traditional (English)',
    blurb: 'A minor, with G sharps to watch.',
    tags: ['intermediate', 'A minor', '3/4'],
    easy: H('Greensleeves', 'C:Traditional\nM:3/4\nL:1/8\nQ:1/4=96\nK:Am\n') +
      `V:1 clef=treble\nA2 | c4 d2 | e3 f e2 | d4 B2 | G3 A B2 | c4 A2 | A3 ^G A2 | B4 ^G2 | E4 A2 | c4 d2 | e3 f e2 | d4 B2 | G3 A B2 | c3 B A2 | ^G3 ^F G2 | A6- | A4 |]\n` +
      `V:2 clef=bass\nz2 | A,,6 | C,6 | G,,6 | E,,6 | A,,6 | E,,6 | E,,6 | A,,6 | A,,6 | C,6 | G,,6 | E,,6 | A,,6 | E,,6 | A,,6 | A,,4 |]\n`,
  },
  {
    id: 'minuetG',
    title: 'Minuet in G',
    composer: 'Christian Petzold (attr.), BWV Anh. 114',
    blurb: 'From the Anna Magdalena Bach notebook.',
    tags: ['intermediate', 'G major', '3/4'],
    easy: H('Minuet in G', 'C:Christian Petzold (attr.)\nM:3/4\nL:1/8\nQ:1/4=100\nK:G\n') +
      `V:1 clef=treble\n!mf!!5!d2 !2!G A B c | d2 G2 G2 | e2 c d e f | g2 G2 G2 | c2 d c B A | B2 c B A G | F2 G A B G | A6 | d2 G A B c | d2 G2 G2 | e2 c d e f | g2 G2 G2 | c2 d c B A | B2 c B A G | A2 B A G F | G6 |]\n` +
      `V:2 clef=bass\nG,6 | B,6 | C6 | B,6 | A,6 | G,6 | D6 | D,6 | G,6 | B,6 | C6 | B,6 | A,6 | G,6 | D6 | G,,6 |]\n`,
    full: H('Minuet in G', 'C:Christian Petzold (attr.)\nM:3/4\nL:1/8\nQ:1/4=100\nK:G\n') +
      `V:1 clef=treble\n!mf!d2 G A B c | d2 G2 G2 | e2 c d e f | g2 G2 G2 | c2 d c B A | B2 c B A G | F2 G A B G | A6 | d2 G A B c | d2 G2 G2 | e2 c d e f | g2 G2 G2 | c2 d c B A | B2 c B A G | A2 B A G F | G6 |]\n` +
      `V:2 clef=bass\n[G,B,D]4 A,2 | B,6 | C6 | B,6 | A,6 | G,6 | D4 B,2 | D2 C2 B,A, | B,4 A,2 | G,2 B,2 G,2 | C6 | B,2 C B, A, G, | A,4 F,2 | G,4 B,2 | C2 D2 D,2 | G,4 G,,2 |]\n`,
  },
  {
    id: 'furElise',
    title: 'Für Elise (opening)',
    composer: 'Ludwig van Beethoven',
    blurb: 'The famous E–D♯ turn; hands alternate.',
    tags: ['intermediate', 'A minor', '3/8'],
    easy: H('Für Elise (opening)', 'C:Ludwig van Beethoven\nM:3/8\nL:1/16\nQ:3/8=40\nK:Am\n') +
      `V:1 clef=treble\n!pp!e^d | e^d e B =d c | A2 z C E A | B2 z E ^G B | c2 z E e^d | e^d e B =d c | A2 z C E A | B2 z E c B | A6 |]\n` +
      `V:2 clef=bass\nz2 | z6 | A,,E,A, z3 | E,,E,^G, z3 | A,,E,A, z3 | z6 | A,,E,A, z3 | E,,E,^G, z3 | [A,,E,A,]6 |]\n`,
  },
  {
    id: 'preludeC',
    title: 'Prelude in C, BWV 846 (opening)',
    composer: 'Johann Sebastian Bach',
    blurb: 'Broken chords from the Well-Tempered Clavier.',
    tags: ['intermediate', 'C major'],
    easy: H('Prelude in C (opening)', 'C:Johann Sebastian Bach\nM:4/4\nL:1/16\nQ:1/4=66\nK:C\n') +
      `V:1 clef=treble\n!p!z2 Gce Gce z2 Gce Gce | z2 Adf Adf z2 Adf Adf | z2 Gdf Gdf z2 Gdf Gdf | z2 Gce Gce z2 Gce Gce | z2 Aea Aea z2 Aea Aea | z2 ^FAd FAd z2 ^FAd FAd | z2 Gdg Gdg z2 Gdg Gdg | z2 EGc EGc z2 EGc EGc |]\n` +
      `V:2 clef=bass\nC2 E6 C2 E6 | C2 D6 C2 D6 | B,2 D6 B,2 D6 | C2 E6 C2 E6 | C2 E6 C2 E6 | C2 D6 C2 D6 | B,2 D6 B,2 D6 | B,2 C6 B,2 C6 |]\n`,
  },
  {
    id: 'gymnopedie',
    title: 'Gymnopédie No. 1 (opening)',
    composer: 'Erik Satie',
    blurb: 'Slow and calm; let the chords ring.',
    tags: ['intermediate', 'D major', '3/4'],
    easy: H('Gymnopédie No. 1 (opening)', 'C:Erik Satie\nM:3/4\nL:1/4\nQ:1/4=72\nK:D\n') +
      `V:1 clef=treble\nz3 | z3 | z3 | z3 | !p!z f a | g f c | B c d | A3 | F3- | F3 | z f a | g f c | B c d | A3 | c3 | e3 |]\n` +
      `V:2 clef=bass\nG,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 | G,, [B,DF]2 | D,, [A,CF]2 |]\n`,
  },
  {
    id: 'canon',
    title: 'Canon in D (theme)',
    composer: 'Johann Pachelbel',
    blurb: 'The ground bass with the first two melodies.',
    tags: ['intermediate', 'D major'],
    easy: H('Canon in D (theme)', 'C:Johann Pachelbel\nM:4/4\nL:1/2\nQ:1/4=72\nK:D\n') +
      `V:1 clef=treble\nz2 | z2 | z2 | z2 | f e | d c | B A | B c | d c | B A | G F | G E | f e | d c | B A | B c | d2 |]\n` +
      `V:2 clef=bass\nD, A,, | B,, F,, | G,, D,, | G,, A,, | D, A,, | B,, F,, | G,, D,, | G,, A,, | D, A,, | B,, F,, | G,, D,, | G,, A,, | D, A,, | B,, F,, | G,, D,, | G,, A,, | D,2 |]\n`,
  },
];

export function songById(id: string): BuiltInSong | undefined {
  return BUILT_IN_SONGS.find((s) => s.id === id);
}
