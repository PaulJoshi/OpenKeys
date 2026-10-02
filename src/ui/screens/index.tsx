import type { ReactNode } from 'react';
import type { Screen } from '../store';
import { FreePlay } from './FreePlay';

export const SCREENS: Partial<Record<Screen, () => ReactNode>> = {
  free: () => <FreePlay />,
  today: () => <FreePlay />,
};
