import type { InputState } from './input.ts';

export interface Scene {
  enter?(): void;
  exit?(): void;
  update(dt: number, input: InputState): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
  /** When true, the scene below is rendered first (overlays such as a pause card). */
  readonly overlay?: boolean;
}

/** Scene stack: only the top scene updates; overlays render on top of the scene below. */
export class SceneStack {
  private stack: Scene[] = [];

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get size(): number {
    return this.stack.length;
  }

  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop(): Scene | undefined {
    const s = this.stack.pop();
    s?.exit?.();
    return s;
  }

  replace(scene: Scene): void {
    this.pop();
    this.push(scene);
  }

  update(dt: number, input: InputState): void {
    this.top?.update(dt, input);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    let from = this.stack.length - 1;
    while (from > 0 && this.stack[from]?.overlay) from--;
    for (let i = Math.max(0, from); i < this.stack.length; i++) this.stack[i]?.render(ctx, alpha);
  }
}
