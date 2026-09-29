// The engine's only DOM module (enforced by eslint no-restricted-globals). Everything browser-specific lives here:
// canvas + DPR, 9:16 fit and resize, pointer/touch/keyboard wiring, rAF, visibility, AudioContext, media queries.
import type { AudioContextFactory } from './audio.ts';
import type { Input } from './input.ts';

export interface HostOptions {
  /** Element to mount into. Defaults to document.body. */
  parent?: HTMLElement;
  /** Logical design size; the canvas is scaled to fit while keeping this aspect (default 360×640 = 9:16). */
  width?: number;
  height?: number;
  /** Cap for devicePixelRatio (memory/fill-rate on high-DPR phones). */
  maxDpr?: number;
}

export interface Host {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Logical size. */
  readonly width: number;
  readonly height: number;
  /** CSS pixels per logical unit (for checking the ≥16 px text rule). */
  readonly scale: number;
  bindInput(input: Input): void;
  /** Start a requestAnimationFrame loop. Returns a stop function. */
  onFrame(cb: (nowMs: number) => void): () => void;
  onVisibility(cb: (hidden: boolean) => void): void;
  onError(cb: (message: string) => void): void;
  readonly audioContext: AudioContextFactory;
  prefersReducedMotion(): boolean;
  /** Query-string parameters of the page. */
  params(): URLSearchParams;
  now(): number;
  /** Reset the transform to logical units and clear. Call at the start of each render. */
  beginFrame(background: string): void;
  /** Expose a value on window for tests and tools (only call when a test flag is set). */
  expose(name: string, value: unknown): void;
}

export function createHost(opts: HostOptions = {}): Host {
  const width = opts.width ?? 360;
  const height = opts.height ?? 640;
  const maxDpr = opts.maxDpr ?? 3;
  const parent = opts.parent ?? document.body;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'display:block;position:absolute;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;';
  canvas.setAttribute('role', 'application');
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is not available');

  let scale = 1;
  let dpr = 1;

  const fit = (): void => {
    const vw = parent === document.body ? window.innerWidth : parent.clientWidth;
    const vh = parent === document.body ? window.innerHeight : parent.clientHeight;
    scale = Math.min(vw / width, vh / height);
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const cssW = Math.floor(width * scale);
    const cssH = Math.floor(height * scale);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${Math.floor((vw - cssW) / 2)}px`;
    canvas.style.top = `${Math.floor((vh - cssH) / 2)}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  };
  fit();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);

  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
  };

  return {
    canvas,
    ctx,
    width,
    height,
    get scale() {
      return scale;
    },
    bindInput(input) {
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture?.(e.pointerId);
        input.pointerDown(e.pointerId, toLogical(e));
      });
      canvas.addEventListener('pointermove', (e) => input.pointerMove(toLogical(e)));
      const up = (e: PointerEvent): void => input.pointerUp(e.pointerId);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', (e) => {
        if (!e.repeat && input.keyDown(e.code)) e.preventDefault();
        else if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
      });
      window.addEventListener('keyup', (e) => {
        if (input.keyUp(e.code)) e.preventDefault();
      });
      window.addEventListener('blur', () => input.cancel());
    },
    onFrame(cb) {
      let id = 0;
      let running = true;
      const tick = (t: number): void => {
        if (!running) return;
        cb(t);
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(id);
      };
    },
    onVisibility(cb) {
      document.addEventListener('visibilitychange', () => cb(document.hidden));
    },
    onError(cb) {
      window.addEventListener('error', (e) => cb(String(e.message || 'error')));
      window.addEventListener('unhandledrejection', (e) => cb(String((e.reason as Error)?.message ?? e.reason)));
    },
    audioContext: () => {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      try {
        return Ctor ? new Ctor() : null;
      } catch {
        return null;
      }
    },
    prefersReducedMotion: () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    params: () => new URLSearchParams(window.location.search),
    now: () => performance.now(),
    beginFrame(background) {
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    },
    expose(name, value) {
      (window as unknown as Record<string, unknown>)[name] = value;
    },
  };
}
