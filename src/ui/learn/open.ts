import type { HandSelection, PracticeMode, Score } from '../../core/types';
import { useApp } from '../store';

/** Opens a score on the practice screen with a mode/hands preset (lessons, drills, reviews). */
export function openPractice(score: Score, preset: { mode?: PracticeMode; hands?: HandSelection; tempo?: number; anyPitch?: boolean } = {}, lessonId: string | null = null): void {
  const st = useApp.getState();
  st.set({ practicePreset: preset });
  st.setScore(score, lessonId);
  st.go('practice');
}
