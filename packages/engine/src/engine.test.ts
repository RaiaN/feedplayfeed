import { describe, expect, it, vi } from 'vitest';
import { Input } from './input.ts';
import { SceneStack, type Scene } from './scene.ts';
import { createStrings } from './strings.ts';
import { ease, Tweens } from './tween.ts';

describe('Input', () => {
  it('latches press/release edges until endStep and fires first-press once', () => {
    const input = new Input();
    const first = vi.fn();
    input.onFirstPress(first);
    input.pointerDown(1, { x: 10, y: 20 });
    input.pointerUp(1);
    expect(input.pressed && input.released && !input.held).toBe(true);
    expect(input.taps).toEqual([{ x: 10, y: 20 }]);
    input.endStep();
    expect(input.pressed || input.released).toBe(false);
    input.keyDown('Space');
    expect(input.held).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('keeps holding while any pointer or key is down', () => {
    const input = new Input();
    input.pointerDown(1, { x: 0, y: 0 });
    input.keyDown('Enter');
    input.pointerUp(1);
    expect(input.held).toBe(true);
    input.keyUp('Enter');
    expect(input.held).toBe(false);
    expect(input.keyDown('KeyA')).toBe(false);
  });

  it('cancel releases everything', () => {
    const input = new Input();
    input.pointerDown(1, { x: 0, y: 0 });
    input.cancel();
    expect(input.held).toBe(false);
    expect(input.released).toBe(true);
  });
});

describe('SceneStack', () => {
  const scene = (log: string[], name: string, overlay = false): Scene => ({
    overlay,
    enter: () => log.push(`enter:${name}`),
    exit: () => log.push(`exit:${name}`),
    update: () => log.push(`update:${name}`),
    render: () => log.push(`render:${name}`),
  });

  it('updates only the top and renders overlays over the scene below', () => {
    const log: string[] = [];
    const s = new SceneStack();
    s.push(scene(log, 'a'));
    s.push(scene(log, 'b', true));
    log.length = 0;
    s.update(0.016, new Input());
    s.render({} as CanvasRenderingContext2D, 0);
    expect(log).toEqual(['update:b', 'render:a', 'render:b']);
    s.replace(scene(log, 'c'));
    expect(log.slice(-2)).toEqual(['exit:b', 'enter:c']);
  });
});

describe('Tweens', () => {
  it('eases from → to over the duration and calls onDone', () => {
    const tw = new Tweens();
    let v = 0;
    const done = vi.fn();
    tw.add({ from: 0, to: 10, duration: 1, onUpdate: (x) => (v = x), onDone: done });
    tw.update(0.5);
    expect(v).toBeCloseTo(5);
    tw.update(0.6);
    expect(v).toBe(10);
    expect(done).toHaveBeenCalledOnce();
    expect(tw.count).toBe(0);
  });

  it('jumps to the end when instant (reduced motion)', () => {
    const tw = new Tweens();
    tw.instant = true;
    let v = 0;
    tw.add({ from: 0, to: 3, duration: 1, ease: ease.outBack, onUpdate: (x) => (v = x) });
    expect(v).toBe(3);
  });

  it('easings hit 0 and 1 at the ends', () => {
    for (const fn of Object.values(ease)) {
      expect(fn(0)).toBeCloseTo(0);
      expect(fn(1)).toBeCloseTo(1);
    }
  });
});

describe('strings', () => {
  it('fills placeholders and returns the key when missing', () => {
    const s = createStrings({ score: 'Score {n}', hi: 'Hi' });
    expect(s.t('score', { n: 42 })).toBe('Score 42');
    expect(s.t('hi')).toBe('Hi');
    expect(s.t('nope')).toBe('nope');
  });
});
