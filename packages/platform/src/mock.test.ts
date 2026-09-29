import { expect, it } from 'vitest';
import { runAdapterContract } from './contract.ts';
import { createMockAdapter } from './mock.ts';

runAdapterContract('mock', ({ now, challenge }) => {
  const adapter = createMockAdapter({ now, challenge: challenge ?? null });
  return { adapter, triggerPause: () => adapter.emit('pause'), triggerResume: () => adapter.emit('resume') };
});

it('mock records calls as plain JSON', async () => {
  const a = createMockAdapter();
  await a.submitScore({ score: 5, seed: 's', durationMs: 1 });
  expect(a.callsTo('submitScore')).toEqual([{ method: 'submitScore', args: [{ score: 5, seed: 's', durationMs: 1 }] }]);
});
