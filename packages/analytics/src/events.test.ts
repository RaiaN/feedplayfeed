import { describe, expect, it, vi } from 'vitest';
import { consoleSink, createAnalytics, memorySink } from './events.ts';

describe('analytics', () => {
  it('emits session_start, then typed events with time since start', () => {
    let t = 1000;
    const mem = memorySink();
    const a = createAnalytics({ sinks: [mem.sink], now: () => t });
    t = 1250;
    a.firstInput();
    a.firstInput();
    a.track('round_start', { seed: '2026-09-29' });
    t = 61250;
    a.track('round_end', { score: 420, duration_ms: 60000, seed: '2026-09-29' });
    a.track('share_click');
    expect(mem.events.map((e) => e.name)).toEqual([
      'session_start',
      'first_input',
      'round_start',
      'round_end',
      'share_click',
    ]);
    expect(mem.named('first_input')).toEqual([{ name: 'first_input', props: { ms: 250 }, t: 250 }]);
    expect(mem.named('round_end')[0]?.props.score).toBe(420);
  });

  it('isolates failing sinks and logs to console sink', () => {
    const log = vi.fn();
    const mem = memorySink();
    const a = createAnalytics({
      sinks: [
        () => {
          throw new Error('boom');
        },
        consoleSink(log),
        mem.sink,
      ],
      now: () => 0,
    });
    a.track('error', { message: 'x' });
    expect(mem.events).toHaveLength(2);
    expect(log).toHaveBeenCalledWith('[analytics]', 'error', { message: 'x' });
  });
});
