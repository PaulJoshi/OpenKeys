import { useEffect, useState } from 'react';
import { COURSE, lessonKey, type Lesson } from '../../core/learn/course';
import { getDb } from '../../core/progress/db';
import { parseAbc } from '../../core/score/abc';
import { hashId } from '../../core/score/ids';
import { builtInScore } from '../../core/progress/library';
import { songById } from '../../core/content/songs';
import { useApp } from '../store';
import { openPractice } from '../learn/open';
import { MiniKeyboard } from '../learn/MiniKeyboard';
import { Icon, Stars } from '../components/Icon';

export async function lessonStars(): Promise<Map<string, number>> {
  const rows = await getDb().lessons.toArray();
  return new Map(rows.map((r) => [r.lessonId, r.stars]));
}

/** Lesson complete = its piece at 2+ stars. Returns the index of the first lesson not complete. */
export function nextLessonIndex(stars: Map<string, number>): number {
  const i = COURSE.findIndex((l) => (stars.get(lessonKey(l.id, 'piece')) ?? 0) < 2);
  return i < 0 ? COURSE.length - 1 : i;
}

export function Course() {
  const [stars, setStars] = useState<Map<string, number>>(new Map());
  const [open, setOpen] = useState<Lesson | null>(null);
  useEffect(() => void lessonStars().then(setStars), [open]);
  const next = nextLessonIndex(stars);
  if (open) return <LessonView lesson={open} stars={stars} onBack={() => setOpen(null)} />;
  return (
    <div className="page">
      <h1>Course</h1>
      <p className="muted">Seven short lessons from your first notes to complete pieces. A lesson is done when you earn 2 stars on its piece. Nothing is locked: skip ahead whenever you like.</p>
      <div className="lesson-map">
        {COURSE.map((l, i) => {
          const s = stars.get(lessonKey(l.id, 'piece')) ?? 0;
          const done = s >= 2;
          return (
            <div key={l.id} className={`card lesson-node${done ? ' done' : ''}`} >
              <div className="num" aria-hidden="true">
                {done ? <Icon name="check" /> : l.number}
              </div>
              <div className="grow">
                <h3 style={{ margin: 0 }}>
                  {l.number}. {l.title} {i === next && <span className="pill">Next</span>}
                </h3>
                <div className="muted small">{l.summary}</div>
                <Stars earned={s} />
              </div>
              <button className={`btn ${i === next ? 'primary' : ''}`} onClick={() => setOpen(l)}>
                {done ? 'Review' : i === next ? 'Start' : 'Open'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LessonView({ lesson, stars, onBack }: { lesson: Lesson; stars: Map<string, number>; onBack: () => void }) {
  const [card, setCard] = useState(0);
  const set = useApp((s) => s.set);
  const c = lesson.cards[card];
  const song = songById(lesson.piece.songId)!;
  const st = (k: string) => stars.get(lessonKey(lesson.id, k)) ?? 0;
  const startExercise = (i: number) => {
    const ex = lesson.exercises[i];
    const score = { ...parseAbc(ex.abc, { id: hashId(ex.abc, `lesson-${ex.id}`) }), tags: ['lesson'] };
    openPractice(score, { mode: ex.mode, hands: ex.hands ?? 'R', tempo: ex.mode === 'playalong' ? 0.8 : 1 }, lessonKey(lesson.id, ex.id));
  };
  return (
    <div className="page">
      <button className="btn ghost" onClick={onBack}>
        ← All lessons
      </button>
      <h1>
        Lesson {lesson.number}: {lesson.title}
      </h1>
      <section className="card" style={{ marginBottom: 20 }} aria-live="polite">
        <div className="muted small">
          Card {card + 1} of {lesson.cards.length}
        </div>
        <h2>{c.title}</h2>
        {c.body.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }} />
        ))}
        {c.keys && <MiniKeyboard keys={c.keys} fingers={c.fingers} />}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={card === 0} onClick={() => setCard(card - 1)}>
            Previous
          </button>
          <button className="btn primary" disabled={card === lesson.cards.length - 1} onClick={() => setCard(card + 1)}>
            Next card
          </button>
          {lesson.calibration && (
            <button className="btn" onClick={() => set({ calibrationOpen: true })}>
              Set up my keyboard (calibration)
            </button>
          )}
        </div>
      </section>
      <h2>Exercises</h2>
      <div className="col" style={{ marginBottom: 20 }}>
        {lesson.exercises.map((ex, i) => (
          <div className="card row" key={ex.id}>
            <div className="grow">
              <b>{ex.title}</b>
              <div className="muted small">{ex.hint}</div>
            </div>
            <Stars earned={st(ex.id)} />
            <button className="btn primary" onClick={() => startExercise(i)}>
              Practise
            </button>
          </div>
        ))}
      </div>
      <h2>Piece</h2>
      <div className="card row">
        <div className="grow">
          <b>{song.title}</b> <span className="muted">· {song.composer}</span>
          <div className="muted small">{song.blurb} Earn 2 stars to complete the lesson.</div>
        </div>
        <Stars earned={st('piece')} />
        <button className="btn primary" onClick={() => openPractice(builtInScore(song, lesson.piece.variant), { mode: lesson.piece.mode, hands: lesson.piece.hands }, lessonKey(lesson.id, 'piece'))}>
          Play the piece
        </button>
      </div>
    </div>
  );
}
