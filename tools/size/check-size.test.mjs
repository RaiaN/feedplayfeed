import { describe, expect, it } from 'vitest';
import { initialScripts } from './check-size.mjs';

describe('initialScripts', () => {
  it('collects module scripts and modulepreloads, skipping external URLs', () => {
    const html = `<script type="module" crossorigin src="/assets/index-a1.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-b2.js">
      <script src="https://example.invalid/sdk.js"></script>`;
    expect(initialScripts(html)).toEqual(['/assets/index-a1.js', '/assets/vendor-b2.js']);
  });
});
