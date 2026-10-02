import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { COURSE, lessonKey } from '../../core/learn/course';
import { lessonStars, nextLessonIndex } from './Course';
import { dueReviews } from '../../core/progress/progress';
import type { ReviewRecord } from '../../core/progress/db';
import { kvGet } from '../../core/progress/db';
import { loadScore } from '../../core/progress/library';
import { progressOverview } from '../../core/progress/stats';
import { Icon } from '../components/Icon';

export function Today() {
  const s = useApp((x) => x.settings);
  const go = useApp((x) => x.go);
  const set = useApp((x) => x.set);
  const setScore = useApp((x) => x.setScore);
  const update = useApp((x) => x.updateSettings);
  const [next, setNext] = useState<number | null>(null);
  const [nextStars, setNextStars] = useState(0);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [last, setLast] = useState<{ id: string; title: string } | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    void lessonStars().then((st) => {
      const i = nextLessonIndex(st);
      setNext(i);
      setNextStars(st.get(lessonKey(COURSE[i].id, 'piece')) ?? 0);
    });
    void dueReviews().then(setReviews);
    void kvGet<string>('lastPiece').then(async (id) => {
      if (!id) return;
      const sc = await loadScore(id);
      if (sc) setLast({ id, title: sc.title + (sc.variant ? ` (${sc.variant})` : '') });
    });
    void progressOverview(1).then((p) => {
      setMinutes(p.todayMinutes);
      setStreak(p.streak);
    });
  }, []);

  const practiseReview = async (r: ReviewRecord) => {
    const sc = await loadScore(r.scoreId);
    if (!sc) return;
    set({ pendingDrill: { start: r.startMeasure, end: r.endMeasure, tempo: r.tempoFactor, reviewId: r.id } });
    setScore(sc);
    go('practice');
  };

  const lesson = next !== null ? COURSE[next] : null;
  const goalPct = Math.min(1, minutes / Math.max(1, s.dailyGoalMin));

  return (
    <div className="page">
      <h1>Today</h1>
      {!s.onboarded && (
        <section style={{ marginBottom: 'var(--space-section)' }}>
          <h2 className="display">Learn piano. For free.</h2>
          <p>OpenKeys listens while you play and tells you what went well and what to fix. Everything runs on this device; nothing is uploaded.</p>
          <p>
            <b>First, how will you play?</b> With a keyboard nearby, the microphone works right away. A USB cable (MIDI) is the most accurate. No instrument? Use the computer keys.
          </p>
          <div className="row">
            <button
              className="btn primary big"
              onClick={() => {
                update({ inputSource: 'mic' });
                set({ calibrationOpen: true });
              }}
            >
              <Icon name="mic" /> Microphone
            </button>
            <button
              className="btn big"
              onClick={() => {
                update({ inputSource: 'midi' });
                set({ calibrationOpen: true });
              }}
            >
              <Icon name="piano" /> USB / MIDI
            </button>
            <button
              className="btn big"
              onClick={() => {
                update({ inputSource: 'virtual', onboarded: true });
                go('course');
              }}
            >
              <Icon name="keyboard" /> No instrument
            </button>
          </div>
        </section>
      )}
      <div className="grid" style={{ marginBottom: 20 }}>
        <section className="card">
          <h3>Daily goal</h3>
          <div className="big-number">
            {Math.round(minutes)} / {s.dailyGoalMin} min
          </div>
          <div className="progress" style={{ margin: '10px 0' }} aria-label="Daily goal progress">
            <div style={{ width: `${goalPct * 100}%`, background: goalPct >= 1 ? 'var(--good)' : undefined }} />
          </div>
          <div className="muted">{streak > 0 ? `${streak}-day streak` : 'Start a streak today'}</div>
        </section>
        {lesson && (
          <section className="card">
            <h3>Next lesson</h3>
            <div style={{ fontWeight: 500, fontSize: 'var(--type-heading-lg-size)', lineHeight: 'var(--type-heading-lg-lh)' }}>
              {lesson.number}. {lesson.title}
            </div>
            <div className="muted small" style={{ marginBottom: 10 }}>
              {lesson.summary} {nextStars > 0 && `· ${nextStars} of 3 stars so far`}
            </div>
            <button className="btn primary" onClick={() => go('course')}>
              Continue the course
            </button>
          </section>
        )}
        {last && (
          <section className="card">
            <h3>Continue</h3>
            <div style={{ fontWeight: 500 }}>{last.title}</div>
            <button
              className="btn"
              style={{ marginTop: 10 }}
              onClick={async () => {
                const sc = await loadScore(last.id);
                if (sc) {
                  setScore(sc);
                  go('practice');
                }
              }}
            >
              Pick up where you left off
            </button>
          </section>
        )}
      </div>
      <section className="card">
        <h3>Review ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing due. Trouble spots from your takes appear here on a spaced-repetition schedule.
          </p>
        ) : (
          <div className="col">
            {reviews.slice(0, 6).map((r) => (
              <div className="row" key={r.id}>
                <span className="grow">
                  <b>{r.scoreTitle}</b> · bar{r.startMeasure === r.endMeasure ? ` ${r.startMeasure + 1}` : `s ${r.startMeasure + 1}–${r.endMeasure + 1}`}{' '}
                  <span className="muted small">at {Math.round(r.tempoFactor * 100)}%</span>
                </span>
                <button className="btn small primary" onClick={() => void practiseReview(r)}>
                  Practise
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
