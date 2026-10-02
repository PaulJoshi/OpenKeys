import { useEffect, useState } from 'react';
import { useApp } from './store';

/** True when the effective theme is dark. */
export function useDark(): boolean {
  const theme = useApp((s) => s.settings.theme);
  const [sys, setSys] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setSys(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return theme === 'dark' || (theme === 'system' && sys);
}

export function useEmitter<T>(subscribe: (cb: (v: T) => void) => () => void, cb: (v: T) => void, deps: unknown[] = []) {
  useEffect(() => subscribe(cb), deps); // eslint-disable-line react-hooks/exhaustive-deps
}
