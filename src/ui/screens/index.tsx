import type { ReactNode } from 'react';
import type { Screen } from '../store';
import { FreePlay } from './FreePlay';
import { Library } from './Library';
import { Editor } from './Editor';
import { PracticeScreen } from '../practice/PracticeScreen';
import { SettingsScreen } from './Settings';
import { Today } from './Today';
import { Course } from './Course';
import { Drills } from './Drills';
import { ProgressScreen } from './Progress';

export const SCREENS: Partial<Record<Screen, () => ReactNode>> = {
  today: () => <Today />,
  library: () => <Library />,
  practice: () => <PracticeScreen />,
  course: () => <Course />,
  drills: () => <Drills />,
  free: () => <FreePlay />,
  editor: () => <Editor />,
  progress: () => <ProgressScreen />,
  settings: () => <SettingsScreen />,
};
