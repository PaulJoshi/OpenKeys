import type { InputSource, NoteEvent } from '../types';

export type InputStatus = 'idle' | 'starting' | 'running' | 'error' | 'unsupported' | 'denied';

export interface InputPlugin {
  readonly source: InputSource;
  readonly status: InputStatus;
  /** Human-readable reason for error/unsupported/denied states. */
  readonly statusMessage?: string;
  start(): Promise<void>;
  stop(): void;
  onEvent(cb: (e: NoteEvent) => void): () => void;
  onStatus(cb: (s: InputStatus) => void): () => void;
}
