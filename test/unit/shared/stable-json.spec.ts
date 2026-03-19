import assert from 'node:assert';
import { describe, it } from 'node:test';

import { stableStringify } from '../../../src/shared/util/stable-json';

describe('stableStringify', () => {
  it('sorts object keys deterministically', () => {
    const first = stableStringify({ b: 2, a: 1 });
    const second = stableStringify({ a: 1, b: 2 });

    assert.equal(first, second);
  });
});
