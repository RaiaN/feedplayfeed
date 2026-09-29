// Unified one-thumb input: pointer, touch and keyboard (Space/Enter) all map to one "thumb".
// Edge flags (pressed/released) latch until a simulation step consumes them via endStep().

export interface Point {
  x: number;
  y: number;
}

export interface InputState {
  /** Thumb is down right now. */
  readonly held: boolean;
  /** Went down since the last step. */
  readonly pressed: boolean;
  /** Went up since the last step. */
  readonly released: boolean;
  /** Last pointer position in logical coordinates (keyboard keeps the previous one). */
  readonly pos: Point;
  /** Pointer-down positions since the last step, for UI hit tests. Keyboard presses are not included. */
  readonly taps: readonly Point[];
}

export class Input implements InputState {
  held = false;
  pressed = false;
  released = false;
  pos: Point = { x: 0, y: 0 };
  taps: Point[] = [];
  private keysDown = new Set<string>();
  private pointersDown = new Set<number>();
  private listeners: Array<() => void> = [];

  /** Called once on the very first press of any kind (used for first_input + audio unlock). */
  onFirstPress(cb: () => void): void {
    this.listeners.push(cb);
  }

  pointerDown(id: number, p: Point): void {
    this.pointersDown.add(id);
    this.pos = p;
    this.taps.push(p);
    this.press();
  }

  pointerMove(p: Point): void {
    this.pos = p;
  }

  pointerUp(id: number): void {
    this.pointersDown.delete(id);
    this.maybeRelease();
  }

  keyDown(code: string): boolean {
    if (code !== 'Space' && code !== 'Enter') return false;
    if (!this.keysDown.has(code)) {
      this.keysDown.add(code);
      this.press();
    }
    return true;
  }

  keyUp(code: string): boolean {
    if (!this.keysDown.delete(code)) return false;
    this.maybeRelease();
    return true;
  }

  /** Drop all held state (window blur, visibility hidden). */
  cancel(): void {
    this.pointersDown.clear();
    this.keysDown.clear();
    this.maybeRelease();
  }

  /** Clear edge flags; call after each fixed simulation step. */
  endStep(): void {
    this.pressed = false;
    this.released = false;
    this.taps = [];
  }

  private press(): void {
    if (!this.held) {
      this.held = true;
      this.pressed = true;
    }
    const first = this.listeners;
    this.listeners = [];
    for (const cb of first) cb();
  }

  private maybeRelease(): void {
    if (this.held && this.pointersDown.size === 0 && this.keysDown.size === 0) {
      this.held = false;
      this.released = true;
    }
  }
}
