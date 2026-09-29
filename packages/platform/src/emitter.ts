import type { PlatformEvent } from './types.ts';

export class Emitter {
  private subs = new Map<PlatformEvent, Set<() => void>>();

  on(event: PlatformEvent, cb: () => void): () => void {
    let set = this.subs.get(event);
    if (!set) this.subs.set(event, (set = new Set()));
    set.add(cb);
    return () => set.delete(cb);
  }

  emit(event: PlatformEvent): void {
    for (const cb of this.subs.get(event) ?? []) cb();
  }
}
