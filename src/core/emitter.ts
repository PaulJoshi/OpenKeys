/** Minimal typed event emitter (no DOM dependency). */
export class Emitter<T> {
  private listeners = new Set<(v: T) => void>();

  on(cb: (v: T) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(v: T): void {
    for (const cb of [...this.listeners]) cb(v);
  }

  clear(): void {
    this.listeners.clear();
  }

  get size(): number {
    return this.listeners.size;
  }
}
