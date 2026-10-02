/**
 * Repeat unrolling: converts the written measure order (with repeat bars, voltas,
 * D.C./D.S./Coda/Fine) into linear performance order. Pure function over measure metadata,
 * shared by the MusicXML and ABC importers.
 */
export interface WrittenMeasureFlow {
  repeatForward?: boolean;
  /** Backward repeat at the end of this measure; total times the section is played (default 2). */
  repeatBackward?: number;
  /** Volta numbers this measure belongs to (e.g. [1] or [1, 2]). */
  endings?: number[];
  segno?: boolean;
  coda?: boolean;
  /** Jump to the coda (only after a D.C./D.S. jump). */
  toCoda?: boolean;
  /** Stop here (only after a D.C./D.S. jump). */
  fine?: boolean;
  /** At the end of this measure jump to the start. */
  daCapo?: boolean;
  /** At the end of this measure jump to the segno. */
  dalSegno?: boolean;
}

/** Returns the performance order as a list of written measure indices. */
export function unrollRepeats(measures: readonly WrittenMeasureFlow[]): number[] {
  const order: number[] = [];
  const n = measures.length;
  let i = 0;
  let repeatStart = 0;
  let pass = 1;
  let jumpedBack = false;
  let afterJump = false;
  const backCount = new Map<number, number>();
  let guard = 0;
  while (i < n && guard++ < 100000) {
    const m = measures[i];
    if (m.repeatForward && !jumpedBack) {
      repeatStart = i;
      pass = 1;
    }
    jumpedBack = false;

    if (m.endings && m.endings.length) {
      // After D.C./D.S. the last ending is played; otherwise the ending matching the pass.
      const wanted = afterJump ? lastEndingNumber(measures, i) : pass;
      if (!m.endings.includes(wanted)) {
        i++;
        continue;
      }
    }

    order.push(i);

    if (afterJump && m.fine) break;
    if (afterJump && m.toCoda) {
      const codaAt = findForward(measures, i + 1, (x) => !!x.coda);
      if (codaAt >= 0) {
        i = codaAt;
        continue;
      }
    }

    if (m.repeatBackward && !afterJump) {
      const times = m.repeatBackward;
      const done = backCount.get(i) ?? 1;
      if (done < times) {
        backCount.set(i, done + 1);
        i = repeatStart;
        pass++;
        jumpedBack = true;
        continue;
      }
    }

    if ((m.daCapo || m.dalSegno) && !afterJump) {
      afterJump = true;
      if (m.daCapo) i = 0;
      else {
        const s = measures.findIndex((x) => x.segno);
        i = s >= 0 ? s : 0;
      }
      jumpedBack = true;
      pass = 1;
      continue;
    }
    i++;
  }
  return order;
}

function findForward(ms: readonly WrittenMeasureFlow[], from: number, pred: (m: WrittenMeasureFlow) => boolean) {
  for (let k = from; k < ms.length; k++) if (pred(ms[k])) return k;
  return -1;
}

/** The highest volta number of the ending group that contains measure i. */
function lastEndingNumber(ms: readonly WrittenMeasureFlow[], i: number): number {
  let lo = i;
  while (lo > 0 && ms[lo - 1].endings?.length) lo--;
  let hi = i;
  while (hi < ms.length - 1 && ms[hi + 1].endings?.length) hi++;
  let max = 1;
  for (let k = lo; k <= hi; k++) for (const e of ms[k].endings ?? []) max = Math.max(max, e);
  return max;
}
